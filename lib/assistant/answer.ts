/**
 * AI 직원 — 답변 생성 레이어.
 *
 * 검색된 회사 자료(docs)를 근거로 "진짜 동료처럼" 자연어로 답한다.
 *
 * 세 가지 경로로 답변을 생성한다 (이 순서로 폴백):
 *   1) GOOGLE_SERVICE_ACCOUNT_JSON 이 있으면 Google Gemini(Vertex AI) — Drive 와 같은
 *      서비스계정 재사용(새 키 불필요, 현금 0), Vercel 서버리스에서도 동작. (기본 경로)
 *   2) ANTHROPIC_API_KEY 가 있으면 Anthropic Messages API — 서버리스에서도 동작.
 *   3) 둘 다 없으면 로컬 `claude` CLI(구독) — 태준 Mac 로컬에서만 동작, classify.ts 와 같은 방식.
 * 채팅은 상호작용이라 spawnSync(블로킹) 대신 async spawn / fetch 로 이벤트 루프를 막지 않는다.
 *
 * 모두 실패하면 available=false → 호출부가 자료 카드로 우아하게 폴백.
 */
import { spawn } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

import { generateGemini, streamGemini } from './gemini'

import type { RetrievedDoc } from './retrieve'

const MODEL = 'opus'
const TIMEOUT_MS = 120_000
const EXCERPT_MAX = 1500
const WORKLOG_SUMMARY_MAX = 300

// Anthropic Messages API (프로덕션 경로) — ANTHROPIC_API_KEY 가 있을 때만 사용.
// 모델은 ANTHROPIC_MODEL 로 덮어쓸 수 있음(기본: 비용/품질 균형 좋은 Sonnet 4.6).
const API_URL = 'https://api.anthropic.com/v1/messages'
const API_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-4-6'
const API_MAX_TOKENS = 2048

export type DocWithExcerpt = RetrievedDoc & { excerpt?: string }

/** 팀 작업 기록(claude_logs) 한 건 — 누가 언제 무슨 작업을 했는지. */
export type WorkLog = {
  member: string
  summary: string
  project: string | null
  occurredAt: string
}

export type ChatTurn = { role: 'user' | 'assistant'; content: string }

export type AnswerResult = {
  /** 실제 답변을 생성했는지. false 면 호출부가 자료만 보여줌. */
  available: boolean
  text: string
  method: 'gemini' | 'api' | 'claude' | 'unavailable' | 'error'
}

/** 스트리밍 이벤트 — route 가 NDJSON 으로 클라이언트에 전달. */
export type StreamEvent =
  | { type: 'delta'; text: string }
  | { type: 'done'; method: 'gemini' | 'api' | 'claude' }

export async function generateAnswer(opts: {
  question: string
  history: ChatTurn[]
  docs: DocWithExcerpt[]
  members?: string[]
  workLogs?: WorkLog[]
  /** 'kim-sahyun' 이면 김사현(마케팅 애널리스트) 페르소나로 답한다. 없으면 일반 AI 동료. */
  persona?: string
}): Promise<AnswerResult> {
  const prompt = buildChatPrompt(opts)

  // 1) Google Gemini(Vertex AI) — Drive 와 같은 서비스계정 재사용, 서버리스에서도 동작. (기본)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const viaGemini = await generateGemini(prompt)
    if (viaGemini.available) return viaGemini
  }

  // 2) API 키 있으면 Anthropic API (서버리스에서도 동작). 실패하면 CLI 로 폴백.
  if (process.env.ANTHROPIC_API_KEY) {
    const viaApi = await runAnthropicApi(prompt)
    if (viaApi.available) return viaApi
  }

  // 3) 로컬 claude CLI (구독)
  return runClaude(prompt)
}

/**
 * 스트리밍 답변 — 토큰을 생성되는 대로 yield 한다.
 * 경로 폴백은 generateAnswer 와 동일: API → CLI.
 * 반환값(boolean) = 실제로 답변 텍스트를 만들었는지(false 면 호출부가 자료만 보여줌).
 */
export async function* streamAnswer(opts: {
  question: string
  history: ChatTurn[]
  docs: DocWithExcerpt[]
  members?: string[]
  workLogs?: WorkLog[]
  /** 'kim-sahyun' 이면 김사현(마케팅 애널리스트) 페르소나로 답한다. 없으면 일반 AI 동료. */
  persona?: string
}): AsyncGenerator<StreamEvent, boolean> {
  const prompt = buildChatPrompt(opts)

  // 1) Google Gemini(Vertex AI) 스트리밍 — 서비스계정 재사용. 시작 전 실패면 다음으로 폴백. (기본)
  if (process.env.GOOGLE_SERVICE_ACCOUNT_JSON) {
    const ok = yield* streamGemini(prompt)
    if (ok) return true
  }

  // 2) API 키 있으면 Anthropic API 스트리밍. 텍스트 나오기 전에 실패하면 CLI 로 폴백.
  if (process.env.ANTHROPIC_API_KEY) {
    const ok = yield* streamAnthropicApi(prompt)
    if (ok) return true
  }

  // 3) 로컬 claude CLI 스트리밍
  return yield* streamClaudeCli(prompt)
}

function buildChatPrompt(opts: {
  question: string
  history: ChatTurn[]
  docs: DocWithExcerpt[]
  members?: string[]
  workLogs?: WorkLog[]
  persona?: string
}): string {
  const { question, history, docs, members, workLogs, persona } = opts

  const memberLine = members && members.length ? `\n- 멤버: ${members.join(', ')}` : ''

  const docBlock =
    docs.length > 0
      ? docs.map((d, i) => renderDoc(d, i + 1)).join('\n\n')
      : '(관련 자료를 못 찾음 — 우편실에 아직 해당 자료가 없을 수 있음)'

  const logBlock =
    workLogs && workLogs.length > 0
      ? workLogs.map(renderWorkLog).join('\n')
      : '(관련 작업 기록 없음)'

  const historyBlock =
    history.length > 0
      ? history
          .slice(-6)
          .map((h) => `${h.role === 'user' ? '동료' : '나'}: ${h.content}`)
          .join('\n')
      : '(첫 질문)'

  const company = `[회사]
- 토타로 = AI 브랜드 스튜디오. AI 에이전트로 우리 브랜드를 키우고, 검증된 도구만 판다.
- 지금 본진: 모네하우스(리빙·가구 큐레이션 브랜드). 7/31 북극성 = 장바구니→결제 전환.
- 팀: 윤태준(대표/제품), 최준빈(리서치·BI), 송승주(개발)${memberLine}`

  const isKim = persona === 'kim-sahyun'
  const identity = isKim
    ? `너는 토타로 마케팅부 AI 직원 '김사현'이야. 데이터 기반 마케팅 애널리스트.
사장(윤태준)에게 진짜 동료 직원처럼 보고하고 대화해. 모네하우스 전환·매출을 늘릴
마케팅·콘텐츠·경쟁사·트렌드를 데이터로 분석해 답한다. 매일 마케팅 분석 보고서를 쓰는 게 네 일이고,
그 근거는 아래 우편실 자료(특히 '마케팅 분석' 폴더)에서 찾을 수 있어.`
    : `너는 토타로(Totaro) 팀의 AI 동료 직원이야. 사람 동료처럼 자연스럽고 친근하게, 하지만 정확하게 대답해.`

  return `${identity}

${company}

[네가 접근 가능한 회사 자료 — 구글 드라이브 우편실에서 이 질문으로 검색한 결과]
${docBlock}

[팀 작업 기록 — 팀원들의 Claude Code 작업 로그에서 이 질문으로 검색한 결과]
${logBlock}

[지금까지 대화]
${historyBlock}

[${isKim ? '사장님' : '동료'}의 질문]
${question}

[답변 방법]
- 한국어로, ${isKim ? '직원이 사장에게 보고하듯 또렷하게' : '진짜 옆자리 동료처럼 자연스럽게'} 말해.
- 위 자료에서 근거를 찾으면 해당 문장 끝에 [번호] 로 출처를 표시해.
- 팀 작업 기록을 근거로 쓸 땐 누가 언제 한 작업인지 자연스럽게 풀어서 말해. [번호] 인용은 회사 자료에만.
- 자료에도 작업 기록에도 없는 내용은 지어내지 마. "그건 아직 자료에 안 보여요"처럼 솔직하게.
- 추측이면 추측이라고 밝혀.
- 너무 길게 늘어놓지 말고 핵심부터.${isKim ? ' 숫자·데이터로 말하고, 끝에 "👉 오늘 추천 액션 1개"를 붙여.' : ' 마크다운 헤더(#)는 쓰지 말고 자연스러운 문장으로.'}`
}

function renderDoc(d: DocWithExcerpt, n: number): string {
  const meta = [d.docType, d.folderPath].filter(Boolean).join(' · ')
  const lines: string[] = []
  lines.push(`[${n}] ${d.filename}${meta ? ` — ${meta}` : ''}`)
  if (d.description) lines.push(`요약: ${d.description}`)
  // ai_reasoning 은 링크(http...)가 아닐 때만 맥락으로(=Gmail 보낸사람|제목).
  if (d.aiReasoning && !/^https?:\/\//i.test(d.aiReasoning)) {
    lines.push(`맥락: ${d.aiReasoning}`)
  }
  if (d.excerpt) lines.push(`본문 발췌: ${d.excerpt.slice(0, EXCERPT_MAX)}`)
  return lines.join('\n')
}

/** 작업 기록 한 줄 렌더 — "- 2026-06-10 송승주 (totaro-worktool): 요약". */
function renderWorkLog(l: WorkLog): string {
  const date = l.occurredAt.slice(0, 10)
  const project = l.project ? ` (${l.project})` : ''
  return `- ${date} ${l.member}${project}: ${l.summary.slice(0, WORKLOG_SUMMARY_MAX)}`
}

// ============================================================
// Anthropic Messages API 호출 (프로덕션 경로)
// ============================================================

type ApiResponse = { content?: Array<{ type: string; text?: string }> }

async function runAnthropicApi(prompt: string): Promise<AnswerResult> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return { available: false, text: '', method: 'unavailable' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: API_MODEL,
        max_tokens: API_MAX_TOKENS,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[assistant] Anthropic API ${res.status}: ${detail.slice(0, 300)}`)
      return { available: false, text: '', method: 'error' }
    }

    const data = (await res.json()) as ApiResponse
    const text = (data.content ?? [])
      .filter((b) => b.type === 'text' && b.text)
      .map((b) => b.text as string)
      .join('')
      .trim()

    if (!text) return { available: false, text: '', method: 'error' }
    return { available: true, text: stripFences(text), method: 'api' }
  } catch (e) {
    // 타임아웃(abort) 포함 — 조용히 CLI/폴백으로 넘어감
    console.error('[assistant] Anthropic API 호출 실패:', e)
    return { available: false, text: '', method: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * Anthropic API 스트리밍 (SSE).
 * 텍스트 델타를 yield. 반환값 = 답변 텍스트를 하나라도 만들었는지.
 * 시작 전에 실패하면 false 를 돌려 호출부가 CLI 로 폴백하게 한다.
 */
async function* streamAnthropicApi(prompt: string): AsyncGenerator<StreamEvent, boolean> {
  const apiKey = process.env.ANTHROPIC_API_KEY
  if (!apiKey) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let any = false
  try {
    const res = await fetch(API_URL, {
      method: 'POST',
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
        'content-type': 'application/json',
      },
      body: JSON.stringify({
        model: API_MODEL,
        max_tokens: API_MAX_TOKENS,
        stream: true,
        messages: [{ role: 'user', content: prompt }],
      }),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error(`[assistant] Anthropic API ${res.status}: ${detail.slice(0, 300)}`)
      }
      return false
    }

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
      let idx: number
      while ((idx = buf.indexOf('\n\n')) !== -1) {
        const rawEvent = buf.slice(0, idx)
        buf = buf.slice(idx + 2)
        const text = parseSseDelta(rawEvent)
        if (text) {
          any = true
          yield { type: 'delta', text }
        }
      }
    }

    if (any) yield { type: 'done', method: 'api' }
    return any
  } catch (e) {
    console.error('[assistant] Anthropic API 스트리밍 실패:', e)
    // 이미 텍스트를 흘렸으면 폴백 금지(중복 방지) → true, 아니면 CLI 폴백 허용 → false
    return any
  } finally {
    clearTimeout(timer)
  }
}

/** SSE 이벤트 블록에서 text_delta 텍스트만 뽑는다. */
function parseSseDelta(rawEvent: string): string {
  let out = ''
  for (const line of rawEvent.split('\n')) {
    const m = /^data:\s?(.*)$/.exec(line)
    if (!m) continue
    const payload = m[1]
    if (!payload || payload === '[DONE]') continue
    try {
      const obj = JSON.parse(payload) as {
        type?: string
        delta?: { type?: string; text?: string }
      }
      if (
        obj?.type === 'content_block_delta' &&
        obj?.delta?.type === 'text_delta' &&
        typeof obj.delta.text === 'string'
      ) {
        out += obj.delta.text
      }
    } catch {
      // 부분 JSON — 다음 청크에서 이어짐
    }
  }
  return out
}

// ============================================================
// claude CLI 호출 (async, non-blocking)
// ============================================================

const ARGS = ['-p', '--model', MODEL, '--strict-mcp-config', '--mcp-config', '{"mcpServers":{}}']

// 스트리밍용 — stream-json + partial messages 로 토큰 델타를 실시간으로 받는다.
const ARGS_STREAM = [
  '-p',
  '--model',
  MODEL,
  '--output-format',
  'stream-json',
  '--include-partial-messages',
  '--verbose',
  '--strict-mcp-config',
  '--mcp-config',
  '{"mcpServers":{}}',
]

function augmentedPath(): string {
  const nodeDir = path.dirname(process.execPath)
  return [nodeDir, '/usr/local/bin', '/opt/homebrew/bin', process.env.PATH || '']
    .filter(Boolean)
    .join(':')
}

function candidates(): string[] {
  return [
    'claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.claude/local/claude'),
  ]
}

async function runClaude(prompt: string): Promise<AnswerResult> {
  const PATH = augmentedPath()
  for (const bin of candidates()) {
    const r = await trySpawn(bin, prompt, PATH)
    if (r.kind === 'enoent') continue // 이 경로엔 없음 → 다음 후보
    if (r.kind === 'ok') {
      const raw = r.stdout.trim()
      if (!raw || /API Error|not_found_error/i.test(raw)) {
        return { available: false, text: '', method: 'error' }
      }
      return { available: true, text: stripFences(raw), method: 'claude' }
    }
    // spawn 은 됐는데 비정상 종료/타임아웃 → 폴백
    return { available: false, text: '', method: 'error' }
  }
  return { available: false, text: '', method: 'unavailable' }
}

/**
 * claude CLI 스트리밍 — stream-json(NDJSON) 출력을 파싱해 토큰 델타를 yield.
 * 파셜 메시지가 없으면 최종 result 텍스트로 한 번에 대체(구버전 CLI 안전망).
 * 반환값 = 답변 텍스트를 하나라도 만들었는지.
 */
async function* streamClaudeCli(prompt: string): AsyncGenerator<StreamEvent, boolean> {
  const PATH = augmentedPath()
  for (const bin of candidates()) {
    const child = spawn(bin, ARGS_STREAM, {
      env: { ...process.env, PATH, TOTARO_LOGGER_CHILD: '1' },
      cwd: os.tmpdir(),
    })

    // spawn 성공/실패(ENOENT) 판별 — 실패면 다음 후보로
    const spawned = await new Promise<boolean>((resolve) => {
      child.once('spawn', () => resolve(true))
      child.once('error', () => resolve(false))
    })
    if (!spawned) continue

    const timer = setTimeout(() => child.kill('SIGKILL'), TIMEOUT_MS)
    child.stdin.write(prompt)
    child.stdin.end()

    let buf = ''
    let sawDelta = false
    let resultText = ''
    try {
      for await (const chunk of child.stdout) {
        buf += String(chunk)
        let nl: number
        while ((nl = buf.indexOf('\n')) !== -1) {
          const line = buf.slice(0, nl).trim()
          buf = buf.slice(nl + 1)
          if (!line) continue
          const parsed = parseCliLine(line)
          if (parsed.delta) {
            sawDelta = true
            yield { type: 'delta', text: parsed.delta }
          } else if (parsed.result) {
            resultText = parsed.result
          }
        }
      }
    } finally {
      clearTimeout(timer)
    }

    // 파셜 델타가 없었으면 최종 result 전체로 대체(한 번에)
    if (!sawDelta && resultText) {
      sawDelta = true
      yield { type: 'delta', text: resultText }
    }

    if (sawDelta) {
      yield { type: 'done', method: 'claude' }
      return true
    }
    return false // spawn 은 됐는데 출력 없음 → 폴백(자료 카드)
  }
  return false // 후보 전부 없음(CLI 미설치)
}

/** claude CLI 의 stream-json 한 줄에서 델타 텍스트 또는 최종 result 를 뽑는다. */
function parseCliLine(line: string): { delta?: string; result?: string } {
  try {
    const obj = JSON.parse(line) as {
      type?: string
      event?: { type?: string; delta?: { type?: string; text?: string } }
      subtype?: string
      result?: string
    }
    if (
      obj.type === 'stream_event' &&
      obj.event?.type === 'content_block_delta' &&
      obj.event.delta?.type === 'text_delta' &&
      typeof obj.event.delta.text === 'string'
    ) {
      return { delta: obj.event.delta.text }
    }
    if (obj.type === 'result' && obj.subtype === 'success' && typeof obj.result === 'string') {
      return { result: obj.result }
    }
  } catch {
    // 부분/비정상 JSON 라인 — 무시
  }
  return {}
}

type SpawnOutcome =
  | { kind: 'ok'; stdout: string }
  | { kind: 'enoent' }
  | { kind: 'error'; msg: string }

function trySpawn(bin: string, input: string, PATH: string): Promise<SpawnOutcome> {
  return new Promise((resolve) => {
    let settled = false
    const done = (o: SpawnOutcome): void => {
      if (settled) return
      settled = true
      clearTimeout(timer)
      resolve(o)
    }

    const child = spawn(bin, ARGS, {
      env: { ...process.env, PATH, TOTARO_LOGGER_CHILD: '1' },
      cwd: os.tmpdir(),
    })

    const timer = setTimeout(() => {
      child.kill('SIGKILL')
      done({ kind: 'error', msg: 'timeout' })
    }, TIMEOUT_MS)

    let stdout = ''
    let stderr = ''
    child.stdout.on('data', (d) => {
      stdout += String(d)
    })
    child.stderr.on('data', (d) => {
      stderr += String(d)
    })
    child.on('error', (e) => {
      if ((e as NodeJS.ErrnoException).code === 'ENOENT') return done({ kind: 'enoent' })
      done({ kind: 'error', msg: String(e) })
    })
    child.on('close', (code) => {
      if (code === 0 && stdout) return done({ kind: 'ok', stdout })
      done({ kind: 'error', msg: stderr || `exit ${code}` })
    })

    child.stdin.write(input)
    child.stdin.end()
  })
}

/** 모델이 가끔 ```...``` 으로 감싸면 벗겨낸다(자연어 답변이라 보통 불필요하지만 안전망). */
function stripFences(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}
