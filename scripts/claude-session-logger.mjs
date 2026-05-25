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

// 요약 모델 — 고품질 우선으로 Opus 4.7 사용. 'opus' 별칭 = 계정에서 쓸 수 있는 최신 Opus(=4.7).
// (특정 날짜 문자열은 계정별로 404날 수 있어 별칭이 안전. 각 PC의 claude CLI 가 Opus 접근 가능해야 함.)
const SUMMARY_MODEL = 'opus'
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

/** LLM 요약 실패 시의 안전 폴백.
 *  핵심 규칙: 원문(프롬프트·파일경로·URL·에러문자열)을 절대 제목/본문에 노출하지 않는다.
 *  - 분량 있는 세션(>=3건)이면 프로젝트·건수만 담은 중립 헤드라인을 남긴다.
 *  - 짧은 세션(<3건)이면 null 을 반환 → 호출부에서 기록 자체를 건너뛴다(쓰레기 방지). */
function heuristicSummary(items, project) {
  if (items.length < 3) return null
  const label = project ? `${project} · 작업 ${items.length}건` : `작업 ${items.length}건`
  return `${label}\n· 자동 요약을 만들지 못했습니다 (원문 비공개 · 다음 기록 때 재요약)`
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
  // 최소 PATH 환경(launchd 등)에선 node 가 없어 `claude`(내부서 node 호출)가 죽는다.
  const nodeDir = path.dirname(process.execPath)
  const augmentedPath = [nodeDir, '/usr/local/bin', '/opt/homebrew/bin', process.env.PATH || '']
    .filter(Boolean)
    .join(':')
  const opts = {
    input: prompt,
    env: { ...process.env, PATH: augmentedPath, TOTARO_LOGGER_CHILD: '1' },
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
  // LLM 요약 우선. 실패하면 폴백 — 단, 폴백은 원문을 노출하지 않고, 짧은 세션이면 null(기록 안 함).
  const summary = llmSummary(items) || heuristicSummary(items, project)

  if (dry) {
    console.log(`[dry-run] member=${member} project=${project} 지시 ${items.length}건`)
    console.log('[dry-run] summary:\n' + (summary ?? '(기록 건너뜀 — 요약 실패 + 짧은 세션)'))
    process.exit(0)
  }

  if (!summary) process.exit(0) // 요약 실패 + 짧은 세션 → 쓰레기 대신 아무것도 안 남긴다
  await postLog({ member, summary, project, sessionId, turnCount: items.length })
  process.exit(0)
}

// 세션별 기록 쓰로틀 상태 (~/.totaro/session-log-state.json: { sessionId: 마지막기록 ISO })
const SESSION_STATE_FILE = path.join(os.homedir(), '.totaro', 'session-log-state.json')
const STOP_THROTTLE_MS = 3 * 3600e3 // Stop: 같은 세션 3시간에 한 번만
const SESSIONEND_MIN_GAP_MS = 10 * 60e3 // SessionEnd: 직전 기록 10분 내면 skip(중복 방지)

function loadSessionState() {
  try {
    return JSON.parse(fs.readFileSync(SESSION_STATE_FILE, 'utf-8'))
  } catch {
    return {}
  }
}

/** 이 세션을 지금 기록해야 하나 — Stop 은 3h 쓰로틀, SessionEnd 는 막판 flush. */
function shouldLog(sessionId, event) {
  const last = loadSessionState()[sessionId]
  if (!last) return true
  const gap = Date.now() - new Date(last).getTime()
  return event === 'SessionEnd' ? gap > SESSIONEND_MIN_GAP_MS : gap > STOP_THROTTLE_MS
}

/** 세션 기록 시각을 낙관적으로 남긴다 (spawn 직전). 최근 200개만 유지. */
function recordSessionLog(sessionId) {
  try {
    const st = loadSessionState()
    st[sessionId] = new Date().toISOString()
    const trimmed = Object.fromEntries(
      Object.entries(st)
        .sort((a, b) => (a[1] < b[1] ? 1 : -1))
        .slice(0, 200)
    )
    fs.mkdirSync(path.dirname(SESSION_STATE_FILE), { recursive: true })
    fs.writeFileSync(SESSION_STATE_FILE, JSON.stringify(trimmed))
  } catch {
    // 상태 저장 실패는 무시 (다음 턴 재시도)
  }
}

/** 훅 모드 — 쓰로틀 통과 시 분리된 워커를 띄우고 즉시 종료한다. (Stop/SessionEnd 공용) */
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

  // 쓰로틀 — 같은 세션을 매 턴(Stop) 기록하지 않게. session_id 있을 때만 적용.
  const sessionId = hook.session_id || ''
  const event = hook.hook_event_name || ''
  if (sessionId) {
    if (!shouldLog(sessionId, event)) process.exit(0)
    recordSessionLog(sessionId) // 낙관적 기록 (rapid 중복 spawn 방지)
  }

  // 분리된 워커로 띄워 세션 종료/응답을 막지 않는다
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
