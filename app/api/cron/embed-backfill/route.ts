/**
 * 임베딩 백필 cron (시간당) — 쓰기 시 즉시 임베딩이 실패한 문서/기억을 소급한다.
 * 코어는 lib/assistant/backfill.ts 의 backfillEmbeddings().
 * 인증: Vercel cron 의 `Authorization: Bearer ${CRON_SECRET}` (drive-sync 와 동일).
 */
import { NextResponse } from 'next/server'

import { backfillEmbeddings } from '@/lib/assistant/backfill'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300

export async function GET(req: NextRequest): Promise<Response> {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET 미설정' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await backfillEmbeddings()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
