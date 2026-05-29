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
// 고품질 우선: Opus 4.7 ('opus' 별칭 = 계정 최신 Opus). 중앙 요약은 태준 Mac(Opus 접근 가능)에서만 돎.
const SUMMARY_MODEL = 'opus'

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
  const prompt = `토타로 팀의 Claude 데스크탑 챗 작업 기록을 사장님께 보고하는 요약을 작성합니다.

[회사 맥락]
토타로는 수출 인프라가 부족한 한국 제조사가 해외 바이어를 만날 수 있게 돕는 AI 플랫폼입니다. 바이어가 자연어로 검색하면 AI가 공급사를 자동 추천하고, 인앱 채팅으로 견적·납기·발주를 협의해 실거래까지 한 채널에서 완결됩니다. 팀: 윤태준(공동창업/제품), 최준빈(리서치·BI), 송승주(개발).

[입력]
한 팀원이 Claude 데스크탑 앱에서 나눈 대화에서 추출한 텍스트 조각입니다(여러 대화·주제 섞임, 순서 무관).

[제외 대상]
- 앱 내부 설정·기능 플래그·시스템 안내문
- crisis hotline·정책 안내 같은 안전 텍스트
- 단순 인사·일상 대화·이모지만 있는 메시지
- mojibake·HTML 잔해 같은 노이즈

[출력 규칙]
1. 첫 줄: 한 문장 헤드라인 (40자 내외, 평문)
   · 결과·결정·발견 중심으로 작성
   · 능동형 동사 사용 (예: "구현했다", "결정했다", "확인했다", "분석했다", "조사했다")
   · "검토", "방법론", "수립", "도출", "방안" 같은 추상어·컨설팅 어휘 금지
   · 마크다운·별표·따옴표 사용 안 함

2. 그 다음: "· "로 시작하는 불릿 2~5개
   · 한 항목당 한 줄로 핵심만
   · 구체적 entity 보존 (제품명·회사명·도구·기능·숫자·파일·테이블 등)
   · 결정이 있으면 명시 (예: "X를 Y로 결정")
   · 의사 결정/완료/진행 중/막힌 부분이 구분되면 표현
   · 다음 작업이 있으면 마지막 불릿에 "→ 다음:" 으로 표시

3. 업무로 볼 만한 내용이 없으면 "기록할 업무성 대화 없음" 한 줄만 출력

4. 군더더기·인사말·메타 설명·코드블록 없이 헤드라인과 불릿만 출력

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

const RETAIN_DAYS = 30

/** 보존정책 — 이미 요약된(summarized=true) 원문 중 N일 지난 것을 삭제 (민감정보·용량). */
async function purgeOld() {
  const cutoff = new Date(Date.now() - RETAIN_DAYS * 86400e3).toISOString()
  const res = await fetch(
    `${URL}/rest/v1/chat_raw?summarized=eq.true&created_at=lt.${encodeURIComponent(cutoff)}`,
    { method: 'DELETE', headers: { ...svcHeaders, Prefer: 'return=minimal' } }
  )
  if (res.ok)
    console.log(`[summarize] 보존정책: 요약완료 ${RETAIN_DAYS}일 경과분 purge (${res.status})`)
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

  if (!dry) await purgeOld()
}

await main()
