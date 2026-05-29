#!/usr/bin/env tsx
/**
 * 네이버 커머스 스냅샷 동기화 워커.
 *
 * Naver Commerce API 는 IP 화이트리스트 필수라 Vercel(동적 IP)에서 직접 호출이
 * 안 된다. 그래서 화이트리스트에 등록된 머신(예: 태준 로컬)에서 이 스크립트를
 * 주기적으로 돌려서 Supabase `naver_commerce_snapshot` 테이블에 결과를 박는다.
 * /hub/naver 페이지는 그 스냅샷을 읽어다 그린다.
 *
 *   npx tsx scripts/sync-naver-commerce.ts
 *
 * cron 예시 (5분마다, macOS launchd 또는 crontab):
 *   #!/bin/sh
 *   cd /Users/yuntaejun/dev/totaro-worktool
 *   /opt/homebrew/bin/npx tsx scripts/sync-naver-commerce.ts >> ~/naver-sync.log 2>&1
 *
 * 필요한 환경변수 (.env.local 에 이미 들어 있음):
 *   - NAVER_COMMERCE_CLIENT_ID
 *   - NAVER_COMMERCE_CLIENT_SECRET
 *   - NEXT_PUBLIC_SUPABASE_URL
 *   - SUPABASE_SERVICE_ROLE_KEY  (RLS 우회용. 평소엔 .env.local 에서 주석처리돼 있을 수 있음)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'

import { fetchNaverCommerceLive } from '../lib/naver/commerce-live'

// .env.local 을 저장소 루트 기준으로 로드 (어느 위치에서 실행하든 동작)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot, undefined, { info() {}, error: (...a) => console.error(...a) })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
const CLIENT_ID = process.env.NAVER_COMMERCE_CLIENT_ID
const CLIENT_SECRET = process.env.NAVER_COMMERCE_CLIENT_SECRET

function die(msg: string): never {
  console.error(`[sync-naver-commerce] ${msg}`)
  process.exit(1)
}

if (!SUPABASE_URL || !SERVICE_KEY) {
  die(
    'Supabase 환경변수가 없습니다. .env.local 에서 SUPABASE_SERVICE_ROLE_KEY 줄 맨 앞의 "# " 를 지워 활성화하세요.'
  )
}
if (!CLIENT_ID || !CLIENT_SECRET) {
  die(
    '네이버 커머스 자격증명이 없습니다. .env.local 에 NAVER_COMMERCE_CLIENT_ID / NAVER_COMMERCE_CLIENT_SECRET 을 채우세요.'
  )
}

const supabaseHeaders = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
  Prefer: 'return=representation',
}

/** naver_commerce_snapshot(id=1) 행을 upsert 한다. 행이 없으면 만들고, 있으면 update. */
async function writeSnapshot(payload: {
  order_count: number
  paid_revenue: number
  pending_revenue: number
  synced_at: string
  error_message: string | null
}): Promise<void> {
  // 단일행(id=1) — 항상 update 후 0건이면 insert.
  const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/naver_commerce_snapshot?id=eq.1`, {
    method: 'PATCH',
    headers: supabaseHeaders,
    body: JSON.stringify(payload),
  })
  if (!patchRes.ok) {
    throw new Error(`스냅샷 PATCH 실패 (${patchRes.status}): ${await patchRes.text()}`)
  }
  const patched = (await patchRes.json()) as unknown[]
  if (patched.length > 0) return

  const insertRes = await fetch(`${SUPABASE_URL}/rest/v1/naver_commerce_snapshot`, {
    method: 'POST',
    headers: supabaseHeaders,
    body: JSON.stringify({ id: 1, ...payload }),
  })
  if (!insertRes.ok) {
    throw new Error(`스냅샷 INSERT 실패 (${insertRes.status}): ${await insertRes.text()}`)
  }
}

async function main(): Promise<void> {
  const startedAt = new Date()
  console.log(`[sync-naver-commerce] start  ${startedAt.toISOString()}`)

  try {
    const snapshot = await fetchNaverCommerceLive(CLIENT_ID!, CLIENT_SECRET!)
    await writeSnapshot({
      order_count: snapshot.orderCount,
      paid_revenue: snapshot.paidRevenue,
      pending_revenue: snapshot.pendingRevenue,
      synced_at: new Date().toISOString(),
      error_message: null,
    })
    console.log(
      `[sync-naver-commerce] ok     orders=${snapshot.orderCount} paid=${snapshot.paidRevenue} pending=${snapshot.pendingRevenue}`
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    console.error(`[sync-naver-commerce] error  ${message}`)
    // 에러 메시지만 스냅샷에 박아 둠 — 기존 수치는 건드리지 않는다.
    try {
      const patchRes = await fetch(`${SUPABASE_URL}/rest/v1/naver_commerce_snapshot?id=eq.1`, {
        method: 'PATCH',
        headers: supabaseHeaders,
        body: JSON.stringify({ error_message: message, synced_at: new Date().toISOString() }),
      })
      if (!patchRes.ok) {
        console.error(`[sync-naver-commerce] 에러 기록 실패 (${patchRes.status})`)
      }
    } catch (e) {
      console.error(
        `[sync-naver-commerce] 에러 기록 실패: ${e instanceof Error ? e.message : String(e)}`
      )
    }
    process.exitCode = 1
  }
}

main().catch((e) => {
  console.error('[sync-naver-commerce] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
