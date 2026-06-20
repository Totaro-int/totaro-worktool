/**
 * 카드뉴스 스토리보드 생성 — 주제 → 김사현(Gemini)이 8장 초안. 카드레터 스튜디오가 호출.
 */
import { generateCardnews } from '@/lib/content/cardnews'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 120

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { topic?: string }
  try {
    body = (await req.json()) as { topic?: string }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const topic = (body.topic ?? '').trim()
  if (!topic) return new Response('주제가 필요해요', { status: 400 })

  const board = await generateCardnews(topic)
  if (!board) return Response.json({ ok: false, error: '스토리보드 생성 실패' }, { status: 502 })
  return Response.json({ ok: true, board })
}
