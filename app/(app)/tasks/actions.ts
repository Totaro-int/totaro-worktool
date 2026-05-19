'use server'

import { revalidatePath } from 'next/cache'

import { TASK_STATUSES } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { Task, TaskStatus } from '@/lib/types'

/** 새 할 일을 만든다. */
export async function createTask(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  await supabase.from('tasks').insert({
    title,
    description: String(formData.get('description') ?? '').trim() || null,
    work_area_id: String(formData.get('work_area_id') ?? '') || null,
    assignee_id: String(formData.get('assignee_id') ?? '') || null,
    due_date: String(formData.get('due_date') ?? '') || null,
    status: 'todo',
    created_by: user.id,
  })

  revalidatePath('/tasks')
}

/** 할 일의 진행 상태를 바꾼다. 완료로 옮기면 활동 피드에 기록한다. */
export async function updateTaskStatus(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const id = String(formData.get('id') ?? '')
  const status = String(formData.get('status') ?? '') as TaskStatus
  if (!id || !TASK_STATUSES.includes(status)) return

  const { data: task } = await supabase.from('tasks').select('*').eq('id', id).single<Task>()
  if (!task) return

  await supabase.from('tasks').update({ status }).eq('id', id)

  if (status === 'done' && task.status !== 'done') {
    await supabase.from('activities').insert({
      member_id: task.assignee_id ?? user.id,
      work_area_id: task.work_area_id,
      source: 'task',
      title: task.title,
      description: task.description,
    })
    revalidatePath('/dashboard')
  }

  revalidatePath('/tasks')
  revalidatePath('/hub/github')
  revalidatePath('/hub/naver')
  revalidatePath('/hub/agent')
}

/** 할 일을 삭제한다. */
export async function deleteTask(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const id = String(formData.get('id') ?? '')
  if (!id) return

  await supabase.from('tasks').delete().eq('id', id)
  revalidatePath('/tasks')
}
