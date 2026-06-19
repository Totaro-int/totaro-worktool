/**
 * Drive → inbox_documents nightly sync (Vercel cron, 매일 새벽 3시 KST).
 *
 * 실제 동기화 로직은 lib/drive/sync.ts 의 runDriveSync() — cron · 로컬 스크립트 ·
 * (예정) 온디맨드 버튼이 공유한다. 여기서는 Vercel cron 인증만 한다.
 *
 * 인증: Vercel cron 은 `Authorization: Bearer ${CRON_SECRET}` 헤더를 자동으로 넣는다.
 */
import { NextResponse } from 'next/server'

import { runDriveSync } from '@/lib/drive/sync'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 — Drive 트리 큰 경우 대비

export async function GET(req: NextRequest): Promise<Response> {
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET 미설정' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const result = await runDriveSync()
  return NextResponse.json(result, { status: result.ok ? 200 : 500 })
}
