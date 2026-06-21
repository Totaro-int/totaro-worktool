/**
 * 카드 → 1080² PNG 서버 렌더(sharp). 스튜디오 "이 카드 PNG" 버튼이 호출.
 * html-to-image(브라우저) 대체 — 사진·한글이 안 깨진다.
 */
import { renderCardImage } from '@/lib/studio/render-card'
import type { RenderCardInput } from '@/lib/studio/render-card'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 60

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { card?: RenderCardInput }
  try {
    body = (await req.json()) as { card?: RenderCardInput }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  if (!body.card) return new Response('카드 데이터 없음', { status: 400 })

  try {
    return renderCardImage(body.card)
  } catch (e) {
    console.error('[render-card] 실패:', e)
    return new Response('렌더 실패', { status: 500 })
  }
}
