/**
 * 업무 관리 캘린더 월 그리드 — 워크툴 할일(상태색) + 본인 Google 일정(연결 시) + 날짜별 할일 추가.
 * 날짜 칸의 + 를 누르면 상단 추가 폼이 그 날짜로 열린다. 할일 칩=상태색, 일정 칩=옅은 slate.
 * [토타로] 자동등록 일정은 할일과 중복이라 페이지에서 미리 걸러져 들어온다.
 */
import type { JSX } from 'react'

import Link from 'next/link'

import { inputClass, labelClass } from '@/components/ui'
import { TASK_STATUS_DOT, TASK_STATUS_LABELS } from '@/lib/constants'
import type { UpcomingEvent } from '@/lib/google/calendar'
import type { Member, WorkArea } from '@/lib/types'

import { createTask } from '../tasks/actions'

import type { CalTask } from './page'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']

function ymToDate(yearMonth: string): Date {
  const [y, m] = yearMonth.split('-').map(Number)
  return new Date(y!, (m ?? 1) - 1, 1)
}
function dateToYM(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}
function shiftMonth(yearMonth: string, delta: number): string {
  const d = ymToDate(yearMonth)
  d.setMonth(d.getMonth() + delta)
  return dateToYM(d)
}
function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}
function cellKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function eventStartKey(e: UpcomingEvent): string {
  try {
    return cellKey(new Date(e.start))
  } catch {
    return ''
  }
}
function eventTime(e: UpcomingEvent): string {
  if (e.allDay) return ''
  try {
    return new Date(e.start).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}
/** 칩 표시용 — 앞쪽 [에이전트] prefix 제거. */
function cleanTitle(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, '')
}

export function CalendarMonth({
  month,
  tasks,
  events,
  members,
  workAreas,
  googleConnected,
  addDate,
}: {
  month: string
  tasks: CalTask[]
  events: UpcomingEvent[]
  members: Member[]
  workAreas: WorkArea[]
  googleConnected: boolean
  addDate: string | null
}): JSX.Element {
  const today = new Date()
  const monthDate = ymToDate(month)
  const monthLabel = `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`

  const gridStart = new Date(monthDate)
  gridStart.setDate(1 - monthDate.getDay())
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }

  const tasksByDay = new Map<string, CalTask[]>()
  for (const t of tasks) {
    if (!t.due_date) continue
    const arr = tasksByDay.get(t.due_date) ?? []
    arr.push(t)
    tasksByDay.set(t.due_date, arr)
  }

  const eventsByDay = new Map<string, UpcomingEvent[]>()
  for (const e of events) {
    const k = eventStartKey(e)
    if (!k) continue
    const arr = eventsByDay.get(k) ?? []
    arr.push(e)
    eventsByDay.set(k, arr)
  }

  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)

  return (
    <main className="mx-auto max-w-6xl px-8 py-12">
      <header className="mb-6 flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
            업무 관리 캘린더
          </p>
          <h1 className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-slate-900">
            {monthLabel}
          </h1>
          <p className="mt-3 text-xs text-slate-500">
            할일 {tasks.length}건<span className="mx-2 text-slate-300">·</span>
            {googleConnected ? (
              <>일정 {events.length}건</>
            ) : (
              <a href="/contacts" className="text-blue-600 hover:underline">
                Google 연결 시 일정도 표시
              </a>
            )}
          </p>
        </div>
        <nav className="flex items-center gap-1">
          <Link
            href={`/calendar?month=${prev}`}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            이전
          </Link>
          <Link
            href="/calendar"
            className="rounded-md border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-700 transition-colors hover:bg-slate-50"
          >
            오늘
          </Link>
          <Link
            href={`/calendar?month=${next}`}
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900"
          >
            다음
          </Link>
          <span className="mx-2 h-4 w-px bg-slate-200" aria-hidden="true" />
          <Link
            href="/tasks"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            보드
          </Link>
        </nav>
      </header>

      {/* 할일 추가 — 날짜 칸의 + 를 누르면 그 날짜로 열린다 */}
      <details
        id="add"
        open={Boolean(addDate)}
        className="mb-6 rounded-xl bg-white ring-1 ring-slate-200"
      >
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-slate-700">
          + 할일 추가{addDate ? ` · ${addDate}` : ''}
        </summary>
        <form action={createTask} className="space-y-3 border-t border-slate-100 p-5">
          <div>
            <label className={labelClass} htmlFor="cal-title">
              할 일
            </label>
            <input
              id="cal-title"
              name="title"
              required
              placeholder="예: 협탁 상세페이지 카피"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="cal-due">
                마감일
              </label>
              <input
                type="date"
                id="cal-due"
                name="due_date"
                defaultValue={addDate ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cal-area">
                사업영역
              </label>
              <select id="cal-area" name="work_area_id" className={inputClass}>
                <option value="">선택 안 함</option>
                {workAreas.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="cal-assignee">
                담당자
              </label>
              <select id="cal-assignee" name="assignee_id" className={inputClass}>
                <option value="">미정</option>
                {members.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            추가하기
          </button>
          <p className="text-xs text-slate-400">
            마감일이 있고 본인 Google 이 연결돼 있으면 캘린더에도 자동 등록돼요.
          </p>
        </form>
      </details>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`px-3 py-3 text-center text-[10px] font-semibold tracking-[0.2em] uppercase ${
                i === 0 ? 'text-rose-400' : 'text-slate-400'
              }`}
            >
              {d}
            </div>
          ))}
        </div>
        <div className="grid grid-cols-7">
          {cells.map((d, i) => {
            const inMonth = d.getMonth() === monthDate.getMonth()
            const isToday = isSameDay(d, today)
            const key = cellKey(d)
            const dayTasks = tasksByDay.get(key) ?? []
            const dayEvents = eventsByDay.get(key) ?? []
            const shownTasks = dayTasks.slice(0, 3)
            const slots = Math.max(0, 3 - shownTasks.length)
            const shownEvents = dayEvents.slice(0, slots)
            const overflow =
              dayTasks.length - shownTasks.length + (dayEvents.length - shownEvents.length)

            const dayNumClass = isToday
              ? 'inline-flex h-6 w-6 items-center justify-center rounded-full bg-slate-900 text-[11px] font-semibold text-white'
              : inMonth
                ? d.getDay() === 0
                  ? 'text-[12px] font-medium text-rose-500'
                  : 'text-[12px] font-medium text-slate-700'
                : 'text-[12px] font-medium text-slate-300'

            return (
              <div
                key={i}
                className={`group relative min-h-[120px] border-r border-b border-slate-100 px-2.5 pt-2.5 pb-2 transition-colors ${
                  inMonth ? 'bg-white hover:bg-slate-50/60' : 'bg-slate-50/40'
                } ${(i + 1) % 7 === 0 ? 'border-r-0' : ''}`}
              >
                <div className="mb-1.5 flex items-center justify-between">
                  <span className={dayNumClass}>{d.getDate()}</span>
                  <Link
                    href={`/calendar?month=${month}&d=${key}#add`}
                    aria-label={`${key} 할일 추가`}
                    className="flex h-5 w-5 items-center justify-center rounded-md text-sm leading-none text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-100 hover:text-slate-700"
                  >
                    +
                  </Link>
                </div>
                <div className="space-y-1">
                  {shownTasks.map((t) => {
                    const done = t.status === 'done'
                    return (
                      <span
                        key={t.id}
                        title={`${cleanTitle(t.title)} · ${TASK_STATUS_LABELS[t.status]}`}
                        className="flex items-center gap-1.5 truncate rounded-[5px] bg-slate-50 px-1.5 py-0.5 text-[10.5px] leading-snug font-medium ring-1 ring-slate-100"
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-0.5 flex-none rounded-full ${TASK_STATUS_DOT[t.status]}`}
                        />
                        <span
                          className={`truncate ${done ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                        >
                          {cleanTitle(t.title)}
                        </span>
                      </span>
                    )
                  })}
                  {shownEvents.map((e) => {
                    const t = eventTime(e)
                    const chip = (
                      <span className="flex items-center gap-1.5 truncate rounded-[5px] bg-indigo-50/60 px-1.5 py-0.5 text-[10.5px] leading-snug font-medium text-indigo-900">
                        <span
                          aria-hidden="true"
                          className="h-2.5 w-0.5 flex-none rounded-full bg-indigo-400"
                        />
                        {t ? (
                          <span className="text-[10px] tabular-nums opacity-60">{t}</span>
                        ) : null}
                        <span className="truncate">{e.summary}</span>
                      </span>
                    )
                    return e.htmlLink ? (
                      <a
                        key={e.id}
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        title={e.summary}
                      >
                        {chip}
                      </a>
                    ) : (
                      <span key={e.id} title={e.summary}>
                        {chip}
                      </span>
                    )
                  })}
                  {overflow > 0 ? (
                    <p className="px-1.5 text-[10px] font-medium text-slate-400">외 {overflow}건</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <div className="mt-6 flex flex-wrap items-center gap-5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-0.5 rounded-full ${TASK_STATUS_DOT.todo}`} aria-hidden="true" />
          할 일
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className={`h-2.5 w-0.5 rounded-full ${TASK_STATUS_DOT.doing}`}
            aria-hidden="true"
          />
          진행 중
        </span>
        <span className="flex items-center gap-1.5">
          <span className={`h-2.5 w-0.5 rounded-full ${TASK_STATUS_DOT.done}`} aria-hidden="true" />
          완료
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded-full bg-indigo-400" aria-hidden="true" />
          Google 일정
        </span>
        <span className="ml-auto">날짜 칸의 + 로 그날 할일 추가</span>
      </div>
    </main>
  )
}
