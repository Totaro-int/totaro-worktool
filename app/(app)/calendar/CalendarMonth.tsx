'use client'

/**
 * 업무 관리 캘린더 — 월 그리드 + 여러 날 기간 막대 + 날짜별 상세 패널.
 *  - 날짜 칸 클릭 = 그날 선택 → 하단 상세 패널(그날 업무 전부 + 메모 편집 + 상태 이동).
 *  - 칸 우상단 '+' = 그날 할일 추가 폼.
 *  - 여러 칸 드래그 = 멀티데이 기간 추가.
 * start_date..due_date 가 기간. start_date 없거나 == due_date 면 하루짜리.
 */
import { useEffect, useRef, useState, type JSX } from 'react'

import Link from 'next/link'

import { WorkAreaBadge, inputClass, labelClass } from '@/components/ui'
import { TASK_STATUS_DOT, TASK_STATUS_LABELS } from '@/lib/constants'
import type { UpcomingEvent } from '@/lib/google/calendar'
import type { Member, TaskStatus, WorkArea } from '@/lib/types'

import { createTask, deleteTask, updateTask, updateTaskStatus } from '../tasks/actions'

import type { CalTask } from './page'

const DAYS = ['일', '월', '화', '수', '목', '금', '토']
const DAYNUM_H = 26
const BAR_H = 22

const STATUS_BAR: Record<TaskStatus, string> = {
  todo: 'bg-slate-100 text-slate-700 ring-1 ring-inset ring-slate-200',
  doing: 'bg-amber-100 text-amber-900 ring-1 ring-inset ring-amber-200',
  done: 'bg-emerald-50 text-emerald-700 ring-1 ring-inset ring-emerald-200',
}

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
function cellKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(
    d.getDate()
  ).padStart(2, '0')}`
}
function isSameDay(a: Date, b: Date): boolean {
  return cellKey(a) === cellKey(b)
}
function daysBetween(a: string, b: string): number {
  return Math.round(
    (new Date(`${b}T00:00:00`).getTime() - new Date(`${a}T00:00:00`).getTime()) / 86_400_000
  )
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
function cleanTitle(title: string): string {
  return title.replace(/^\[[^\]]+\]\s*/, '')
}
function isMultiDay(t: CalTask): boolean {
  return Boolean(t.start_date && t.due_date && t.start_date < t.due_date)
}

type Bar = {
  task: CalTask
  colStart: number
  colEnd: number
  lane: number
  trueStart: boolean
  trueEnd: boolean
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
  const [drag, setDrag] = useState<{ anchor: string; hover: string } | null>(null)
  const dragRef = useRef<{ anchor: string; hover: string } | null>(null)
  const setDragState = (v: { anchor: string; hover: string } | null): void => {
    dragRef.current = v
    setDrag(v)
  }

  const [selectedDay, setSelectedDay] = useState<string | null>(null)
  const [formOpen, setFormOpen] = useState(Boolean(addDate))
  const [rangeStart, setRangeStart] = useState(addDate ?? '')
  const [rangeEnd, setRangeEnd] = useState(addDate ?? '')
  const titleRef = useRef<HTMLInputElement>(null)
  const formRef = useRef<HTMLDetailsElement>(null)

  function openAdd(day: string): void {
    setRangeStart(day)
    setRangeEnd(day)
    setFormOpen(true)
    requestAnimationFrame(() => {
      formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      titleRef.current?.focus()
    })
  }

  // 드래그 끝: 한 칸이면 그날 선택(상세), 여러 칸이면 기간 추가 폼.
  useEffect(() => {
    function onUp(): void {
      const d = dragRef.current
      if (!d) return
      dragRef.current = null
      setDrag(null)
      const [a, b] = [d.anchor, d.hover].sort()
      if (a === b) {
        setSelectedDay(a!)
        return
      }
      setRangeStart(a!)
      setRangeEnd(b!)
      setFormOpen(true)
      requestAnimationFrame(() => {
        formRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
        titleRef.current?.focus()
      })
    }
    window.addEventListener('pointerup', onUp)
    return () => window.removeEventListener('pointerup', onUp)
  }, [])

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
  const weeks: Date[][] = []
  for (let w = 0; w < 6; w++) weeks.push(cells.slice(w * 7, w * 7 + 7))

  const memberById = new Map(members.map((m) => [m.id, m]))
  const areaById = new Map(workAreas.map((w) => [w.id, w]))

  const singleByDay = new Map<string, CalTask[]>()
  for (const t of tasks) {
    if (isMultiDay(t) || !t.due_date) continue
    const arr = singleByDay.get(t.due_date) ?? []
    arr.push(t)
    singleByDay.set(t.due_date, arr)
  }
  const eventsByDay = new Map<string, UpcomingEvent[]>()
  for (const e of events) {
    const k = eventStartKey(e)
    if (!k) continue
    const arr = eventsByDay.get(k) ?? []
    arr.push(e)
    eventsByDay.set(k, arr)
  }

  const multi = tasks
    .filter(isMultiDay)
    .sort(
      (a, b) => a.start_date!.localeCompare(b.start_date!) || b.due_date!.localeCompare(a.due_date!)
    )
  const weekBars: Bar[][] = weeks.map((week) => {
    const ws = cellKey(week[0]!)
    const we = cellKey(week[6]!)
    const bars: Bar[] = []
    const lanes: Bar[][] = []
    for (const t of multi) {
      const s = t.start_date!
      const e = t.due_date!
      if (s > we || e < ws) continue
      const segS = s < ws ? ws : s
      const segE = e > we ? we : e
      const colStart = daysBetween(ws, segS)
      const colEnd = daysBetween(ws, segE)
      let lane = lanes.findIndex(
        (laneBars) => !laneBars.some((b) => !(colEnd < b.colStart || colStart > b.colEnd))
      )
      if (lane === -1) {
        lane = lanes.length
        lanes.push([])
      }
      const bar: Bar = { task: t, colStart, colEnd, lane, trueStart: s >= ws, trueEnd: e <= we }
      lanes[lane]!.push(bar)
      bars.push(bar)
    }
    return bars
  })
  const maxLanes = weekBars.reduce((mx, bars) => Math.max(mx, ...bars.map((b) => b.lane + 1), 0), 0)
  const laneBand = maxLanes * BAR_H

  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)

  const dragLo = drag ? [drag.anchor, drag.hover].sort()[0]! : ''
  const dragHi = drag ? [drag.anchor, drag.hover].sort()[1]! : ''

  // 선택한 날의 업무 전부(하루짜리 due=그날 + 그날 걸치는 멀티데이).
  const selTasks = selectedDay
    ? tasks.filter((t) => {
        if (!t.due_date) return false
        if (isMultiDay(t)) return t.start_date! <= selectedDay && selectedDay <= t.due_date
        return t.due_date === selectedDay
      })
    : []
  const selEvents = selectedDay ? (eventsByDay.get(selectedDay) ?? []) : []

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

      {/* 할일 추가 — '+' 또는 드래그로 열림 */}
      <details
        ref={formRef}
        open={formOpen}
        onToggle={(e) => setFormOpen((e.target as HTMLDetailsElement).open)}
        className="mb-6 rounded-xl bg-white ring-1 ring-slate-200"
      >
        <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-slate-700">
          + 할일 추가
          {rangeStart ? (
            <span className="ml-1 text-slate-400">
              · {rangeStart}
              {rangeEnd && rangeEnd !== rangeStart ? ` ~ ${rangeEnd}` : ''}
            </span>
          ) : null}
        </summary>
        <form action={createTask} className="space-y-3 border-t border-slate-100 p-5">
          <div>
            <label className={labelClass} htmlFor="cal-title">
              할 일
            </label>
            <input
              ref={titleRef}
              id="cal-title"
              name="title"
              required
              placeholder="예: 협탁 상세페이지 카피"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass} htmlFor="cal-memo">
              메모 (선택)
            </label>
            <textarea
              id="cal-memo"
              name="description"
              rows={2}
              placeholder="상세 내용·메모"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelClass} htmlFor="cal-start">
                시작
              </label>
              <input
                type="date"
                id="cal-start"
                name="start_date"
                value={rangeStart}
                onChange={(e) => setRangeStart(e.target.value)}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor="cal-due">
                마감
              </label>
              <input
                type="date"
                id="cal-due"
                name="due_date"
                value={rangeEnd}
                onChange={(e) => setRangeEnd(e.target.value)}
                className={inputClass}
              />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
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
            시작 ~ 마감이 다르면 여러 날 막대로 표시돼요. 같으면 하루짜리.
          </p>
        </form>
      </details>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white select-none">
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

        {weeks.map((week, wi) => (
          <div key={wi} className="relative border-b border-slate-100 last:border-b-0">
            <div className="grid grid-cols-7">
              {week.map((d, di) => {
                const inMonth = d.getMonth() === monthDate.getMonth()
                const isToday = isSameDay(d, today)
                const key = cellKey(d)
                const inDrag = Boolean(drag) && key >= dragLo && key <= dragHi
                const isSel = selectedDay === key
                const dayTasks = singleByDay.get(key) ?? []
                const dayEvents = eventsByDay.get(key) ?? []
                const shownTasks = dayTasks.slice(0, 2)
                const slots = Math.max(0, 2 - shownTasks.length)
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
                    key={di}
                    onPointerDown={(e) => {
                      e.preventDefault()
                      setDragState({ anchor: key, hover: key })
                    }}
                    onPointerEnter={() => {
                      if (dragRef.current)
                        setDragState({ anchor: dragRef.current.anchor, hover: key })
                    }}
                    className={`group relative min-h-[120px] cursor-pointer px-2.5 pb-2 transition-colors ${
                      (di + 1) % 7 === 0 ? '' : 'border-r border-slate-100'
                    } ${
                      isSel
                        ? 'bg-indigo-50/70 ring-2 ring-indigo-300 ring-inset'
                        : inDrag
                          ? 'bg-indigo-50'
                          : inMonth
                            ? 'bg-white hover:bg-slate-50/60'
                            : 'bg-slate-50/40'
                    }`}
                    style={{ paddingTop: DAYNUM_H + laneBand + 4 }}
                  >
                    <div
                      className="absolute inset-x-2.5 flex items-center justify-between"
                      style={{ top: 6 }}
                    >
                      <span className={dayNumClass}>{d.getDate()}</span>
                      <button
                        type="button"
                        aria-label={`${key} 할일 추가`}
                        onPointerDown={(e) => e.stopPropagation()}
                        onClick={(e) => {
                          e.stopPropagation()
                          openAdd(key)
                        }}
                        className="flex h-5 w-5 items-center justify-center rounded-md text-sm leading-none text-slate-400 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-slate-200 hover:text-slate-700"
                      >
                        +
                      </button>
                    </div>
                    <div className="space-y-1">
                      {shownTasks.map((t) => (
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
                            className={`truncate ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-700'}`}
                          >
                            {cleanTitle(t.title)}
                          </span>
                        </span>
                      ))}
                      {shownEvents.map((e) => {
                        const tm = eventTime(e)
                        return (
                          <span
                            key={e.id}
                            title={e.summary}
                            className="flex items-center gap-1.5 truncate rounded-[5px] bg-indigo-50/60 px-1.5 py-0.5 text-[10.5px] leading-snug font-medium text-indigo-900"
                          >
                            <span
                              aria-hidden="true"
                              className="h-2.5 w-0.5 flex-none rounded-full bg-indigo-400"
                            />
                            {tm ? (
                              <span className="text-[10px] tabular-nums opacity-60">{tm}</span>
                            ) : null}
                            <span className="truncate">{e.summary}</span>
                          </span>
                        )
                      })}
                      {overflow > 0 ? (
                        <p className="px-1.5 text-[10px] font-medium text-slate-400">
                          외 {overflow}건
                        </p>
                      ) : null}
                    </div>
                  </div>
                )
              })}
            </div>

            {weekBars[wi]!.length > 0 ? (
              <div
                className="pointer-events-none absolute inset-x-0 grid grid-cols-7 gap-x-px px-px"
                style={{ top: DAYNUM_H + 2, gridAutoRows: `${BAR_H}px` }}
              >
                {weekBars[wi]!.map((b) => (
                  <div
                    key={b.task.id}
                    title={`${cleanTitle(b.task.title)} · ${b.task.start_date}~${b.task.due_date}`}
                    style={{
                      gridColumn: `${b.colStart + 1} / ${b.colEnd + 2}`,
                      gridRow: b.lane + 1,
                    }}
                    className={`mx-0.5 flex h-[18px] items-center truncate px-2 text-[10.5px] leading-[18px] font-medium ${
                      STATUS_BAR[b.task.status]
                    } ${b.trueStart ? 'rounded-l-full' : ''} ${b.trueEnd ? 'rounded-r-full' : ''}`}
                  >
                    <span className="truncate">{cleanTitle(b.task.title)}</span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>

      {/* 선택한 날 상세 — 그날 업무 전부 + 메모 편집 + 상태 이동 */}
      {selectedDay ? (
        <section className="mt-6 rounded-xl border border-slate-200 bg-white">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3.5">
            <h2 className="text-sm font-semibold text-slate-800">
              {selectedDay} 업무 {selTasks.length}건
              {selEvents.length > 0 ? (
                <span className="ml-2 text-xs font-normal text-slate-400">
                  · 일정 {selEvents.length}
                </span>
              ) : null}
            </h2>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => openAdd(selectedDay)}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                + 이 날 추가
              </button>
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                닫기
              </button>
            </div>
          </div>

          {selTasks.length === 0 && selEvents.length === 0 ? (
            <p className="px-5 py-8 text-center text-xs text-slate-400">
              이 날 업무가 없어요. 우측 위 &lsquo;+ 이 날 추가&rsquo;로 만들 수 있어요.
            </p>
          ) : (
            <div className="divide-y divide-slate-100">
              {selTasks.map((t) => {
                const area = t.work_area_id ? areaById.get(t.work_area_id) : undefined
                const assignee = t.assignee_id ? memberById.get(t.assignee_id) : undefined
                return (
                  <div key={t.id} className="px-5 py-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span
                            aria-hidden="true"
                            className={`h-2.5 w-1 flex-none rounded-full ${TASK_STATUS_DOT[t.status]}`}
                          />
                          <span
                            className={`text-sm font-medium ${t.status === 'done' ? 'text-slate-400 line-through' : 'text-slate-900'}`}
                          >
                            {cleanTitle(t.title)}
                          </span>
                        </div>
                        <div className="mt-1.5 flex flex-wrap items-center gap-2 text-xs text-slate-400">
                          {area ? <WorkAreaBadge area={area} /> : null}
                          {assignee ? <span>{assignee.name}</span> : null}
                          <span>
                            {isMultiDay(t) ? `${t.start_date} ~ ${t.due_date}` : t.due_date}
                          </span>
                          <span className="text-slate-300">{TASK_STATUS_LABELS[t.status]}</span>
                        </div>
                      </div>
                      <form action={deleteTask}>
                        <input type="hidden" name="id" value={t.id} />
                        <button
                          type="submit"
                          className="shrink-0 text-xs text-slate-300 transition-colors hover:text-red-500"
                        >
                          삭제
                        </button>
                      </form>
                    </div>

                    <form action={updateTask} className="mt-2.5">
                      <input type="hidden" name="id" value={t.id} />
                      <textarea
                        name="description"
                        rows={2}
                        defaultValue={t.description ?? ''}
                        placeholder="메모를 남겨보세요…"
                        className="w-full resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
                      />
                      <div className="mt-2 flex flex-wrap items-center gap-1.5">
                        <button
                          type="submit"
                          className="rounded-md bg-slate-900 px-2.5 py-1 text-xs font-medium text-white hover:bg-slate-800"
                        >
                          메모 저장
                        </button>
                      </div>
                    </form>

                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {t.status !== 'todo' ? (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="id" value={t.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={t.status === 'done' ? 'doing' : 'todo'}
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-200"
                          >
                            ← 이전
                          </button>
                        </form>
                      ) : null}
                      {t.status !== 'done' ? (
                        <form action={updateTaskStatus}>
                          <input type="hidden" name="id" value={t.id} />
                          <input
                            type="hidden"
                            name="status"
                            value={t.status === 'todo' ? 'doing' : 'done'}
                          />
                          <button
                            type="submit"
                            className="rounded-md bg-indigo-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-indigo-700"
                          >
                            {t.status === 'todo' ? '시작 →' : '완료 →'}
                          </button>
                        </form>
                      ) : null}
                    </div>
                  </div>
                )
              })}

              {selEvents.map((e) => {
                const tm = eventTime(e)
                return (
                  <div key={e.id} className="flex items-center gap-2 px-5 py-3">
                    <span
                      aria-hidden="true"
                      className="h-2.5 w-1 flex-none rounded-full bg-indigo-400"
                    />
                    {tm ? <span className="text-xs text-slate-400 tabular-nums">{tm}</span> : null}
                    <span className="truncate text-sm text-slate-700">{e.summary}</span>
                    <span className="ml-auto text-[10px] text-slate-300">Google 일정</span>
                  </div>
                )
              })}
            </div>
          )}
        </section>
      ) : null}

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
        <span className="ml-auto">
          날짜 클릭 = 그날 업무 보기 · 우상단 + = 추가 · 드래그 = 여러 날
        </span>
      </div>
    </main>
  )
}
