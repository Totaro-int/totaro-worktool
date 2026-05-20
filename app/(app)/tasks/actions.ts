'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { TASK_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Task, TaskStatus } from '@/lib/types'

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

/** 할 일이 보이는 모든 보드를 다시 검증한다. */
function revalidateBoards(): void {
  revalidatePath('/tasks')
  revalidatePath('/dashboard')
  revalidatePath('/hub/github')
  revalidatePath('/hub/naver')
  revalidatePath('/hub/agent')
}

/** 새 할 일을 만든다. */
export async function createTask(formData: FormData): Promise<void> {
  const { supabase, user } = await authed()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  const { error } = await supabase.from('tasks').insert({
    title,
    description: String(formData.get('description') ?? '').trim() || null,
    work_area_id: String(formData.get('work_area_id') ?? '') || null,
    assignee_id: String(formData.get('assignee_id') ?? '') || null,
    due_date: String(formData.get('due_date') ?? '') || null,
    status: 'todo',
    created_by: user.id,
  })
  if (error) throw new Error(`할 일 추가 실패: ${error.message}`)

  revalidateBoards()
}

/** 할 일의 진행 상태를 바꾼다. 완료로 옮기면 활동 피드에도 기록한다. */
export async function updateTaskStatus(formData: FormData): Promise<void> {
  const { supabase, user } = await authed()

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as TaskStatus
  if (!id || !TASK_STATUSES.includes(status)) return

  // 활동 피드용으로 이전 상태/메타를 미리 본다(실패해도 update 는 진행).
  const { data: task } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle<Task>()

  const { error: updateError } = await supabase.from('tasks').update({ status }).eq('id', id)
  if (updateError) throw new Error(`할 일 상태 변경 실패: ${updateError.message}`)

  if (task && status === 'done' && task.status !== 'done') {
    await supabase.from('activities').insert({
      member_id: task.assignee_id ?? user.id,
      work_area_id: task.work_area_id,
      source: 'task',
      title: task.title,
      description: task.description,
    })
  }

  revalidateBoards()
}

/** 할 일을 삭제한다. */
export async function deleteTask(formData: FormData): Promise<void> {
  const { supabase } = await authed()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(`할 일 삭제 실패: ${error.message}`)

  revalidateBoards()
}
