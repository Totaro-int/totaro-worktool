/**
 * 카드레터 대화 — 스튜디오 챗에서 호출. 사현이가 답하고, 지시면 8장 카드를 갱신해 돌려준다.
 */
import { cardChat } from '@/lib/content/cardchat'
import type { CardChatTurn, ChatCard } from '@/lib/content/cardchat'
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

  let body: { message?: string; cards?: ChatCard[]; history?: CardChatTurn[] }
  try {
    body = (await req.json()) as { message?: string; cards?: ChatCard[]; history?: CardChatTurn[] }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const message = (body.message ?? '').trim()
  if (!message) return new Response('빈 메시지', { status: 400 })

  const result = await cardChat(
    message,
    Array.isArray(body.cards) ? body.cards : [],
    Array.isArray(body.history) ? body.history : []
  )
  if (!result) return Response.json({ ok: false, error: '응답 생성 실패' }, { status: 502 })
  return Response.json({ ok: true, ...result })
}
