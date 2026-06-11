/**
 * 월 그리드 — 7x6 셀. 각 셀에 일정 칩 최대 3개 + 나머지 'N+ 건' 표시.
 * 토타로 자동 등록 ([토타로] prefix) 은 indigo, 일반 일정은 emerald.
 * 칩/'N+' 클릭 → Google Calendar 웹 (htmlLink) 새 탭.
 */
import type { JSX } from 'react'

import Link from 'next/link'

import type { UpcomingEvent } from '@/lib/google/calendar'

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

function startKey(e: UpcomingEvent): string {
  try {
    const d = new Date(e.start)
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  } catch {
    return ''
  }
}

function timeLabel(e: UpcomingEvent): string {
  if (e.allDay) return '종일'
  try {
    const d = new Date(e.start)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function isTotaroEvent(e: UpcomingEvent): boolean {
  return e.summary.startsWith('[토타로]')
}

export function CalendarMonth({
  month,
  events,
}: {
  month: string
  events: UpcomingEvent[]
}): JSX.Element {
  const today = new Date()
  const monthDate = ymToDate(month)
  const monthLabel = `${monthDate.getFullYear()}년 ${monthDate.getMonth() + 1}월`

  // 그리드 시작 = 그 달 1일이 속한 주의 일요일
  const gridStart = new Date(monthDate)
  gridStart.setDate(1 - monthDate.getDay())

  // 42 셀
  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }

  // 이벤트 → 날짜별 그룹
  const byDay = new Map<string, UpcomingEvent[]>()
  for (const e of events) {
    const k = startKey(e)
    if (!k) continue
    const arr = byDay.get(k) ?? []
    arr.push(e)
    byDay.set(k, arr)
  }

  const prev = shiftMonth(month, -1)
  const next = shiftMonth(month, 1)
  const totaroCount = events.filter(isTotaroEvent).length

  return (
    <main className="mx-auto max-w-6xl px-6 py-8">
      <header className="mb-6 flex items-end justify-between">
        <div>
          <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600">CALENDAR</p>
          <h1 className="mt-1 text-3xl font-bold text-slate-900">{monthLabel}</h1>
          <p className="mt-1 text-xs text-slate-400">
            일정 {events.length}건 · 토타로 자동 등록 {totaroCount}건
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/calendar?month=${prev}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            ‹ 이전 달
          </Link>
          <Link
            href="/calendar"
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            오늘
          </Link>
          <Link
            href={`/calendar?month=${next}`}
            className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-600 hover:bg-slate-50"
          >
            다음 달 ›
          </Link>
          <Link
            href="/hub"
            className="ml-2 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-700"
          >
            허브
          </Link>
        </div>
      </header>

      <div className="overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`px-3 py-2 text-center text-[10px] font-bold tracking-[0.18em] ${
                i === 0 ? 'text-rose-500' : i === 6 ? 'text-blue-500' : 'text-slate-400'
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
            const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
            const dayEvents = byDay.get(key) ?? []
            const visible = dayEvents.slice(0, 3)
            const overflow = dayEvents.length - visible.length

            return (
              <div
                key={i}
                className={`min-h-[110px] border-r border-b border-slate-100 px-2 py-2 ${
                  inMonth ? 'bg-white' : 'bg-slate-50/60'
                }`}
              >
                <div
                  className={`mb-1 flex h-6 w-6 items-center justify-center text-xs font-bold ${
                    isToday
                      ? 'rounded-full bg-blue-600 text-white'
                      : inMonth
                        ? d.getDay() === 0
                          ? 'text-rose-500'
                          : d.getDay() === 6
                            ? 'text-blue-500'
                            : 'text-slate-700'
                        : 'text-slate-300'
                  }`}
                >
                  {d.getDate()}
                </div>
                <div className="space-y-0.5">
                  {visible.map((e) => {
                    const totaro = isTotaroEvent(e)
                    const chipClass = totaro
                      ? 'bg-indigo-50 text-indigo-700 ring-indigo-200'
                      : 'bg-emerald-50 text-emerald-700 ring-emerald-200'
                    return e.htmlLink ? (
                      <a
                        key={e.id}
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${chipClass}`}
                        title={`${e.summary} · ${timeLabel(e)}`}
                      >
                        <span className="opacity-70">
                          {timeLabel(e) !== '종일' ? `${timeLabel(e)} ` : ''}
                        </span>
                        {e.summary}
                      </a>
                    ) : (
                      <span
                        key={e.id}
                        className={`block truncate rounded-md px-1.5 py-0.5 text-[10px] font-medium ring-1 ring-inset ${chipClass}`}
                      >
                        {e.summary}
                      </span>
                    )
                  })}
                  {overflow > 0 ? (
                    <p className="px-1.5 text-[10px] font-medium text-slate-400">+ {overflow}건</p>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>

      <p className="mt-4 text-[11px] text-slate-400">
        토타로(워크툴 자동 등록) 일정은 인디고, 일반 캘린더 일정은 에메랄드. 칩을 누르면 Google
        캘린더에서 자세히 볼 수 있어요.
      </p>
    </main>
  )
}
