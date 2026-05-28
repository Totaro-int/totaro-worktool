import { NextResponse, after } from 'next/server'

import { logHit } from '@/lib/honeypot/logger'
import { buildMarker, renderSsrPage } from '@/lib/honeypot/templates'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/** Baseline variant — SSR, schema.org JSON-LD 포함, 빠른 응답. 정상 페이지 컨트롤. */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  const started = Date.now()

  const marker = buildMarker('baseline', id)
  const origin = new URL(req.url).origin
  const html = renderSsrPage(marker, origin)
  const bytes = new TextEncoder().encode(html).length
  const responseMs = Date.now() - started

  after(logHit(req, 'baseline', id, { status: 200, bytesReturned: bytes, responseMs }))

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
