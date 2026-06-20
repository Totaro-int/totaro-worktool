/**
 * 오늘(최신) 마케팅 분석 보고서 가져오기 — 카드레터 스튜디오 챗 옆 패널이 호출.
 * 사현이가 매일 아침 우편실 '마케팅 분석' 폴더에 올린 보고서를 그대로 돌려준다.
 */
import { latestReport } from '@/lib/agents/report'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const report = await latestReport('마케팅 분석')
  return Response.json({ ok: Boolean(report), report: report ?? null })
}
