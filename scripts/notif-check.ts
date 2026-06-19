#!/usr/bin/env tsx
/**
 * 우편실 알림 상태 점검 — notifications 테이블 실측.
 * 사용: npx tsx scripts/notif-check.ts
 */
import fs from 'node:fs'
import path from 'node:path'

/** .env.local 로드 (tsx 는 자동 로드 안 함). 이미 설정된 값은 안 덮음. */
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
    if (val.length >= 2 && (q === '"' || q === "'") && val.at(-1) === q) val = val.slice(1, -1)
    process.env[key] = val
  }
}

async function main(): Promise<void> {
  loadEnvLocal()
  if (!process.env.SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_URL) {
    process.env.SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
  }
  const { getServiceSupabase } = await import('../lib/oauth/utils')
  const sb = getServiceSupabase()

  const { count: total } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
  const { count: unread } = await sb
    .from('notifications')
    .select('*', { count: 'exact', head: true })
    .is('read_at', null)
  const { data: recent } = await sb
    .from('notifications')
    .select('type, title, created_at, read_at')
    .order('created_at', { ascending: false })
    .limit(5)

  // 최근 7일 새 우편(inbox_documents) — 알림이 떴어야 할 후보 비교용
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { count: totalDocs } = await sb
    .from('inbox_documents')
    .select('*', { count: 'exact', head: true })
  const { count: newDocs } = await sb
    .from('inbox_documents')
    .select('*', { count: 'exact', head: true })
    .gte('created_at', weekAgo)

  console.log('=== notifications ===')
  console.log('총:', total ?? 0, '| 안읽음:', unread ?? 0)
  console.log('최근 5건:', JSON.stringify(recent ?? [], null, 2))
  console.log('=== inbox_documents (비교) ===')
  console.log('총:', totalDocs ?? 0, '| 최근 7일 신규:', newDocs ?? 0)
  process.exit(0)
}

main().catch((e) => {
  console.error('[notif-check] 실패:', e)
  process.exit(1)
})
