/**
 * 업무 관리 캘린더 — 월 그리드에 워크툴 할일(마감일 기준)을 표시하고, 날짜 칸에서 바로 할일 추가.
 * Google 계정이 연결돼 있으면 본인 일정도 함께 얹는다(자동등록 [토타로] 분은 할일과 중복이라 숨김).
 */
import type { JSX } from 'react'

import { redirect } from 'next/navigation'

import { listEventsInMonth } from '@/lib/google/calendar'
import { getConnection } from '@/lib/google/oauth'
import { getLookups } from '@/lib/lookups'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

import { CalendarMonth } from './CalendarMonth'

export const dynamic = 'force-dynamic'

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

/** 월 그리드(6주=42칸)의 보이는 날짜 범위 [첫칸, 마지막칸] — 겹침 조회용. */
function gridRange(yearMonth: string): { start: string; end: string } {
  const [y, m] = yearMonth.split('-').map(Number)
  const first = new Date(y!, (m ?? 1) - 1, 1)
  const gs = new Date(first)
  gs.setDate(1 - first.getDay()) // 1일이 든 주의 일요일
  const ge = new Date(gs)
  ge.setDate(gs.getDate() + 41) // 6주 후 마지막 칸
  const fmt = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(
      2,
      '0'
    )}`
  return { start: fmt(gs), end: fmt(ge) }
}

export type CalTask = Pick<
  Task,
  | 'id'
  | 'title'
  | 'description'
  | 'status'
  | 'start_date'
  | 'due_date'
  | 'assignee_id'
  | 'work_area_id'
>

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; d?: string }>
}): Promise<JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=auth')

  const params = await searchParams
  const month =
    (params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null) ?? currentYearMonth()
  const addDate = params.d && /^\d{4}-\d{2}-\d{2}$/.test(params.d) ? params.d : null

  const { members, workAreas } = await getLookups()

  // 워크툴 할일 — 보이는 그리드와 겹치는 분(마감이 범위 안 OR 시작이 범위 안 → 여러 날 작업도 포함)
  const { start, end } = gridRange(month)
  const { data: taskData } = await supabase
    .from('tasks')
    .select('id, title, description, status, start_date, due_date, assignee_id, work_area_id')
    .not('due_date', 'is', null)
    .or(
      `and(due_date.gte.${start},due_date.lte.${end}),and(start_date.gte.${start},start_date.lte.${end})`
    )
    .order('due_date')
  const tasks = (taskData ?? []) as CalTask[]

  // 본인 Google 일정 — 연결돼 있을 때만(없어도 할일 캘린더는 그대로 동작)
  const { connected } = await getConnection(user.id)
  const events = connected ? await listEventsInMonth(user.id, month) : []

  return (
    <CalendarMonth
      month={month}
      tasks={tasks}
      events={events}
      members={members}
      workAreas={workAreas}
      googleConnected={connected}
      addDate={addDate}
    />
  )
}
