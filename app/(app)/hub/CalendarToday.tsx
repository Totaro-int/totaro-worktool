/**
 * Hub 우측 하단 — 오늘/내일 Google 캘린더 일정 위젯.
 * Google 미연결 사용자에겐 안 보이게 (null 반환). 모노톤 + 단일 액센트.
 */
import Link from 'next/link'

import { listUpcomingEvents } from '@/lib/google/calendar'
import { getConnection } from '@/lib/google/oauth'

function formatEventTime(start: string, allDay: boolean): string {
  if (allDay) return '종일'
  try {
    const d = new Date(start)
    return d.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

function formatEventDay(start: string): string {
  try {
    const d = new Date(start)
    const today = new Date()
    const tomorrow = new Date(today)
    tomorrow.setDate(today.getDate() + 1)
    const sameDay = (a: Date, b: Date) =>
      a.getFullYear() === b.getFullYear() &&
      a.getMonth() === b.getMonth() &&
      a.getDate() === b.getDate()
    if (sameDay(d, today)) return '오늘'
    if (sameDay(d, tomorrow)) return '내일'
    return `${d.getMonth() + 1}/${d.getDate()}`
  } catch {
    return ''
  }
}

function isTotaroEvent(summary: string): boolean {
  return summary.startsWith('[토타로]')
}

function cleanSummary(summary: string): string {
  return isTotaroEvent(summary) ? summary.replace(/^\[토타로\]\s*/, '') : summary
}

export async function CalendarToday({
  userId,
}: {
  userId: string
}): Promise<React.JSX.Element | null> {
  const { connected } = await getConnection(userId)
  if (!connected) return null

  const events = await listUpcomingEvents(userId, 7, 8)

  return (
    <div className="pointer-events-auto absolute right-6 bottom-6 w-[290px] overflow-hidden rounded-xl border border-[#1c3556] bg-[#101f38]/95 shadow-sm backdrop-blur">
      <div className="flex items-center justify-between border-b border-[#12233c] px-4 py-2.5">
        <p className="text-[10px] font-medium tracking-[0.3em] text-[#6b7c96] uppercase">
          Upcoming
        </p>
        <Link
          href="/calendar"
          className="text-[10px] font-medium text-[#8ea0b8] transition-colors hover:text-[#dbe7f4]"
        >
          전체 →
        </Link>
      </div>
      {events.length === 0 ? (
        <p className="px-4 py-5 text-center text-[11px] text-[#6b7c96]">이번 주 일정 없음</p>
      ) : (
        <ul className="divide-y divide-slate-100">
          {events.slice(0, 5).map((e) => {
            const totaro = isTotaroEvent(e.summary)
            return (
              <li key={e.id} className="px-4 py-2.5">
                <div className="flex items-start gap-2.5">
                  <span
                    aria-hidden="true"
                    className={`mt-1 h-2 w-0.5 flex-none rounded-full ${
                      totaro ? 'bg-indigo-500' : 'bg-slate-300'
                    }`}
                  />
                  <div className="min-w-0 flex-1">
                    {e.htmlLink ? (
                      <a
                        href={e.htmlLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="block truncate text-[12px] font-medium text-[#dbe7f4] transition-colors hover:text-[#dbe7f4]"
                        title={e.summary}
                      >
                        {cleanSummary(e.summary)}
                      </a>
                    ) : (
                      <span className="block truncate text-[12px] font-medium text-[#dbe7f4]">
                        {cleanSummary(e.summary)}
                      </span>
                    )}
                    <p className="mt-0.5 text-[10px] text-[#6b7c96] tabular-nums">
                      {formatEventDay(e.start)}
                      {!e.allDay ? (
                        <>
                          <span className="mx-1.5 text-[#4a5568]">·</span>
                          {formatEventTime(e.start, e.allDay)}
                        </>
                      ) : (
                        <>
                          <span className="mx-1.5 text-[#4a5568]">·</span>종일
                        </>
                      )}
                    </p>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
