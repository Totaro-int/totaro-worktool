/**
 * 김사현 보고서 워치독 (매일 09:00 KST = 00:00 UTC) — 조용한 크론 실패 감지.
 *
 * 08:00 KST 일일 보고서(분석-{날짜}.md)가 09:00 까지 우편함에 안 들어오면
 * 팀 전원에게 인앱+폰 알림. VM(Hermes)·litellm·MCP 어디가 죽어도 사람이 1시간 안에 안다.
 * 인증: Vercel cron 의 `Authorization: Bearer ${CRON_SECRET}` (다른 크론과 동일).
 */
import { NextResponse } from 'next/server'

import { createNotification } from '@/lib/notifications/create'
import { getServiceSupabase } from '@/lib/oauth/utils'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

/** 오늘 날짜(KST) YYYY-MM-DD — 보고서 파일명 규칙과 동일 기준. */
function todayKst(): string {
  return new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
}

export async function GET(req: NextRequest): Promise<Response> {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET 미설정' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const sb = getServiceSupabase()
  const today = todayKst()

  // 오늘자 보고서 도착 여부 (파일명 규칙: 분석-{YYYY-MM-DD}.md, 폴더: 마케팅 분석)
  const { count: arrived } = await sb
    .from('inbox_documents')
    .select('*', { count: 'exact', head: true })
    .ilike('folder_path', '%마케팅 분석%')
    .ilike('filename', `%${today}%`)
    .not('status', 'in', '(trashed,rejected,failed)')

  if ((arrived ?? 0) > 0) {
    return NextResponse.json({ ok: true, report: 'arrived', date: today })
  }

  // 중복 알림 방지 — 오늘 이미 경보 보냈으면 스킵 (수동 재실행 대비)
  const { count: alerted } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .eq('type', 'agent_report_missing')
    .gte('created_at', `${today}T00:00:00+09:00`)

  if ((alerted ?? 0) > 0) {
    return NextResponse.json({ ok: true, report: 'missing', alert: 'already-sent', date: today })
  }

  const { data: members } = await sb.from('members').select('id')
  const ids = ((members ?? []) as { id: string }[]).map((m) => m.id)

  await createNotification({
    recipientIds: ids,
    type: 'agent_report_missing',
    title: '⚠️ 김사현 보고서 미도착',
    body: `오늘(${today}) 08:00 일일 보고서가 아직 없어요 — VM(Hermes)·litellm 상태 확인 필요.`,
    link: '/hub/ai-team/kim-sahyun',
  })

  return NextResponse.json({ ok: true, report: 'missing', alert: 'sent', date: today })
}
