'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/** 문서를 업로드하고 활동 피드에도 기록한다. */
export async function uploadDocument(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const file = formData.get('file')
  if (!(file instanceof File) || file.size === 0) return

  const workAreaId = String(formData.get('work_area_id') ?? '') || null
  const description = String(formData.get('description') ?? '').trim() || null
  const storagePath = crypto.randomUUID()

  const { error: uploadError } = await supabase.storage
    .from('documents')
    .upload(storagePath, file, {
      contentType: file.type || 'application/octet-stream',
      upsert: false,
    })
  if (uploadError) throw uploadError

  const { error: insertError } = await supabase.from('documents').insert({
    name: file.name,
    storage_path: storagePath,
    work_area_id: workAreaId,
    description,
    file_size: file.size,
    mime_type: file.type || null,
    uploaded_by: user.id,
  })
  if (insertError) {
    // 메타데이터 저장 실패 시 업로드한 파일을 되돌린다.
    await supabase.storage.from('documents').remove([storagePath])
    throw insertError
  }

  await supabase.from('activities').insert({
    member_id: user.id,
    work_area_id: workAreaId,
    source: 'document',
    title: `문서 업로드: ${file.name}`,
    description,
  })

  revalidatePath('/documents')
  revalidatePath('/dashboard')
}

/** 문서를 스토리지와 DB 양쪽에서 삭제한다. */
export async function deleteDocument(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { data: doc } = await supabase
    .from('documents')
    .select('storage_path')
    .eq('id', id)
    .single<{ storage_path: string }>()

  if (doc) {
    await supabase.storage.from('documents').remove([doc.storage_path])
  }
  await supabase.from('documents').delete().eq('id', id)

  revalidatePath('/documents')
}
