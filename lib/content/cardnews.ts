/**
 * 인스타 카드뉴스(8장) 스토리보드 생성 — 모네하우스 보이스, 김사현.
 *
 * 주제 → Gemini(Vertex)로 카드별 [키커·헤드라인·소제목·사진노트] JSON.
 * 카드레터 스튜디오가 이 스토리보드로 캔버스 8장을 자동으로 채운다.
 */
import { getVertexAccess, vertexUrl } from '@/lib/assistant/vertex'
import { BRAND_GUIDE } from '@/lib/brand/mone'

const TEXT_MODEL = process.env.GOOGLE_VERTEX_CONTENT_MODEL || 'gemini-3.1-pro-preview'
const TEXT_LOCATION = process.env.GOOGLE_VERTEX_CONTENT_LOCATION || 'global'
const TIMEOUT_MS = 120_000

export type CardSpec = { kicker: string; headline: string; sub: string; imageNote: string }
export type Storyboard = { title: string; cards: CardSpec[] }

/** 모델이 ```json … ``` 으로 감쌀 때 대비. */
function stripFences(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

/** 주제 → 8장 카드뉴스 스토리보드(JSON). 실패 시 null. */
export async function generateCardnews(topic: string): Promise<Storyboard | null> {
  const access = await getVertexAccess()
  if (!access) return null

  const task = `[작업] 주제 "${topic}" 로 인스타그램 카드뉴스 8장 스토리보드.
1장=후킹, 8장=CTA(둘러보기). 2~7장은 결핍의 순간·사용 장면·제품 디테일·가치로 흐름을 만든다.
각 카드:
- headline: 짧고 또렷한 한 줄. 최대 14자. 줄바꿈이 자연스러우면 \\n 한 번 허용.
- sub: 한 줄 보조 문구. 최대 22자.
- imageNote: 그 카드에 어울리는 사진 한 컷 설명(한국어, MONÉ 시각톤).

아래 JSON 으로만 답해:
{
  "title": "이 카드뉴스 한 줄 제목",
  "cards": [
    { "kicker": "01 / 08", "headline": "...", "sub": "...", "imageNote": "..." }
  ]
}
cards 는 정확히 8개.`

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
            maxOutputTokens: 2048,
            temperature: 0.85,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    )
    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[cardnews] Gemini ${res.status}: ${detail.slice(0, 300)}`)
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

    const parsed = JSON.parse(stripFences(text)) as Storyboard
    if (!parsed.cards || !Array.isArray(parsed.cards) || parsed.cards.length === 0) return null

    const cards: CardSpec[] = parsed.cards.slice(0, 8).map((c, i) => ({
      kicker: `0${i + 1} / 08`,
      headline: String(c.headline ?? '').slice(0, 40),
      sub: String(c.sub ?? '').slice(0, 60),
      imageNote: String(c.imageNote ?? '').slice(0, 140),
    }))
    return { title: String(parsed.title ?? topic).slice(0, 80), cards }
  } catch (e) {
    console.error('[cardnews] 스토리보드 생성 실패:', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}
