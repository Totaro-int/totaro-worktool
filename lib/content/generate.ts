/**
 * 콘텐츠 생성기 — 모네하우스 브랜드 DNA(SSOT) 기반.
 *
 * 제품·순간 → Gemini(Vertex)로 캡션 + 해시태그 + 이미지 연출 프롬프트 → Imagen 으로 실제 이미지.
 * 전부 같은 service account(GOOGLE_SERVICE_ACCOUNT_JSON) = GCP 크레딧. 텍스트 실패 시 null,
 * 이미지만 실패하면 캡션은 그대로 돌려준다(부분 성공).
 */
import { generateImage } from '@/lib/assistant/imagen'
import { getVertexAccess, vertexUrl } from '@/lib/assistant/vertex'
import { BRAND_GUIDE, BRAND_IMAGE_STYLE } from '@/lib/brand/mone'

/** 캡션·연출 모델. 기본 Gemini 3.1 Pro(global). GOOGLE_VERTEX_CONTENT_MODEL/LOCATION 로 덮어쓰기. */
const TEXT_MODEL = process.env.GOOGLE_VERTEX_CONTENT_MODEL || 'gemini-3.1-pro-preview'
const TEXT_LOCATION = process.env.GOOGLE_VERTEX_CONTENT_LOCATION || 'global'
const TIMEOUT_MS = 120_000

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
  "image_prompt": "An English Imagen prompt placing the product in a daily-life scene. Required style: ${BRAND_IMAGE_STYLE}"
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
          contents: [{ role: 'user', parts: [{ text: `${BRAND_GUIDE}\n\n${task}` }] }],
          generationConfig: {
            maxOutputTokens: 8192,
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
