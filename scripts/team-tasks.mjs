#!/usr/bin/env node
/**
 * 토타로 업무 계획 헬퍼 — Claude Code `/계획` 슬래시 커맨드가 호출한다.
 *
 *   node scripts/team-tasks.mjs logs
 *       └ 최근 claude_logs(팀원 작업 기록)를 읽어 사람이 보기 좋게 출력한다.
 *
 *   node scripts/team-tasks.mjs add '<json>'
 *       └ <json> 배열의 할 일을 tasks 테이블에 등록한다.
 *         <json> = [{ "title": "...", "area": "마케팅 에이전트|e커머스|소싱 AI",
 *                     "assignee": "태준|준빈|승주", "description": "..." }]
 *
 * tasks 테이블 RLS 는 authenticated 전용이라, CLI 에서 쓰려면 RLS 를 우회하는
 * SUPABASE_SERVICE_ROLE_KEY 가 필요하다. 이 키는 .env.local 에만 두고(커밋 안 됨)
 * 이 스크립트에는 하드코딩하지 않는다.
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nextEnv from '@next/env'

// .env.local 을 저장소 루트 기준으로 로드 (어느 위치에서 실행하든 동작)
const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
nextEnv.loadEnvConfig(repoRoot, undefined, { info() {}, error: (...a) => console.error(...a) })

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!SUPABASE_URL || !SERVICE_KEY) {
  console.error(
    '[team-tasks] 환경변수가 없습니다.\n' +
      '.env.local 에서 SUPABASE_SERVICE_ROLE_KEY 줄 맨 앞의 "# " 를 지워 활성화하세요.'
  )
  process.exit(1)
}

const headers = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

/** Supabase REST GET. */
async function restGet(pathQuery) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, { headers })
  if (!res.ok) throw new Error(`GET ${pathQuery} → ${res.status} ${await res.text()}`)
  return res.json()
}

/** 사업영역 이름(별칭 포함) → work_areas.id */
const AREA_IDS = {
  ai_agent: ['마케팅 에이전트', '마케팅에이전트', '에이전트', 'agent'],
  ai_branding: ['e커머스', '이커머스', '커머스', 'ecommerce', '네이버'],
  b2b_sourcing: ['소싱 ai', '소싱ai', '소싱', 'sourcing', '깃허브', 'github'],
}
function resolveArea(name) {
  if (!name) return null
  const key = String(name).trim().toLowerCase()
  for (const [id, aliases] of Object.entries(AREA_IDS)) {
    if (aliases.some((a) => a.toLowerCase() === key)) return id
  }
  return null
}

/** logs 명령 — 최근 작업 기록을 출력한다. */
async function cmdLogs() {
  const rows = await restGet(
    'claude_logs?select=member,summary,project,turn_count,occurred_at' +
      '&order=occurred_at.desc&limit=40'
  )
  if (rows.length === 0) {
    console.log('아직 기록된 작업이 없습니다.')
    return
  }
  console.log(`최근 작업 기록 ${rows.length}건 (최신순):\n`)
  for (const r of rows) {
    const when = new Date(r.occurred_at).toLocaleString('ko-KR', {
      timeZone: 'Asia/Seoul',
      month: 'numeric',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    })
    const proj = r.project ? ` · ${r.project}` : ''
    const [head, ...rest] = String(r.summary ?? '').split('\n')
    console.log(`- [${r.member}] ${head}`)
    for (const line of rest) console.log(`    ${line}`)
    console.log(`    (${when} · 지시 ${r.turn_count}건${proj})`)
  }
}

/** add 명령 — 할 일을 tasks 테이블에 등록한다. */
async function cmdAdd(json) {
  if (!json) {
    console.error(
      '사용법: node scripts/team-tasks.mjs add \'[{"title":"...","area":"...","assignee":"..."}]\''
    )
    process.exit(1)
  }

  let items
  try {
    items = JSON.parse(json)
  } catch (e) {
    console.error('JSON 파싱 실패:', e.message)
    process.exit(1)
  }
  if (!Array.isArray(items) || items.length === 0) {
    console.error('등록할 할 일이 없습니다 (빈 배열).')
    process.exit(1)
  }

  const members = await restGet('members?select=id,name')
  // 표시 이름 → members 테이블 이름 별칭. 승주 계정은 '업플로우' member 로 등록돼 있어 직접 매핑.
  const MEMBER_ALIAS = { 승주: '업플로우', 송승주: '업플로우' }
  function resolveMember(name) {
    if (!name) return null
    const raw = String(name).trim()
    const n = MEMBER_ALIAS[raw] ?? raw
    return (
      members.find((m) => m.name === n)?.id ??
      members.find((m) => m.name.includes(n) || n.includes(m.name))?.id ??
      null
    )
  }

  const rows = []
  const warnings = []
  for (const it of items) {
    const title = String(it.title ?? '').trim()
    if (!title) {
      warnings.push('제목이 없는 항목을 건너뜀')
      continue
    }
    const workAreaId = resolveArea(it.area)
    if (it.area && !workAreaId) warnings.push(`"${title}": 영역 '${it.area}' 인식 불가 → 미지정`)
    const assigneeId = resolveMember(it.assignee)
    if (it.assignee && !assigneeId) warnings.push(`"${title}": 담당 '${it.assignee}' 미발견 → 미정`)
    rows.push({
      title,
      description: it.description ? String(it.description).trim() : null,
      work_area_id: workAreaId,
      assignee_id: assigneeId,
      status: 'todo',
    })
  }
  if (rows.length === 0) {
    console.error('등록 가능한 할 일이 없습니다.')
    process.exit(1)
  }

  const res = await fetch(`${SUPABASE_URL}/rest/v1/tasks`, {
    method: 'POST',
    headers: { ...headers, Prefer: 'return=representation' },
    body: JSON.stringify(rows),
  })
  if (!res.ok) {
    console.error(`등록 실패 → ${res.status} ${await res.text()}`)
    process.exit(1)
  }
  const created = await res.json()
  console.log(`✅ 할 일 ${created.length}건을 tasks 에 등록했습니다.`)
  for (const c of created) console.log(`   · ${c.title}`)
  if (warnings.length > 0) {
    console.log('\n참고:')
    for (const w of warnings) console.log(`   ⚠ ${w}`)
  }
}

const [cmd, arg] = process.argv.slice(2)
const task = cmd === 'logs' ? cmdLogs() : cmd === 'add' ? cmdAdd(arg) : null
if (!task) {
  console.error('사용법: node scripts/team-tasks.mjs <logs|add> [json]')
  process.exit(1)
}
task.catch((e) => {
  console.error('오류:', e.message)
  process.exit(1)
})
