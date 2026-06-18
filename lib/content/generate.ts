/**
 * 콘텐츠 생성기 — 모네하우스 브랜드 DNA(SSOT) 기반.
 *
 * 제품·순간 → Gemini(Vertex)로 캡션 + 해시태그 + 이미지 연출 프롬프트 → Imagen 으로 실제 이미지.
 * 전부 같은 service account(GOOGLE_SERVICE_ACCOUNT_JSON) = GCP 크레딧. 텍스트 실패 시 null,
 * 이미지만 실패하면 캡션은 그대로 돌려준다(부분 성공).
 */
import { generateImage } from '@/lib/assistant/imagen'
import { getVertexAccess, vertexUrl } from '@/lib/assistant/vertex'

/** 캡션·연출 모델. 기본 Gemini 3.1 Pro(global). GOOGLE_VERTEX_CONTENT_MODEL/LOCATION 로 덮어쓰기. */
const TEXT_MODEL = process.env.GOOGLE_VERTEX_CONTENT_MODEL || 'gemini-3.1-pro-preview'
const TEXT_LOCATION = process.env.GOOGLE_VERTEX_CONTENT_LOCATION || 'global'
const TIMEOUT_MS = 120_000

/** 모네하우스 브랜드 앵커(SSOT 요약) — 모든 캡션·연출은 이걸 따른다. */
const BRAND_ANCHOR = `너는 모네하우스(MONÉ HOUSE) 마케팅 애널리스트다.
브랜드: "A house, not a store." 철학 없는 물건은 들이지 않는다. 한국의 큐레이션 가구·라이프스타일.
제품: 침대 프레임·책장·협탁. 보이스: Quiet·Calm·Honest·Sincere. 과장 X, 느낌표 남발 X, 조용히·정확히 권한다.
고객: 오래 쓸 것을 고르는 조용한 안목(1인·신혼·미니멀). 최저가·빠른유행 고객은 우리 고객이 아니다.
시각 톤: 따뜻한 Warm Linen(#F0E8DD)·Taupe 중성톤, 부드러운 자연광, 넉넉한 여백, 와비사비 quiet luxury,
제품은 진열이 아니라 일상의 한 장면 안에 둔다.`

export type ContentInput = { product: string; moment?: string; note?: string }

export type ContentResult = {
  caption: string
  hashtags: string[]
  imagePrompt: string
  /** base64 PNG(데이터만). null = 이미지 생성 실패(캡션은 성공). */
  imageB64: string | null
}

type Drafted = { caption: string; hashtags?: string[]; image_prompt: string }

/** 모델이 ```json … ``` 으로 감쌀 때를 대비한 안전망. */
function stripFences(raw: string): string {
  return raw
    .replace(/^```[a-z]*\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim()
}

/** Gemini(Vertex) 로 캡션 + 해시태그 + 이미지 프롬프트(JSON) 생성. 실패 시 null. */
async function draftCaptionAndPrompt(
  access: { token: string; project: string },
  input: ContentInput
): Promise<Drafted | null> {
  const task = `[작업] 모네하우스 "${input.product}"${
    input.moment ? ` · 순간: ${input.moment}` : ''
  } 인스타그램 피드 1개.${input.note ? ` 추가 요청: ${input.note}` : ''}

아래 JSON 으로만 답해:
{
  "caption": "한국어 캡션 1~2문장. MONÉ 보이스(조용·정직·과장 없음). 결핍의 순간을 건드리되 팔려고 안달하지 않는다.",
  "hashtags": ["#모네하우스", "관련 해시태그 3~5개"],
  "image_prompt": "An English image prompt for Imagen. The product in a real daily-life scene in MONÉ visual tone: warm linen & taupe palette, soft natural light, generous negative space, wabi-sabi quiet luxury, editorial interior photography. No text, no logos, no people's faces."
}`

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(
      vertexUrl(access.project, TEXT_MODEL, 'generateContent', TEXT_LOCATION),
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: `${BRAND_ANCHOR}\n\n${task}` }] }],
          generationConfig: {
            maxOutputTokens: 2048,
            temperature: 0.9,
            responseMimeType: 'application/json',
          },
        }),
        signal: controller.signal,
      }
    )

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[content] Gemini ${res.status}: ${detail.slice(0, 300)}`)
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

    const parsed = JSON.parse(stripFences(text)) as Drafted
    if (!parsed.caption || !parsed.image_prompt) return null
    return parsed
  } catch (e) {
    console.error('[content] 캡션/연출 생성 실패:', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}

/** 제품·순간 → 캡션 + 해시태그 + 연출 + 이미지(base64). 텍스트 생성 실패 시 null. */
export async function generateContent(input: ContentInput): Promise<ContentResult | null> {
  const access = await getVertexAccess()
  if (!access) return null

  const drafted = await draftCaptionAndPrompt(access, input)
  if (!drafted) return null

  // 이미지는 실패해도 캡션은 돌려준다(부분 성공).
  const imageB64 = await generateImage(drafted.image_prompt, { aspectRatio: '4:5' })

  return {
    caption: drafted.caption,
    hashtags: drafted.hashtags ?? [],
    imagePrompt: drafted.image_prompt,
    imageB64,
  }
}
