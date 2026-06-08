/**
 * 명함 OCR — Vertex Gemini Vision 으로 명함 이미지에서 연락처 필드 추출.
 *
 * 입력: 이미지 buffer + mime type
 * 출력: 구조화된 연락처 (name 필수, 나머지 best-effort)
 */
import { getVertexAccess, vertexUrl } from '../assistant/vertex'

const MODEL = 'gemini-2.5-flash'

export type ExtractedContact = {
  name: string
  company: string | null
  title: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  website: string | null
  address: string | null
  memo: string | null
  confidence: number
  raw: Record<string, unknown>
}

const SUPPORTED_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/heic',
  'image/heif',
])

const PROMPT = `명함 이미지에서 연락처 정보를 추출해 **JSON 한 덩어리만** 출력.
마크다운/코드블록/설명 금지.

다음 형식을 정확히 따른다 (없는 필드는 null):

{
  "name": "사람 이름 (필수 — 못 찾으면 회사명 사용)",
  "company": "회사명",
  "title": "직책/부서",
  "phone": "대표/사무실 전화 (000-0000-0000 형식)",
  "mobile": "휴대전화 (010-0000-0000 형식)",
  "email": "이메일",
  "website": "웹사이트 URL (없으면 null)",
  "address": "주소 (전체 또는 도시까지)",
  "memo": "특이사항 (전공/슬로건/태그라인 등)",
  "confidence": 0.0~1.0
}

규칙:
- 휴대전화는 010 으로 시작. 핸드폰/Mobile/M 표기는 mobile 에.
- TEL/T/Phone 표기는 phone 에.
- 한국 명함이면 한글 이름 우선, 영문은 memo 에.
- 일본/중국 명함이면 그 언어 그대로.
- 글자가 흐리거나 못 읽으면 그 필드만 null, confidence 낮춤.
- 명함 아니면 confidence: 0 + name: "(명함 아님)" 출력.`

export async function extractContactFromCard(
  buffer: Buffer,
  mimeType: string
): Promise<ExtractedContact | null> {
  if (!SUPPORTED_MIMES.has(mimeType.toLowerCase())) return null
  const access = await getVertexAccess()
  if (!access) return null

  try {
    const res = await fetch(vertexUrl(access.project, MODEL, 'generateContent'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: PROMPT },
              { inlineData: { mimeType, data: buffer.toString('base64') } },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.2,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) return null
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned) as Record<string, unknown>
    const name = String(parsed.name ?? '').trim()
    if (!name) return null
    return {
      name,
      company: nullable(parsed.company),
      title: nullable(parsed.title),
      phone: nullable(parsed.phone),
      mobile: nullable(parsed.mobile),
      email: nullable(parsed.email),
      website: nullable(parsed.website),
      address: nullable(parsed.address),
      memo: nullable(parsed.memo),
      confidence: Number(parsed.confidence ?? 0),
      raw: parsed,
    }
  } catch {
    return null
  }
}

function nullable(v: unknown): string | null {
  if (v === null || v === undefined) return null
  const s = String(v).trim()
  if (!s || s.toLowerCase() === 'null') return null
  return s
}
