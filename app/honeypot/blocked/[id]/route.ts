import { NextResponse, after } from 'next/server'

import { logHit } from '@/lib/honeypot/logger'
import { buildMarker, renderSsrPage } from '@/lib/honeypot/templates'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Blocked variant — 본문은 baseline 과 동일하지만 robots.txt 에서 차단됨.
 * 봇이 이 페이지를 fetch 했다면 robots.txt 위반.
 * → Perplexity-User 같은 user-triggered fetcher 의 robots 무시 여부 검증.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  const started = Date.now()

  const marker = buildMarker('blocked', id)
  const origin = new URL(req.url).origin
  const html = renderSsrPage(marker, origin)
  const bytes = new TextEncoder().encode(html).length
  const responseMs = Date.now() - started

  after(logHit(req, 'blocked', id, { status: 200, bytesReturned: bytes, responseMs }))

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
      'x-robots-tag': 'noindex, nofollow',
    },
  })
}
