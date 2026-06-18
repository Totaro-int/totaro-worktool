import { generateContent } from '@/lib/content/generate'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * 콘텐츠 생성기 — 모네하우스 제품·순간 → MONÉ 캡션 + 해시태그 + 이미지(base64).
 * 인증 필요(전역 미들웨어가 없으므로 여기서 직접 확인).
 *
 * POST { product, moment?, note? }
 *   → 200 { caption, hashtags, imagePrompt, imageB64 }
 *   → 502 { error }   (생성 실패)
 */
export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { product?: string; moment?: string; note?: string }
  try {
    body = (await req.json()) as { product?: string; moment?: string; note?: string }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const product = (body.product ?? '').trim()
  if (!product) return new Response('product required', { status: 400 })

  const result = await generateContent({
    product,
    moment: body.moment?.trim() || undefined,
    note: body.note?.trim() || undefined,
  })

  if (!result) {
    return new Response(
      JSON.stringify({ error: '콘텐츠 생성에 실패했어요. 잠시 후 다시 시도해 주세요.' }),
      { status: 502, headers: { 'content-type': 'application/json' } }
    )
  }

  return new Response(JSON.stringify(result), {
    headers: { 'content-type': 'application/json', 'cache-control': 'no-store' },
  })
}
