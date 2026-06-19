#!/usr/bin/env tsx
/**
 * Drive → inbox_documents 동기화를 지금 1회 실행 (로컬 트리거).
 * cron(매일 새벽 3시 KST)을 기다리지 않고 즉시 최신화할 때 사용.
 *
 * 사용: npx tsx scripts/drive-sync.ts
 * 사전: .env.local 에 GOOGLE_SERVICE_ACCOUNT_JSON · GOOGLE_DRIVE_ROOT_FOLDER_ID ·
 *       NEXT_PUBLIC_SUPABASE_URL · SUPABASE_SERVICE_ROLE_KEY.
 */
import fs from 'node:fs'
import path from 'node:path'

/** .env.local 로드 (tsx 는 자동 로드 안 함). 이미 설정된 값은 덮어쓰지 않음. */
function loadEnvLocal(): void {
  const envPath = path.resolve(process.cwd(), '.env.local')
  if (!fs.existsSync(envPath)) return
  for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const line = raw.trim()
    if (!line || line.startsWith('#')) continue
    const m = /^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/.exec(line)
    if (!m) continue
    const key = m[1]
    if (process.env[key] !== undefined) continue
    let val = m[2]
    const q = val[0]
    if (val.length >= 2 && (q === '"' || q === "'") && val.at(-1) === q) {
      val = val.slice(1, -1)
    }
    process.env[key] = val
  }
}

async function main(): Promise<void> {
  loadEnvLocal()
  // getServiceSupabase 는 SUPABASE_URL 을 읽음 — .env.local 엔 NEXT_PUBLIC_ 만 있을 수 있어 보정.
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  }

  // 환경 설정 후 동적 import (모듈 로드 시점의 env 의존 회피).
  const { runDriveSync } = await import('../lib/drive/sync')

  console.log('[drive-sync] Drive 훑는 중...')
  const result = await runDriveSync()
  console.log('[drive-sync] 결과:', JSON.stringify(result, null, 2))
  process.exit(result.ok ? 0 : 1)
}

main().catch((e) => {
  console.error('[drive-sync] 실패:', e)
  process.exit(1)
})
