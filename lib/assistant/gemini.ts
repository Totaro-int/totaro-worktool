/**
 * AI 직원 — Google Gemini(Vertex AI) 답변 생성.
 *
 * Drive 와 "같은" service account(GOOGLE_SERVICE_ACCOUNT_JSON)를 cloud-platform 스코프로
 * 재사용한다(vertex.ts). 새 API 키 불필요 — 사용량은 GCP Cloud 크레딧으로 청구(현금 0).
 * Vercel 같은 서버리스에서도 동작한다(로컬 claude CLI 불필요).
 *
 * 설계: 키/권한/네트워크 문제로 실패하면 available=false / false 를 돌려
 *   answer.ts 가 Anthropic API → claude CLI → 자료 카드 순으로 우아하게 폴백한다.
 */
import { getVertexAccess, vertexUrl } from './vertex'

import type { AnswerResult, StreamEvent } from './answer'

/** 답변 생성 모델(기본: 빠르고 저렴한 Gemini 2.5 Flash). GOOGLE_VERTEX_GEN_MODEL 로 덮어쓰기. */
const GEN_MODEL = process.env.GOOGLE_VERTEX_GEN_MODEL || 'gemini-2.5-flash'
const MAX_OUTPUT_TOKENS = 2048
const TIMEOUT_MS = 120_000

/** Vertex generationConfig — thinkingBudget=0 으로 사고단계 끄고 빠른 채팅 응답. */
const GENERATION_CONFIG = {
  maxOutputTokens: MAX_OUTPUT_TOKENS,
  temperature: 0.7,
  thinkingConfig: { thinkingBudget: 0 },
}

type GeminiPart = { text?: string }
type GeminiCandidate = { content?: { parts?: GeminiPart[] } }
type GeminiResponse = { candidates?: GeminiCandidate[] }

/** 응답(또는 스트림 청크)에서 candidates[0].content.parts[].text 를 이어붙인다. */
function extractText(json: GeminiResponse): string {
  const parts = json.candidates?.[0]?.content?.parts
  if (!parts) return ''
  return parts.map((p) => p.text ?? '').join('')
}

function requestBody(prompt: string): string {
  return JSON.stringify({
    contents: [{ role: 'user', parts: [{ text: prompt }] }],
    generationConfig: GENERATION_CONFIG,
  })
}

/** 비스트리밍 — 한 번에 답변 생성. */
export async function generateGemini(prompt: string): Promise<AnswerResult> {
  const access = await getVertexAccess()
  if (!access) return { available: false, text: '', method: 'unavailable' }

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(vertexUrl(access.project, GEN_MODEL, 'generateContent'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.token}`,
        'Content-Type': 'application/json',
      },
      body: requestBody(prompt),
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[assistant] Gemini ${res.status}: ${detail.slice(0, 300)}`)
      return { available: false, text: '', method: 'error' }
    }

    const json = (await res.json()) as GeminiResponse
    const text = extractText(json).trim()
    if (!text) return { available: false, text: '', method: 'error' }
    return { available: true, text: stripFences(text), method: 'gemini' }
  } catch (e) {
    // 타임아웃(abort) 포함 — 조용히 다음 경로로 폴백
    console.error('[assistant] Gemini 호출 실패:', e)
    return { available: false, text: '', method: 'error' }
  } finally {
    clearTimeout(timer)
  }
}

/**
 * 스트리밍 — SSE(alt=sse)로 토큰 델타를 yield.
 * 반환값 = 답변 텍스트를 하나라도 만들었는지. 시작 전 실패면 false → answer.ts 가 폴백.
 */
export async function* streamGemini(prompt: string): AsyncGenerator<StreamEvent, boolean> {
  const access = await getVertexAccess()
  if (!access) return false

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  let any = false
  try {
    const url = `${vertexUrl(access.project, GEN_MODEL, 'streamGenerateContent')}?alt=sse`
    const res = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.token}`,
        'Content-Type': 'application/json',
      },
      body: requestBody(prompt),
      signal: controller.signal,
    })

    if (!res.ok || !res.body) {
      if (!res.ok) {
        const detail = await res.text().catch(() => '')
        console.error(`[assistant] Gemini ${res.status}: ${detail.slice(0, 300)}`)
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
      while ((idx = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, idx)
        buf = buf.slice(idx + 1)
        const text = parseSseLine(line)
        if (text) {
          any = true
          yield { type: 'delta', text }
        }
      }
    }

    if (any) yield { type: 'done', method: 'gemini' }
    return any
  } catch (e) {
    console.error('[assistant] Gemini 스트리밍 실패:', e)
    // 이미 흘린 텍스트가 있으면 폴백 금지(중복 방지) → true, 아니면 폴백 허용 → false
    return any
  } finally {
    clearTimeout(timer)
  }
}

/** SSE 한 줄("data: {...}")에서 텍스트 델타만 뽑는다. */
function parseSseLine(line: string): string {
  const m = /^data:\s?(.*)$/.exec(line.trim())
  if (!m) return ''
  const payload = m[1]
  if (!payload) return ''
  try {
    return extractText(JSON.parse(payload) as GeminiResponse)
  } catch {
    // 부분 JSON — 다음 청크에서 이어짐
    return ''
  }
}

/** 모델이 가끔 ```...``` 으로 감싸면 벗겨낸다(자연어 답변이라 보통 불필요하지만 안전망). */
function stripFences(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```$/i, '')
    .trim()
}
