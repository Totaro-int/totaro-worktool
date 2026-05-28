import { NextResponse, after } from 'next/server'

import { logHit } from '@/lib/honeypot/logger'
import { buildMarker, renderLargePage } from '@/lib/honeypot/templates'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Large variant — 응답 본문을 ?size 파라미터로 부풀린다.
 * Tail marker 가 페이지 끝에 있어서, AI 답변에 tail marker 가 등장하면
 * 봇이 끝까지 읽었다는 뜻. 등장 안 하면 truncate 됐다는 뜻.
 *
 * ?size 형식: "1mb", "10mb", "16mb", "20mb" (대소문자 무관)
 * 기본값: 1mb
 *
 * Google 공식 문서: 15MB 제한.
 */

const SIZE_PATTERN = /^(\d+(?:\.\d+)?)\s*(kb|mb)?$/i

function parseSize(input: string | null): number {
  if (!input) return 1 * 1024 * 1024
  const match = SIZE_PATTERN.exec(input.trim())
  if (!match) return 1 * 1024 * 1024
  const value = parseFloat(match[1])
  const unit = (match[2] ?? 'mb').toLowerCase()
  const multiplier = unit === 'kb' ? 1024 : 1024 * 1024
  const bytes = Math.floor(value * multiplier)
  // 안전 가드: 50MB 상한
  return Math.min(bytes, 50 * 1024 * 1024)
}

export async function GET(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await context.params
  const url = new URL(req.url)
  const targetBytes = parseSize(url.searchParams.get('size'))
  const started = Date.now()

  const marker = buildMarker('large', id)
  const html = renderLargePage(marker, url.origin, targetBytes)
  const bytes = new TextEncoder().encode(html).length
  const responseMs = Date.now() - started

  after(logHit(req, 'large', id, { status: 200, bytesReturned: bytes, responseMs }))

  return new NextResponse(html, {
    status: 200,
    headers: {
      'content-type': 'text/html; charset=utf-8',
      'cache-control': 'no-store',
    },
  })
}
