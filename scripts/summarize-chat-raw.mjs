#!/usr/bin/env node
/**
 * chat_raw 중앙 요약기 — 태준 Mac 에서만 (cron/launchd).
 *
 * 비개발자 PC 들이 chat-raw-uploader 로 올린 원문(chat_raw, summarized=false)을
 * 멤버별로 모아 claude -p(Sonnet)로 사장님 보고서식 요약 → claude_logs 기록 →
 * 처리한 chat_raw 행을 summarized=true 로 표시한다.
 *
 *   node scripts/summarize-chat-raw.mjs        # 실행
 *   node scripts/summarize-chat-raw.mjs --dry  # 요약만 출력, DB 변경 없음
 *
 * 요구: .env.local 의 SUPABASE_SERVICE_ROLE_KEY (chat_raw update 용, RLS 우회) + claude CLI.
 */
import { spawnSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import nextEnv from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
nextEnv.loadEnvConfig(repoRoot, undefined, { info() {}, error: (...a) => console.error(...a) })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const SVC = process.env.SUPABASE_SERVICE_ROLE_KEY
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
const SUMMARY_MODEL = 'sonnet'

if (!URL || !SVC) {
  console.error(
    '[summarize] .env.local 에 NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 필요'
  )
  process.exit(1)
}
const svcHeaders = {
  apikey: SVC,
  Authorization: `Bearer ${SVC}`,
  'Content-Type': 'application/json',
}

function summarize(chunks) {
  const MAX = 80
  let sample = chunks
  if (chunks.length > MAX) {
    const step = chunks.length / MAX
    sample = Array.from({ length: MAX }, (_, k) => chunks[Math.floor(k * step)])
  }
  const body = sample.map((c) => `- ${c.slice(0, 300)}`).join('\n')
  const prompt = `다음은 한 직원이 Claude 데스크탑 앱에서 나눈 대화에서 추출한 텍스트 조각이야 (여러 대화·주제 섞임, 순서 뒤섞임). 회사 사장님께 보고하듯 한국어로 요약해줘.

중요: 앱 내부 설정·기능 플래그·시스템 안내문 같은 "대화가 아닌" 데이터가 섞여 있을 수 있어. 그건 무시하고 "실제로 작업·논의한 업무 주제"만 요약해.

- 첫 줄: 다룬 실제 업무 한 문장 헤드라인 (40자 내외, 평문)
- 그 다음: 주제별로 묶어 핵심 2~5개를 "· "로 시작하는 불릿
- 업무로 볼 만한 내용 없으면 "기록할 업무성 대화 없음" 한 줄만
- 군더더기 없이 출력

[추출 텍스트]
${body}`

  const args = [
    '-p',
    '--model',
    SUMMARY_MODEL,
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
  ]
  const nodeDir = path.dirname(process.execPath)
  const augmentedPath = [nodeDir, '/usr/local/bin', '/opt/homebrew/bin', process.env.PATH || '']
    .filter(Boolean)
    .join(':')
  const opts = {
    input: prompt,
    env: { ...process.env, PATH: augmentedPath, TOTARO_LOGGER_CHILD: '1' },
    cwd: '/tmp',
    timeout: 90000,
    encoding: 'utf-8',
    maxBuffer: 4 * 1024 * 1024,
  }
  for (const bin of ['claude', '/usr/local/bin/claude', '/opt/homebrew/bin/claude']) {
    const res = spawnSync(bin, args, opts)
    if (res.error) {
      if (res.error.code === 'ENOENT') continue
      return null
    }
    if (res.status !== 0 || !res.stdout) return null
    const out = String(res.stdout).trim()
    if (!out || /API Error|not_found_error|"type"\s*:\s*"error"/i.test(out)) return null
    return (
      out
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .trim() || null
    )
  }
  return null
}

async function postLog({ member, summary, turnCount }) {
  // 기록은 anon insert 정책으로 (claude_logs)
  const res = await fetch(`${URL}/rest/v1/claude_logs`, {
    method: 'POST',
    headers: {
      apikey: ANON,
      Authorization: `Bearer ${ANON}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      member,
      summary,
      project: 'Claude 챗',
      session_id: `chat-${member}-${new Date().toISOString().slice(0, 10)}`,
      turn_count: turnCount,
    }),
  })
  return res.status
}

async function markSummarized(ids) {
  // service_role 로 RLS 우회 update
  const res = await fetch(`${URL}/rest/v1/chat_raw?id=in.(${ids.join(',')})`, {
    method: 'PATCH',
    headers: { ...svcHeaders, Prefer: 'return=minimal' },
    body: JSON.stringify({ summarized: true }),
  })
  return res.status
}

async function main() {
  const dry = process.argv.includes('--dry')

  const res = await fetch(
    `${URL}/rest/v1/chat_raw?summarized=eq.false&select=id,member,content&order=created_at.asc&limit=4000`,
    { headers: svcHeaders }
  )
  if (!res.ok) {
    const txt = await res.text()
    if (/PGRST205|does not exist|schema cache/.test(txt)) {
      console.error(
        '[summarize] chat_raw 테이블이 없습니다 — supabase/chat-raw.sql 먼저 실행하세요.'
      )
      process.exit(0)
    }
    console.error('[summarize] chat_raw 조회 실패:', res.status, txt.slice(0, 160))
    process.exit(1)
  }
  const pending = await res.json()
  if (pending.length === 0) {
    console.log('[summarize] 요약할 새 원문 없음')
    process.exit(0)
  }

  // 멤버별로 묶기
  const byMember = new Map()
  for (const r of pending) {
    const arr = byMember.get(r.member) ?? []
    arr.push(r)
    byMember.set(r.member, arr)
  }
  console.log(`[summarize] 대기 ${pending.length}건 · 멤버 ${byMember.size}명`)

  for (const [member, rowsForMember] of byMember) {
    const chunks = rowsForMember.map((r) => r.content)
    const ids = rowsForMember.map((r) => r.id)
    const summary = summarize(chunks)
    if (!summary) {
      console.error(`[summarize] ${member}: claude 요약 실패 — 건너뜀 (다음에 재시도)`)
      continue
    }
    // 업무성 내용이 없다고 판정되면 claude_logs 에 기록하지 않고, 재처리 방지 위해 표시만.
    const noWork = summary.replace(/\s/g, '').includes('기록할업무성대화없음')

    if (dry) {
      console.log(`\n[dry-run] ${member} (${chunks.length}건):\n${summary}`)
      continue
    }
    if (noWork) {
      const mk = await markSummarized(ids)
      console.log(
        `[summarize] • ${member}: 업무성 대화 없음 → 기록 생략, ${ids.length}건 처리표시 (mark ${mk})`
      )
      continue
    }
    const st = await postLog({ member, summary, turnCount: chunks.length })
    if (st === 201 || st === 204) {
      const mk = await markSummarized(ids)
      console.log(
        `[summarize] ✅ ${member}: claude_logs 기록 + ${ids.length}건 처리완료 (mark ${mk})`
      )
    } else {
      console.error(`[summarize] ${member}: claude_logs 기록 실패 (HTTP ${st}) — 미처리 유지`)
    }
  }
}

await main()
