'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/** 활동 피드에 업무를 직접 기록한다. */
export async function logActivity(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  const description = String(formData.get('description') ?? '').trim()
  const workAreaId = String(formData.get('work_area_id') ?? '')
  const occurredRaw = String(formData.get('occurred_at') ?? '')

  await supabase.from('activities').insert({
    member_id: user.id,
    work_area_id: workAreaId || null,
    source: 'manual',
    title,
    description: description || null,
    occurred_at: occurredRaw ? new Date(occurredRaw).toISOString() : new Date().toISOString(),
  })

  revalidatePath('/dashboard')
}
