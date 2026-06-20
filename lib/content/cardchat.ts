/**
 * 카드레터 대화 — 사현이가 사장과 대화하면서, 지시가 있으면 8장 카드를 그 자리에서 고친다.
 *
 * 입력: 사장 메시지 + 현재 카드 8장 + 최근 대화. 출력: { reply, cards }.
 * cards 가 배열이면 캔버스를 그걸로 갱신, null 이면 일반 대화(캔버스 유지).
 * 브랜드 보이스는 단일 SSOT(BRAND_GUIDE)를 따른다.
 */
import { getVertexAccess, vertexUrl } from '@/lib/assistant/vertex'
import { BRAND_GUIDE } from '@/lib/brand/mone'

const TEXT_MODEL = process.env.GOOGLE_VERTEX_CONTENT_MODEL || 'gemini-3.1-pro-preview'
const TEXT_LOCATION = process.env.GOOGLE_VERTEX_CONTENT_LOCATION || 'global'
const TIMEOUT_MS = 120_000

export type ChatCard = { kicker: string; headline: string; sub: string }
export type CardChatTurn = { role: 'user' | 'assistant'; text: string }
export type CardChatResult = { reply: string; cards: ChatCard[] | null }

function stripFences(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

/** 사장 메시지 + 현재 카드 → 사현이 답변 + (지시면) 갱신된 8장. 실패 시 null. */
export async function cardChat(
  message: string,
  cards: ChatCard[],
  history: CardChatTurn[]
): Promise<CardChatResult | null> {
  const access = await getVertexAccess()
  if (!access) return null

  const hist =
    history
      .slice(-6)
      .map((t) => `${t.role === 'user' ? '사장' : '사현이'}: ${t.text}`)
      .join('\n') || '(첫 대화)'

  const task = `너는 모네하우스 마케팅 애널리스트 김사현. 사장(윤태준)과 함께 인스타 카드레터(8장)를 만든다.
[지금까지 대화]
${hist}
[현재 카드 8장]
${JSON.stringify(cards)}
[사장 메시지]
${message}

규칙:
- 사장에게 한국어로 한두 문장, 진짜 동료처럼 답한다(reply).
- 사장 메시지가 카드를 바꾸라는 지시(추가/수정/재작성/톤변경/특정 번호 카드 등)면, 바뀐 8장 전체를 cards 로 반환한다.
- 일반 질문·잡담·칭찬·확인이면 cards 는 null(캔버스 유지).
- headline 최대 14자(자연스러우면 \\n 한 번), sub 최대 22자, kicker 는 "01 / 08"~"08 / 08". MONÉ 보이스 엄수.

아래 JSON 으로만 답해(둘 중 하나):
{ "reply": "...", "cards": null }
{ "reply": "...", "cards": [{ "kicker": "01 / 08", "headline": "..", "sub": ".." }] }  // 정확히 8개`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      vertexUrl(access.project, TEXT_MODEL, 'generateContent', TEXT_LOCATION),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${BRAND_GUIDE}\n\n${task}` }] }],
          generationConfig: {
            maxOutputTokens: 8192,
            temperature: 0.8,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[cardchat] Gemini ${res.status}: ${detail.slice(0, 300)}`)
      return null
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = (json.candidates?.[0]?.content?.parts ?? [])
      .map((p) => p.text ?? '')
      .join('')
      .trim()
    if (!text) return null

    const parsed = JSON.parse(stripFences(text)) as { reply?: string; cards?: unknown }
    const reply = String(parsed.reply ?? '').trim() || '(응답 없음)'
    let outCards: ChatCard[] | null = null
    if (Array.isArray(parsed.cards) && parsed.cards.length > 0) {
      outCards = (parsed.cards as ChatCard[]).slice(0, 8).map((c, i) => ({
        kicker: `0${i + 1} / 08`,
        headline: String(c.headline ?? '').slice(0, 40),
        sub: String(c.sub ?? '').slice(0, 60),
      }))
    }
    return { reply, cards: outCards }
  } catch (e) {
    console.error('[cardchat] 실패:', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}
