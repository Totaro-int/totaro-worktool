'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { TASK_STATUSES } from '@/lib/constants'
import { createCalendarEvent, deleteCalendarEvent } from '@/lib/google/calendar'
import { getServiceSupabase } from '@/lib/oauth/utils'
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
  revalidatePath('/calendar')
  revalidatePath('/dashboard')
  revalidatePath('/hub/github')
  revalidatePath('/hub/naver')
  revalidatePath('/hub/agent')
}

/** 새 할 일을 만든다. due_date 있고 본인이 Google 연결돼있으면 캘린더에도 자동 등록. */
export async function createTask(formData: FormData): Promise<void> {
  const { supabase, user } = await authed()

  const title = String(formData.get('title') ?? '').trim()
  if (!title) return

  const description = String(formData.get('description') ?? '').trim() || null
  const dueDate = String(formData.get('due_date') ?? '') || null
  // start_date 는 마감보다 앞일 때만 멀티데이로 인정(아니면 하루짜리).
  const startRaw = String(formData.get('start_date') ?? '') || null
  const startDate = startRaw && dueDate && startRaw < dueDate ? startRaw : null

  const { data: inserted, error } = await supabase
    .from('tasks')
    .insert({
      title,
      description,
      work_area_id: String(formData.get('work_area_id') ?? '') || null,
      assignee_id: String(formData.get('assignee_id') ?? '') || null,
      start_date: startDate,
      due_date: dueDate,
      status: 'todo',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (error) throw new Error(`할 일 추가 실패: ${error.message}`)

  // 마감일 있으면 캘린더 push. await 으로 (Vercel serverless 가 응답 후 종료 →
  // fire-and-forget 은 lambda 가 promise 끝까지 안 기다림 → push 실행 X). 살짝 느려지지만 정확.
  if (inserted?.id && dueDate) {
    try {
      await pushTaskToCalendar(user.id, inserted.id, {
        title,
        description,
        start_date: startDate,
        due_date: dueDate,
      })
    } catch {
      // 캘린더 실패해도 task 는 살림. sync_error 는 pushTaskToCalendar 내부에서 저장.
    }
  }

  revalidateBoards()
}

/** task → Google Calendar push. 성공 시 google_event_id 저장(+true), 실패/skip 시 false. */
async function pushTaskToCalendar(
  userId: string,
  taskId: string,
  t: { title: string; description: string | null; start_date: string | null; due_date: string }
): Promise<boolean> {
  const admin = getServiceSupabase()
  const result = await createCalendarEvent(userId, t)
  if ('skipped' in result) return false
  if ('error' in result) {
    await admin
      .from('tasks')
      .update({ google_sync_error: result.error.slice(0, 200) })
      .eq('id', taskId)
    return false
  }
  await admin
    .from('tasks')
    .update({
      google_event_id: result.eventId,
      google_synced_at: new Date().toISOString(),
      google_sync_error: null,
    })
    .eq('id', taskId)
  return true
}

/**
 * 본인에게 배정된 '마감일 있고 아직 캘린더에 안 올라간' 할 일을 모두 Google Calendar 에 push.
 * MCP·일괄 등록 등 UI 밖에서 만든 할 일은 자동 동기화를 안 타므로, 이 버튼으로 한 번에 올린다.
 * 멱등 — google_event_id 가 이미 있으면 대상에서 제외(중복 방지).
 */
export async function syncMyTasksToCalendar(): Promise<void> {
  const { supabase, user } = await authed()

  const { data } = await supabase
    .from('tasks')
    .select('id, title, description, start_date, due_date, google_event_id')
    .eq('assignee_id', user.id)
    .not('due_date', 'is', null)
    .is('google_event_id', null)
    .order('due_date')
  const list = (data ?? []) as Array<{
    id: string
    title: string
    description: string | null
    start_date: string | null
    due_date: string
  }>

  let synced = 0
  for (const t of list) {
    try {
      const ok = await pushTaskToCalendar(user.id, t.id, {
        title: t.title,
        description: t.description,
        start_date: t.start_date,
        due_date: t.due_date,
      })
      if (ok) synced += 1
    } catch {
      // 한 건 실패해도 나머지 계속. 에러는 pushTaskToCalendar 가 google_sync_error 로 저장.
    }
  }

  revalidateBoards()
  redirect(`/tasks?cal_synced=${synced}&cal_total=${list.length}`)
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

/** 할 일을 삭제한다. 캘린더 이벤트 있으면 같이 삭제. */
export async function deleteTask(formData: FormData): Promise<void> {
  const { supabase, user } = await authed()

  const id = String(formData.get('id') ?? '')
  if (!id) return

  // 삭제 전 google_event_id 확인 (있어야 캘린더 삭제 가능)
  const { data: existing } = await supabase
    .from('tasks')
    .select('google_event_id')
    .eq('id', id)
    .maybeSingle<{ google_event_id: string | null }>()

  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw new Error(`할 일 삭제 실패: ${error.message}`)

  if (existing?.google_event_id) {
    try {
      await deleteCalendarEvent(user.id, existing.google_event_id)
    } catch {
      // 캘린더 삭제 실패해도 task 자체는 이미 지워짐.
    }
  }

  revalidateBoards()
}
