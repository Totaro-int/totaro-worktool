'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { TASK_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus } from '@/lib/types'

import type { SupabaseClient, User } from '@supabase/supabase-js'

/** 인증된 Supabase 클라이언트를 돌려준다. 미인증이면 로그인 화면으로 보낸다. */
async function authed(): Promise<{ supabase: SupabaseClient; user: User }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=auth')
  return { supabase, user }
}

/** 새 WEB-taro 할 일을 만든다. */
export async function createWebTaroTask(formData: FormData): Promise<void> {
  const { supabase, user } = await authed()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  const description = String(formData.get('description') ?? '').trim() || null
  const dueDate = String(formData.get('due_date') ?? '') || null

  const { error } = await supabase.from('web_taro_tasks').insert({
    title,
    description,
    due_date: dueDate,
    status: 'todo',
    created_by: user.id,
  })
  if (error) throw new Error(`할 일 추가 실패: ${error.message}`)

  revalidatePath('/web-taro')
  revalidatePath('/hub')
}

/** WEB-taro 할 일의 진행 상태를 바꾼다. */
export async function updateWebTaroTaskStatus(formData: FormData): Promise<void> {
  const { supabase } = await authed()

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as TaskStatus
  if (!id || !TASK_STATUSES.includes(status)) return

  const { error } = await supabase.from('web_taro_tasks').update({ status }).eq('id', id)
  if (error) throw new Error(`할 일 상태 변경 실패: ${error.message}`)

  revalidatePath('/web-taro')
  revalidatePath('/hub')
}

/** WEB-taro 할 일을 삭제한다. */
export async function deleteWebTaroTask(formData: FormData): Promise<void> {
  const { supabase } = await authed()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('web_taro_tasks').delete().eq('id', id)
  if (error) throw new Error(`할 일 삭제 실패: ${error.message}`)

  revalidatePath('/web-taro')
  revalidatePath('/hub')
}
