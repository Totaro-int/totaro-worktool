/**
 * 월 그리드 — 7×6 셀. 절제된 모노톤 + 단일 indigo 액센트.
 * 토타로 자동 등록 ([토타로] prefix) 은 짙은 indigo bar, 일반 일정은 옅은 slate bar.
 * 칩 클릭 → Google Calendar 웹 (htmlLink) 새 탭.
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
  if (e.allDay) return ''
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

function cleanSummary(e: UpcomingEvent): string {
  return isTotaroEvent(e) ? e.summary.replace(/^\[토타로\]\s*/, '') : e.summary
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

  const gridStart = new Date(monthDate)
  gridStart.setDate(1 - monthDate.getDay())

  const cells: Date[] = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    cells.push(d)
  }

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
    <main className="mx-auto max-w-6xl px-8 py-12">
      <header className="mb-10 flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
            Calendar
          </p>
          <h1 className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-slate-900">
            {monthLabel}
          </h1>
          <p className="mt-3 text-xs text-slate-500">
            전체 {events.length}건<span className="mx-2 text-slate-300">·</span>
            토타로 자동 등록 {totaroCount}건
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
            href="/hub"
            className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
          >
            허브
          </Link>
        </nav>
      </header>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50/60">
          {DAYS.map((d, i) => (
            <div
              key={d}
              className={`px-3 py-3 text-center text-[10px] font-semibold tracking-[0.2em] uppercase ${
                i === 0 ? 'text-rose-400' : i === 6 ? 'text-slate-400' : 'text-slate-400'
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
                <div className="mb-1.5">
                  <span className={dayNumClass}>{d.getDate()}</span>
                </div>
                <div className="space-y-1">
                  {visible.map((e) => {
                    const totaro = isTotaroEvent(e)
                    const t = timeLabel(e)
                    return e.htmlLink ? (
                      <a
                        key={e.id}
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className={`flex items-center gap-1.5 truncate rounded-[5px] px-1.5 py-0.5 text-[10.5px] leading-snug font-medium transition-colors ${
                          totaro
                            ? 'bg-indigo-50/70 text-indigo-900 hover:bg-indigo-100'
                            : 'bg-slate-100/80 text-slate-700 hover:bg-slate-200/80'
                        }`}
                        title={`${e.summary}${t ? ` · ${t}` : ''}`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-0.5 flex-none rounded-full ${
                            totaro ? 'bg-indigo-500' : 'bg-slate-400'
                          }`}
                        />
                        {t ? (
                          <span className="text-[10px] tabular-nums opacity-60">{t}</span>
                        ) : null}
                        <span className="truncate">{cleanSummary(e)}</span>
                      </a>
                    ) : (
                      <span
                        key={e.id}
                        className={`flex items-center gap-1.5 truncate rounded-[5px] px-1.5 py-0.5 text-[10.5px] leading-snug font-medium ${
                          totaro
                            ? 'bg-indigo-50/70 text-indigo-900'
                            : 'bg-slate-100/80 text-slate-700'
                        }`}
                      >
                        <span
                          aria-hidden="true"
                          className={`h-2.5 w-0.5 flex-none rounded-full ${
                            totaro ? 'bg-indigo-500' : 'bg-slate-400'
                          }`}
                        />
                        <span className="truncate">{cleanSummary(e)}</span>
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

      <div className="mt-6 flex items-center gap-5 text-[11px] text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded-full bg-indigo-500" aria-hidden="true" />
          토타로 자동 등록
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-2.5 w-0.5 rounded-full bg-slate-400" aria-hidden="true" />
          본인 캘린더 일정
        </span>
        <span className="ml-auto">칩 누르면 Google 캘린더에서 자세히 보기</span>
      </div>
    </main>
  )
}
