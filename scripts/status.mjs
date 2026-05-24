#!/usr/bin/env node
/**
 * totaro-worktool 운영 현황 점검 — 로그 수집 파이프라인이 살아있는지 한눈에.
 *
 *   node scripts/status.mjs
 *
 * 보여주는 것:
 *   - 멤버별 마지막 claude_log 시각 + 최근 7일 건수 (끊긴 사람 표시)
 *   - chat_raw 대기/전체 (중앙 요약기가 밀리는지)
 *   - 네이버 커머스 스냅샷 마지막 동기화 (stale 여부)
 *
 * 요구: .env.local 의 SUPABASE_SERVICE_ROLE_KEY (전체 조회용).
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nextEnv from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
nextEnv.loadEnvConfig(repoRoot, undefined, { info() {}, error: (...a) => console.error(...a) })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
if (!URL || !KEY) {
  console.error('환경변수 없음 — .env.local 확인')
  process.exit(1)
}
const headers = { apikey: KEY, Authorization: `Bearer ${KEY}` }

const HOUR = 3600e3
const DAY = 24 * HOUR

function ago(iso) {
  if (!iso) return '없음'
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < HOUR) return `${Math.floor(ms / 60000)}분 전`
  if (ms < DAY) return `${Math.floor(ms / HOUR)}시간 전`
  return `${Math.floor(ms / DAY)}일 전`
}

async function getJson(q) {
  const res = await fetch(`${URL}/rest/v1/${q}`, { headers })
  if (!res.ok) return null
  return res.json()
}

async function count(table, filter = '') {
  const res = await fetch(`${URL}/rest/v1/${table}?select=id${filter ? '&' + filter : ''}`, {
    headers: { ...headers, Prefer: 'count=exact', Range: '0-0' },
  })
  const cr = res.headers.get('content-range') || '*/?'
  return cr.split('/')[1] ?? '?'
}

async function main() {
  console.log('\n=== totaro-worktool 운영 현황 ===\n')

  // 1) 멤버별 claude_log 현황
  const logs =
    (await getJson('claude_logs?select=member,occurred_at&order=occurred_at.desc&limit=1000')) ?? []
  const byMember = new Map()
  const weekAgo = Date.now() - 7 * DAY
  for (const l of logs) {
    const m = byMember.get(l.member) ?? { last: null, week: 0 }
    if (!m.last) m.last = l.occurred_at
    if (new Date(l.occurred_at).getTime() >= weekAgo) m.week++
    byMember.set(l.member, m)
  }
  console.log('[ 멤버별 작업 기록 ]')
  if (byMember.size === 0) {
    console.log('  (기록 없음)')
  } else {
    for (const [member, m] of byMember) {
      const stale = m.last && Date.now() - new Date(m.last).getTime() > 2 * DAY
      const mark = stale ? ' ⚠️ 2일+ 끊김' : ''
      console.log(
        `  ${String(member).padEnd(8)} 마지막 ${ago(m.last).padEnd(8)} · 최근7일 ${m.week}건${mark}`
      )
    }
  }

  // 2) chat_raw 파이프라인
  console.log('\n[ 챗 원문 파이프라인 (chat_raw) ]')
  const pending = await count('chat_raw', 'summarized=eq.false')
  const total = await count('chat_raw')
  const backlog = Number(pending) > 0
  console.log(
    `  대기 ${pending} / 전체 ${total}${backlog ? '  ⚠️ 요약 대기 중 (중앙 요약기 점검)' : '  ✓ 밀린 것 없음'}`
  )

  // 3) 네이버 커머스 스냅샷
  console.log('\n[ 네이버 커머스 스냅샷 ]')
  const snap = await getJson('naver_commerce_snapshot?id=eq.1&select=synced_at,error_message')
  if (!snap || snap.length === 0) {
    console.log('  스냅샷 없음 — 워커 미실행')
  } else {
    const s = snap[0]
    const stale = s.synced_at && Date.now() - new Date(s.synced_at).getTime() > HOUR
    console.log(
      `  마지막 동기화 ${ago(s.synced_at)}${stale ? ' ⚠️ 1시간+' : ' ✓'}${s.error_message ? ` · 오류: ${s.error_message}` : ''}`
    )
  }

  // 4) 총계
  console.log('\n[ 총계 ]')
  console.log(
    `  claude_logs ${await count('claude_logs')}건 · tasks ${await count('tasks')}건 · 에이전트 ${await count('marketing_agents')}건`
  )
  console.log('')
}

await main()
