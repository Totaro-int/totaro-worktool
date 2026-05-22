#!/usr/bin/env node
/**
 * Claude Code SessionEnd 훅용 로거.
 *
 * 세션이 끝나면 그 세션의 작업 내용을 "사장님 보고서" 식으로 요약해
 * totaro-worktool 의 claude_logs 테이블(Supabase)에 자동 기록한다.
 *
 * 사용법 (~/.claude/settings.json 의 SessionEnd 훅):
 *   node /절대경로/scripts/claude-session-logger.mjs "<멤버이름>"
 *
 * 예: node /Users/yuntaejun/dev/totaro-worktool/scripts/claude-session-logger.mjs "태준"
 *
 * 동작 구조:
 *   1) 훅 모드(기본) — 트랜스크립트 경로만 잡아 분리된 워커를 띄우고 즉시 종료한다.
 *      (세션 종료를 막지 않도록 LLM 호출은 백그라운드에서 한다)
 *   2) 워커 모드(--worker) — 지시를 추출해 `claude -p` 로 보고서식 요약을 만들고,
 *      실패하면 휴리스틱 요약으로 폴백한 뒤 claude_logs 에 기록한다.
 *
 * 재귀 방지: 요약용으로 띄운 `claude -p` 세션이 끝나며 또 이 훅을 부르는 것을 막기 위해,
 * 요약 호출 시 TOTARO_LOGGER_CHILD=1 을 넘기고 훅 모드 진입 시 그 값을 확인해 즉시 종료한다.
 *
 * 디버그: `node scripts/claude-session-logger.mjs "태준" --dry` 로 DB 전송 없이 요약만 확인.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// totaro-worktool Supabase (anon 키는 공개용 — 클라이언트에 노출되는 키)
const SUPABASE_URL = 'https://yxijajcvxlrgoqhzadym.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWphamN2eGxyZ29xaHphZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYxMDMsImV4cCI6MjA5NDY2MjEwM30.atQqbPG2BqdR3a3CiMa7w61UJVnNtA1rYofL9ia06Qs'

// 요약 모델 — Haiku 3.5 는 이 계정 미지원(404)이라 sonnet 별칭 사용.
const SUMMARY_MODEL = 'sonnet'
const SCRIPT_PATH = fileURLToPath(import.meta.url)

/** 훅이 stdin 으로 넘기는 JSON 을 읽는다. 없으면 1초 후 빈 문자열. */
function readStdin() {
  return new Promise((resolve) => {
    let data = ''
    process.stdin.on('data', (c) => {
      data += c
    })
    process.stdin.on('end', () => resolve(data))
    setTimeout(() => resolve(data), 1000)
  })
}

/** ~/.claude/projects 에서 가장 최근 세션 기록 파일을 찾는다 (훅 입력이 없을 때 대비). */
function findLatestTranscript() {
  const base = path.join(os.homedir(), '.claude', 'projects')
  if (!fs.existsSync(base)) return null
  let latest = null
  let latestMtime = 0
  for (const dir of fs.readdirSync(base)) {
    const dirPath = path.join(base, dir)
    if (!fs.statSync(dirPath).isDirectory()) continue
    for (const file of fs.readdirSync(dirPath)) {
      if (!file.endsWith('.jsonl')) continue
      const filePath = path.join(dirPath, file)
      const mtime = fs.statSync(filePath).mtimeMs
      if (mtime > latestMtime) {
        latestMtime = mtime
        latest = filePath
      }
    }
  }
  return latest
}

/** 트랜스크립트에서 의미 있는 사용자 지시 목록 + cwd + sessionId 를 뽑는다. */
function extractInstructions(transcriptPath) {
  const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(Boolean)
  const lastPrompts = []
  const userTexts = []
  let cwd = ''
  let sessionId = ''
  for (const line of lines) {
    let event
    try {
      event = JSON.parse(line)
    } catch {
      continue
    }
    if (!cwd && event.cwd) cwd = event.cwd
    if (!sessionId && event.sessionId) sessionId = event.sessionId
    // last-prompt 이벤트 = 사용자가 친 프롬프트 원문 (가장 깔끔하고 누락이 적음)
    if (event.type === 'last-prompt' && typeof event.lastPrompt === 'string') {
      lastPrompts.push(event.lastPrompt.trim())
    }
    // 구버전 기록 대비 — user 메시지의 문자열 content 도 보조로 수집
    if (event.type === 'user' && event.message && typeof event.message.content === 'string') {
      userTexts.push(event.message.content.trim())
    }
  }

  // last-prompt 는 같은 값이 연속 중복 기록될 수 있어 연속 중복만 제거
  const dedupedPrompts = []
  for (const t of lastPrompts) {
    if (t && t !== dedupedPrompts[dedupedPrompts.length - 1]) dedupedPrompts.push(t)
  }
  const rawPrompts = dedupedPrompts.length > 0 ? dedupedPrompts : userTexts

  // 의미 있는 지시만 추림 — 단순 응답·시스템 메시지·붙여넣은 내용 제외
  const trivial = /^(응|네|예|아니|아니오|ㄱㄱ|ㅇㅋ|오키|굳|함|ok|yes|no|이어서|continue|계속)\.?$/i
  const clean = (t) => t.replace(/\s+/g, ' ').trim()
  const items = rawPrompts
    .filter((t) => {
      if (t.length < 8 || t.length > 800) return false
      if (/^[⏺●⎿>[]/.test(t)) return false
      if (/[█▛▜▝▘▐▌▀▄░▒▓]/.test(t)) return false
      if (/system-reminder|This session is being continued|API Error/i.test(t)) return false
      if (trivial.test(t)) return false
      return true
    })
    .map(clean)

  return { items, cwd, sessionId }
}

/** 휴리스틱 폴백 요약 — LLM 호출 실패 시 사용 (헤드라인 + 지시 목록). */
function heuristicSummary(items) {
  const headline = items[0].slice(0, 140)
  const rest = items.slice(1)
  const MAX_LIST = 12
  const bullets = rest.slice(0, MAX_LIST).map((t) => `· ${t.slice(0, 110)}`)
  if (rest.length > MAX_LIST) bullets.push(`· …외 ${rest.length - MAX_LIST}건`)
  return [headline, ...bullets].join('\n')
}

/** claude CLI 로 보고서식 요약을 만든다. 실패하면 null. */
function llmSummary(items) {
  const list = items
    .slice(0, 40)
    .map((t) => `- ${t.slice(0, 200)}`)
    .join('\n')
  const prompt = `다음은 한 작업 세션에서 사용자가 Claude에게 준 지시 목록이야. 회사 사장님께 보고하듯 한국어로 요약해줘.
- 첫 줄: 이 세션에서 한 일을 한 문장 헤드라인 (40자 내외, 결과/주제 중심, 마크다운·별표 없이 평문)
- 그 다음: 핵심 성과/작업 2~4개를 "· "로 시작하는 불릿
- 지시문을 그대로 나열하지 말고, 무엇을 했는지 결과 중심으로 묶어서
- 군더더기·인사말·코드블록 없이 헤드라인과 불릿만 출력

[지시 목록]
${list}`

  const args = [
    '-p',
    '--model',
    SUMMARY_MODEL,
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
  ]
  const opts = {
    input: prompt,
    env: { ...process.env, TOTARO_LOGGER_CHILD: '1' },
    cwd: os.tmpdir(),
    timeout: 90000,
    encoding: 'utf-8',
    maxBuffer: 4 * 1024 * 1024,
  }
  // PATH 에 claude 가 없을 수 있어 흔한 설치 위치도 순서대로 시도
  const candidates = [
    'claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.claude/local/claude'),
  ]
  for (const bin of candidates) {
    const res = spawnSync(bin, args, opts)
    if (res.error) {
      if (res.error.code === 'ENOENT') continue // 다음 후보 경로 시도
      return null
    }
    if (res.status !== 0 || !res.stdout) return null
    let out = String(res.stdout).trim()
    if (!out || /API Error|not_found_error|"type"\s*:\s*"error"/i.test(out)) return null
    out = out
      .replace(/\*\*/g, '')
      .replace(/^#+\s*/gm, '')
      .trim()
    return out || null
  }
  return null
}

/** claude_logs 에 한 건 기록한다. */
async function postLog({ member, summary, project, sessionId, turnCount }) {
  try {
    await fetch(`${SUPABASE_URL}/rest/v1/claude_logs`, {
      method: 'POST',
      headers: {
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
        'Content-Type': 'application/json',
        Prefer: 'return=minimal',
      },
      body: JSON.stringify({
        member,
        summary,
        project,
        session_id: sessionId,
        turn_count: turnCount,
      }),
    })
  } catch {
    // 네트워크 실패 시 조용히 종료
  }
}

/** 워커 모드 — 무거운 작업(요약 + 기록)을 백그라운드에서 수행한다. */
async function runWorker(member, transcriptPath, dry) {
  if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0)
  const { items, cwd, sessionId } = extractInstructions(transcriptPath)
  if (items.length === 0) process.exit(0)

  const project = cwd ? cwd.split('/').filter(Boolean).pop() : ''
  const summary = llmSummary(items) || heuristicSummary(items)

  if (dry) {
    console.log(`[dry-run] member=${member} project=${project} 지시 ${items.length}건`)
    console.log('[dry-run] summary:\n' + summary)
    process.exit(0)
  }

  await postLog({ member, summary, project, sessionId, turnCount: items.length })
  process.exit(0)
}

/** 훅 모드 — 트랜스크립트 경로만 잡아 분리된 워커를 띄우고 즉시 종료한다. */
async function runHook(member, dry) {
  let hook = {}
  try {
    hook = JSON.parse(await readStdin())
  } catch {
    // stdin 이 비어 있으면 최근 기록으로 대체
  }
  const transcriptPath = hook.transcript_path || findLatestTranscript()
  if (!transcriptPath) process.exit(0)

  // --dry 는 출력이 보여야 하므로 워커를 인라인으로 실행
  if (dry) {
    await runWorker(member, transcriptPath, true)
    return
  }

  // 평소엔 분리된 워커로 띄워 세션 종료를 막지 않는다
  const child = spawn(process.execPath, [SCRIPT_PATH, '--worker', member, transcriptPath], {
    detached: true,
    stdio: 'ignore',
    env: process.env,
  })
  child.unref()
  process.exit(0)
}

async function main() {
  const argv = process.argv.slice(2)
  const dry = argv.includes('--dry') || process.env.TOTARO_LOG_DRY === '1'
  const workerIdx = argv.indexOf('--worker')

  if (workerIdx !== -1) {
    // 워커 모드: --worker <member> <transcriptPath>
    const member = argv[workerIdx + 1] || process.env.TOTARO_MEMBER || '알 수 없음'
    const transcriptPath = argv[workerIdx + 2]
    await runWorker(member, transcriptPath, dry)
    return
  }

  // 훅 모드 — 재귀 방지: 요약용 claude 세션이 부른 경우 즉시 종료
  if (process.env.TOTARO_LOGGER_CHILD === '1') process.exit(0)

  const member =
    argv[0] && !argv[0].startsWith('--') ? argv[0] : process.env.TOTARO_MEMBER || '알 수 없음'
  await runHook(member, dry)
}

main()
