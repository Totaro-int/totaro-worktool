/**
 * Google Calendar API v3 — 사용자별 캘린더 CRUD + 오늘/이번 주 일정 조회.
 *
 * 모든 호출은 사용자 access_token 으로. tasks.due_date 가 있으면 all-day 이벤트로 등록,
 * 시간 정보까지 있으면 datetime 이벤트. 일단은 due_date(날짜) 만 지원.
 *
 * 성공 시 eventId 를 tasks.google_event_id 에 저장 → 다음 update/delete 에 활용.
 */
import { getAccessToken } from './oauth'

const API = 'https://www.googleapis.com/calendar/v3'
const CAL = 'primary' // 사용자 기본 캘린더

export type CalendarTaskInput = {
  title: string
  description: string | null
  due_date: string | null // YYYY-MM-DD
  url?: string | null // 워크툴 task 링크 (선택)
}

type CalendarEvent = {
  id?: string
  summary?: string
  description?: string
  start?: { date?: string; dateTime?: string; timeZone?: string }
  end?: { date?: string; dateTime?: string; timeZone?: string }
  htmlLink?: string
}

/** task → Calendar event 본문. 시각 없는 마감일이라 all-day. */
function buildEventBody(t: CalendarTaskInput): Record<string, unknown> | null {
  if (!t.due_date) return null
  // all-day 이벤트는 end.date 가 exclusive — 다음날로.
  const start = t.due_date
  const end = addOneDay(t.due_date)
  const description = [t.description ?? '', t.url ? `\n\n워크툴: ${t.url}` : ''].join('').trim()
  return {
    summary: `[토타로] ${t.title}`,
    description: description || undefined,
    start: { date: start },
    end: { date: end },
  }
}

function addOneDay(yyyymmdd: string): string {
  const d = new Date(`${yyyymmdd}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + 1)
  return d.toISOString().slice(0, 10)
}

/** 새 일정 생성. eventId 반환. */
export async function createCalendarEvent(
  userId: string,
  t: CalendarTaskInput
): Promise<{ eventId: string } | { error: string } | { skipped: true }> {
  const body = buildEventBody(t)
  if (!body) return { skipped: true } // 마감일 없으면 skip
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨 (먼저 /contacts 에서 연결)' }
  const r = await fetch(`${API}/calendars/${CAL}/events`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) return { error: `Calendar API ${r.status}: ${(await r.text()).slice(0, 200)}` }
  const j = (await r.json()) as CalendarEvent
  if (!j.id) return { error: 'eventId 응답 없음' }
  return { eventId: j.id }
}

/** 기존 일정 patch — eventId 로 식별. */
export async function updateCalendarEvent(
  userId: string,
  eventId: string,
  t: CalendarTaskInput
): Promise<{ ok: true } | { error: string } | { skipped: true }> {
  const body = buildEventBody(t)
  if (!body) return { skipped: true }
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨' }
  const r = await fetch(`${API}/calendars/${CAL}/events/${eventId}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!r.ok) return { error: `Calendar API ${r.status}: ${(await r.text()).slice(0, 200)}` }
  return { ok: true }
}

/** 일정 삭제 — eventId 로 식별. 404 는 이미 지워진 경우라 성공으로. */
export async function deleteCalendarEvent(
  userId: string,
  eventId: string
): Promise<{ ok: true } | { error: string }> {
  const token = await getAccessToken(userId)
  if (!token) return { error: 'Google 연결 안 됨' }
  const r = await fetch(`${API}/calendars/${CAL}/events/${eventId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok && r.status !== 404 && r.status !== 410) {
    return { error: `Calendar API ${r.status}` }
  }
  return { ok: true }
}

export type UpcomingEvent = {
  id: string
  summary: string
  start: string // ISO datetime 또는 YYYY-MM-DD
  end: string
  allDay: boolean
  htmlLink: string | null
}

/** 내부 — 두 ISO 시각 사이 본인 캘린더 일정 모두 가져온다. /hub 위젯 + /calendar 페이지 공용. */
async function listEventsBetween(
  userId: string,
  timeMin: string,
  timeMax: string,
  maxResults: number = 250
): Promise<UpcomingEvent[]> {
  const token = await getAccessToken(userId)
  if (!token) return []
  const p = new URLSearchParams({
    timeMin,
    timeMax,
    singleEvents: 'true',
    orderBy: 'startTime',
    maxResults: String(maxResults),
  })
  const r = await fetch(`${API}/calendars/${CAL}/events?${p.toString()}`, {
    headers: { Authorization: `Bearer ${token}` },
  })
  if (!r.ok) return []
  const j = (await r.json()) as { items?: CalendarEvent[] }
  return (j.items ?? [])
    .filter((e) => e.id && (e.start?.date || e.start?.dateTime))
    .map((e) => {
      const startDate = e.start?.dateTime ?? e.start?.date ?? ''
      const endDate = e.end?.dateTime ?? e.end?.date ?? startDate
      return {
        id: e.id ?? '',
        summary: e.summary ?? '(제목 없음)',
        start: startDate,
        end: endDate,
        allDay: Boolean(e.start?.date && !e.start?.dateTime),
        htmlLink: e.htmlLink ?? null,
      }
    })
}

/**
 * 지금부터 N일 후까지의 일정. /hub 위젯용.
 */
export async function listUpcomingEvents(
  userId: string,
  days: number = 7,
  maxResults: number = 20
): Promise<UpcomingEvent[]> {
  const timeMin = new Date().toISOString()
  const timeMax = new Date(Date.now() + days * 24 * 60 * 60 * 1000).toISOString()
  return listEventsBetween(userId, timeMin, timeMax, maxResults)
}

/** 특정 월(`YYYY-MM`) 전체 일정. /calendar 월 그리드용. */
export async function listEventsInMonth(
  userId: string,
  yearMonth: string
): Promise<UpcomingEvent[]> {
  const [y, m] = yearMonth.split('-').map(Number)
  if (!y || !m) return []
  // 월 시작 자정 → 다음 달 시작 자정 (로컬 KST 기준이 자연스럽지만 Google 은 UTC 변환)
  const start = new Date(Date.UTC(y, m - 1, 1, -9, 0, 0)) // KST 자정 = UTC 전날 15시
  const end = new Date(Date.UTC(y, m, 1, -9, 0, 0))
  return listEventsBetween(userId, start.toISOString(), end.toISOString(), 500)
}
