'use server'

import { revalidatePath } from 'next/cache'

import { extractContactFromCard } from '@/lib/contacts/extract'
import { createGoogleContact, deleteGoogleContact } from '@/lib/google/contacts'
import { disconnect, getConnection } from '@/lib/google/oauth'
import { getServiceSupabase } from '@/lib/oauth/utils'
import { createClient } from '@/lib/supabase/server'

const BUCKET = 'business-cards'

/** business-cards 버킷 보장 — 없으면 service_role 로 생성. 멱등. */
async function ensureBucket(): Promise<void> {
  try {
    const admin = getServiceSupabase()
    const { data: list } = await admin.storage.listBuckets()
    if (list?.some((b) => b.name === BUCKET)) return
    await admin.storage.createBucket(BUCKET, { public: false, fileSizeLimit: 10 * 1024 * 1024 })
  } catch {
    // 이미 있거나 권한 X — 사용자가 Dashboard 에서 직접 만든 경우
  }
}

export type ContactRow = {
  id: string
  name: string
  company: string | null
  title: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  website: string | null
  address: string | null
  memo: string | null
  card_storage_path: string | null
  cardSignedUrl: string | null
  extraction_confidence: number | null
  extracted_by_ai: boolean | null
  created_at: string
}

export type ExtractResult = {
  ok: boolean
  contact?: ContactRow
  error?: string
}

/** 명함 이미지 업로드 → Gemini Vision OCR → 연락처 행 생성. */
export async function uploadAndExtractCard(formData: FormData): Promise<ExtractResult> {
  const file = formData.get('card')
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: '명함 이미지 파일이 없습니다.' }
  }
  if (!file.type.startsWith('image/')) {
    return { ok: false, error: '이미지 파일만 가능합니다 (jpg/png/heic 등).' }
  }
  if (file.size > 8 * 1024 * 1024) {
    return { ok: false, error: '8MB 이하로 업로드해주세요.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인 필요' }

  // 버킷 자동 보장 (첫 실행 시) — 서비스 키로
  await ensureBucket()

  const buffer = Buffer.from(await file.arrayBuffer())

  // 1) Gemini Vision OCR
  const extracted = await extractContactFromCard(buffer, file.type)
  if (!extracted || extracted.confidence === 0) {
    return { ok: false, error: '명함 인식 실패 — 더 선명한 사진으로 다시.' }
  }

  // 2) Storage 에 명함 이미지 업로드 (서비스 키 — RLS 우회, 사용자 인증은 위에서 이미 확인)
  const admin = getServiceSupabase()
  const ext = file.name.split('.').pop() ?? 'jpg'
  const storagePath = `${user.id}/${crypto.randomUUID()}.${ext}`
  const { error: upErr } = await admin.storage.from(BUCKET).upload(storagePath, buffer, {
    contentType: file.type,
    upsert: false,
  })
  if (upErr) return { ok: false, error: `이미지 저장 실패: ${upErr.message}` }

  // 3) DB insert
  const { data: inserted, error: insErr } = await supabase
    .from('contacts')
    .insert({
      name: extracted.name,
      company: extracted.company,
      title: extracted.title,
      phone: extracted.phone,
      mobile: extracted.mobile,
      email: extracted.email,
      website: extracted.website,
      address: extracted.address,
      memo: extracted.memo,
      card_storage_path: storagePath,
      extracted_by_ai: true,
      extraction_confidence: extracted.confidence,
      extraction_raw: extracted.raw,
      created_by: user.id,
    })
    .select('*')
    .single()
  if (insErr || !inserted) {
    await admin.storage.from(BUCKET).remove([storagePath])
    return { ok: false, error: `저장 실패: ${insErr?.message ?? 'unknown'}` }
  }

  const { data: signed } = await admin.storage.from(BUCKET).createSignedUrl(storagePath, 3600)

  // 4) Google 연락처에도 push (연결돼있으면). await — Vercel serverless 가 응답 후
  // 즉시 종료해서 fire-and-forget promise 가 완료 안 됨. 동기 처리해야 push 실제 실행됨.
  const insertedRow = inserted as Omit<ContactRow, 'cardSignedUrl'>
  try {
    await pushToGoogle(user.id, insertedRow)
  } catch {
    // 실패해도 contact 자체는 살림.
  }

  revalidatePath('/contacts')
  return {
    ok: true,
    contact: {
      ...insertedRow,
      cardSignedUrl: signed?.signedUrl ?? null,
    },
  }
}

/** Google 연락처로 push — 성공 시 resource_name, 실패 시 sync_error 저장. */
async function pushToGoogle(userId: string, c: Omit<ContactRow, 'cardSignedUrl'>): Promise<void> {
  const admin = getServiceSupabase()
  const result = await createGoogleContact(userId, {
    name: c.name,
    company: c.company,
    title: c.title,
    phone: c.phone,
    mobile: c.mobile,
    email: c.email,
    website: c.website,
    address: c.address,
    memo: c.memo,
  })
  if ('error' in result) {
    await admin
      .from('contacts')
      .update({ google_sync_error: result.error.slice(0, 200) })
      .eq('id', c.id)
    return
  }
  await admin
    .from('contacts')
    .update({
      google_resource_name: result.resourceName,
      google_synced_at: new Date().toISOString(),
      google_sync_error: null,
    })
    .eq('id', c.id)
}

/** Google 연결 상태 — UI 가 호출. */
export async function getGoogleConnection(): Promise<{
  connected: boolean
  email: string | null
}> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { connected: false, email: null }
  return getConnection(user.id)
}

/** Google 연결 해제 — 토큰 행 삭제. (Google 측 revoke 는 별도 — 사용자가 google.com 에서) */
export async function disconnectGoogle(): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await disconnect(user.id)
  revalidatePath('/contacts')
  return { ok: true }
}

export async function loadContacts(): Promise<ContactRow[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('contacts')
    .select(
      'id, name, company, title, phone, mobile, email, website, address, memo, card_storage_path, extraction_confidence, extracted_by_ai, created_at'
    )
    .order('created_at', { ascending: false })
    .limit(500)
  const rows = (data ?? []) as Omit<ContactRow, 'cardSignedUrl'>[]
  // 명함 이미지 signed URL — 서비스 키로 (스토리지 RLS 우회)
  const admin = getServiceSupabase()
  const withUrls = await Promise.all(
    rows.map(async (r) => {
      let cardSignedUrl: string | null = null
      if (r.card_storage_path) {
        const { data: signed } = await admin.storage
          .from(BUCKET)
          .createSignedUrl(r.card_storage_path, 3600)
        cardSignedUrl = signed?.signedUrl ?? null
      }
      return { ...r, cardSignedUrl }
    })
  )
  return withUrls
}

export async function deleteContact(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  const { data: existing } = await supabase
    .from('contacts')
    .select('card_storage_path, google_resource_name')
    .eq('id', id)
    .maybeSingle<{ card_storage_path: string | null; google_resource_name: string | null }>()
  if (existing?.card_storage_path) {
    const admin = getServiceSupabase()
    await admin.storage.from(BUCKET).remove([existing.card_storage_path])
  }
  // Google 연락처도 같이 삭제 (있으면). await — Vercel serverless fire-and-forget 안 작동.
  if (existing?.google_resource_name && user) {
    try {
      await deleteGoogleContact(user.id, existing.google_resource_name)
    } catch {
      // 캘린더 삭제 실패해도 contact 자체는 이미 지움.
    }
  }
  await supabase.from('contacts').delete().eq('id', id)
  revalidatePath('/contacts')
  return { ok: true }
}

export async function updateContact(
  id: string,
  patch: Partial<
    Pick<
      ContactRow,
      'name' | 'company' | 'title' | 'phone' | 'mobile' | 'email' | 'website' | 'address' | 'memo'
    >
  >
): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  await supabase.from('contacts').update(patch).eq('id', id)
  revalidatePath('/contacts')
  return { ok: true }
}
