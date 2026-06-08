'use server'

import { revalidatePath } from 'next/cache'

import { extractContactFromCard } from '@/lib/contacts/extract'
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

  revalidatePath('/contacts')
  return {
    ok: true,
    contact: {
      ...(inserted as Omit<ContactRow, 'cardSignedUrl'>),
      cardSignedUrl: signed?.signedUrl ?? null,
    },
  }
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
  const { data: existing } = await supabase
    .from('contacts')
    .select('card_storage_path')
    .eq('id', id)
    .maybeSingle<{ card_storage_path: string | null }>()
  if (existing?.card_storage_path) {
    const admin = getServiceSupabase()
    await admin.storage.from(BUCKET).remove([existing.card_storage_path])
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
