#!/usr/bin/env node
/**
 * Claude Code SessionEnd 훅용 로거.
 *
 * 세션이 끝나면 그 세션의 첫 지시를 요약해 totaro-worktool 의
 * claude_logs 테이블(Supabase)에 자동 기록한다.
 *
 * 사용법 (~/.claude/settings.json 의 SessionEnd 훅):
 *   node /절대경로/scripts/claude-session-logger.mjs "<멤버이름>"
 *
 * 예: node /Users/yuntaejun/dev/totaro-worktool/scripts/claude-session-logger.mjs "태준"
 */
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// totaro-worktool Supabase (anon 키는 공개용 — 클라이언트에 노출되는 키)
const SUPABASE_URL = 'https://yxijajcvxlrgoqhzadym.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWphamN2eGxyZ29xaHphZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYxMDMsImV4cCI6MjA5NDY2MjEwM30.atQqbPG2BqdR3a3CiMa7w61UJVnNtA1rYofL9ia06Qs'

const member = process.argv[2] || process.env.TOTARO_MEMBER || '알 수 없음'

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

async function main() {
  let hook = {}
  try {
    hook = JSON.parse(await readStdin())
  } catch {
    // stdin 이 비어 있으면 최근 기록으로 대체
  }

  const transcriptPath = hook.transcript_path || findLatestTranscript()
  if (!transcriptPath || !fs.existsSync(transcriptPath)) process.exit(0)

  const lines = fs.readFileSync(transcriptPath, 'utf-8').split('\n').filter(Boolean)
  const lastPrompts = []
  const userTexts = []
  let cwd = hook.cwd || ''
  let sessionId = hook.session_id || ''
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
  // last-prompt 가 있으면 그걸, 없으면(구버전 기록) user 문자열을 쓴다
  const rawPrompts = dedupedPrompts.length > 0 ? dedupedPrompts : userTexts

  // 의미 있는 지시만 추림 — 단순 응답·시스템 메시지·붙여넣은 내용 제외
  const trivial = /^(응|네|예|아니|아니오|ㄱㄱ|ㅇㅋ|오키|굳|함|ok|yes|no|이어서|continue|계속)\.?$/i
  const substantive = rawPrompts.filter((t) => {
    if (t.length < 8 || t.length > 800) return false // 너무 짧거나, 붙여넣은 듯 너무 긴 것 제외
    if (/^[⏺●⎿>[]/.test(t)) return false // 붙여넣은 Claude 출력/툴 결과 제외
    if (/[█▛▜▝▘▐▌▀▄░▒▓]/.test(t)) return false // 붙여넣은 터미널 배너/박스 출력 제외
    if (/system-reminder|This session is being continued|API Error/i.test(t)) return false
    if (trivial.test(t)) return false
    return true
  })
  if (substantive.length === 0) process.exit(0)

  // 세션의 모든 지시를 요약에 담는다 — 첫 줄은 헤드라인, 이후 줄은 지시 목록
  const clean = (t) => t.replace(/\s+/g, ' ').trim()
  const items = substantive.map(clean)
  const headline = items[0].slice(0, 140)
  const rest = items.slice(1)
  const MAX_LIST = 24
  const bullets = rest.slice(0, MAX_LIST).map((t) => `· ${t.slice(0, 110)}`)
  if (rest.length > MAX_LIST) bullets.push(`· …외 ${rest.length - MAX_LIST}건`)
  const summary = [headline, ...bullets].join('\n')
  const project = cwd ? cwd.split('/').filter(Boolean).pop() : ''

  // --dry: DB 전송 없이 만들어질 요약만 출력 (훅 설정 테스트용)
  if (process.argv.includes('--dry') || process.env.TOTARO_LOG_DRY === '1') {
    console.log(`[dry-run] member=${member} project=${project} 지시 ${substantive.length}건`)
    console.log('[dry-run] summary:\n' + summary)
    process.exit(0)
  }

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
        turn_count: substantive.length,
      }),
    })
  } catch {
    // 네트워크 실패 시 조용히 종료 (훅이 작업을 방해하지 않도록)
  }
  process.exit(0)
}

main()
