import { NextResponse, after } from 'next/server'

import { logHit } from '@/lib/honeypot/logger'
import { buildMarker, renderSsrPage } from '@/lib/honeypot/templates'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Redirect variant — 301 체인.
 * 각 hop 마다 로그 → 봇이 어느 hop 에서 멈추는지 측정.
 *
 * 사용법:
 *   /honeypot/redirect/abc?hops=5
 *   → ?hops=5&current=1 → ... → ?current=5 (최종, SSR 본문 반환)
 *
 * 기본값: hops=3
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  const url = new URL(req.url)
  const hops = Math.min(parseInt(url.searchParams.get('hops') ?? '3', 10) || 3, 10)
  const current = parseInt(url.searchParams.get('current') ?? '0', 10) || 0
  const started = Date.now()

  // 최종 hop 에 도달 → 본문 렌더
  if (current >= hops) {
    const marker = buildMarker('redirect', id)
    const html = renderSsrPage(marker, url.origin)
    const bytes = new TextEncoder().encode(html).length
    const responseMs = Date.now() - started

    after(
      logHit(req, 'redirect', id, {
        status: 200,
        bytesReturned: bytes,
        responseMs,
      })
    )

    return new NextResponse(html, {
      status: 200,
      headers: {
        'content-type': 'text/html; charset=utf-8',
        'cache-control': 'no-store',
      },
    })
  }

  // 다음 hop 으로 301
  const next = new URL(req.url)
  next.searchParams.set('hops', String(hops))
  next.searchParams.set('current', String(current + 1))
  const responseMs = Date.now() - started

  after(
    logHit(req, `redirect-hop-${current}`, id, {
      status: 301,
      bytesReturned: 0,
      responseMs,
    })
  )

  return NextResponse.redirect(next, { status: 301 })
}
