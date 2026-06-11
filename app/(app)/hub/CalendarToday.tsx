/**
 * Hub 우측 하단 — 오늘/내일 Google 캘린더 일정 위젯.
 * Google 미연결 사용자에겐 안 보이게 (null 반환).
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
    return d.toLocaleDateString('ko-KR', { month: 'short', day: 'numeric' })
  } catch {
    return ''
  }
}

export async function CalendarToday({
  userId,
}: {
  userId: string
}): Promise<React.JSX.Element | null> {
  const { connected } = await getConnection(userId)
  if (!connected) return null

  const events = await listUpcomingEvents(userId, 7, 8)
  if (events.length === 0) {
    return (
      <div className="pointer-events-auto absolute right-6 bottom-6 w-64 rounded-2xl bg-white/95 px-5 py-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
        <div className="flex items-center justify-between">
          <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">다가오는 일정</p>
          <Link href="/calendar" className="text-[10px] font-medium text-blue-600 hover:underline">
            전체 보기 →
          </Link>
        </div>
        <p className="mt-2 text-xs text-slate-500">이번 주 일정 없음 · 여유 있음</p>
      </div>
    )
  }

  return (
    <div className="pointer-events-auto absolute right-6 bottom-6 w-72 rounded-2xl bg-white/95 px-5 py-4 shadow-lg ring-1 ring-slate-200 backdrop-blur">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold tracking-[0.2em] text-slate-400">다가오는 일정</p>
        <Link href="/calendar" className="text-[10px] font-medium text-blue-600 hover:underline">
          전체 보기 →
        </Link>
      </div>
      <ul className="mt-2 space-y-1.5">
        {events.slice(0, 5).map((e) => (
          <li key={e.id} className="flex items-baseline justify-between gap-3">
            <div className="min-w-0 flex-1">
              {e.htmlLink ? (
                <a
                  href={e.htmlLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="truncate text-xs font-medium text-slate-800 hover:text-blue-600"
                  title={e.summary}
                >
                  {e.summary}
                </a>
              ) : (
                <span className="truncate text-xs font-medium text-slate-800">{e.summary}</span>
              )}
            </div>
            <div className="text-right text-[10px] whitespace-nowrap text-slate-400">
              <span className="font-semibold text-slate-500">{formatEventDay(e.start)}</span>
              <span className="ml-1.5">{formatEventTime(e.start, e.allDay)}</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
