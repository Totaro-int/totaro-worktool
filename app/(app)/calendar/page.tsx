/** 캘린더 — 월 그리드. 본인 Google 캘린더 일정 모두 표시. */
import type { JSX } from 'react'

import { redirect } from 'next/navigation'

import { listEventsInMonth } from '@/lib/google/calendar'
import { getConnection } from '@/lib/google/oauth'
import { createClient } from '@/lib/supabase/server'

import { CalendarMonth } from './CalendarMonth'

export const dynamic = 'force-dynamic'

function currentYearMonth(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
}

export default async function CalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string }>
}): Promise<JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=auth')

  const { connected } = await getConnection(user.id)
  if (!connected) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-16 text-center">
        <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600">CALENDAR</p>
        <h1 className="mt-2 text-2xl font-bold text-slate-900">캘린더</h1>
        <p className="mt-6 text-sm text-slate-500">
          본인 Google 계정 연결이 필요합니다.
          <br />
          <a
            href="/contacts"
            className="mt-3 inline-block font-semibold text-blue-600 hover:underline"
          >
            /contacts 에서 연결하기 →
          </a>
        </p>
      </main>
    )
  }

  const params = await searchParams
  const month =
    (params.month && /^\d{4}-\d{2}$/.test(params.month) ? params.month : null) ?? currentYearMonth()

  const events = await listEventsInMonth(user.id, month)

  return <CalendarMonth month={month} events={events} />
}
