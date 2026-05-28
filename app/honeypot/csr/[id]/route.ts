import { NextResponse, after } from 'next/server'

import { logHit } from '@/lib/honeypot/logger'
import { buildMarker, renderCsrPage } from '@/lib/honeypot/templates'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * CSR variant — 본문이 JS 로만 주입됨.
 * JS 실행 안 하는 봇은 marker 를 발견 못 함.
 * → AI 답변에 marker 가 등장하나? 로 JS 실행 여부 판정.
 */
export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  const started = Date.now()

  const marker = buildMarker('csr', id)
  const origin = new URL(req.url).origin
  const html = renderCsrPage(marker, origin)
  const bytes = new TextEncoder().encode(html).length
  const responseMs = Date.now() - started

  after(logHit(req, 'csr', id, { status: 200, bytesReturned: bytes, responseMs }))

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
