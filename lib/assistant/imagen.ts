/**
 * Vertex AI Imagen — 이미지 1장 생성(base64 PNG).
 *
 * gemini.ts 와 "같은" service account(GOOGLE_SERVICE_ACCOUNT_JSON)를 재사용한다.
 * 새 API 키 불필요 — 사용량은 GCP Cloud 크레딧으로 청구(현금 0).
 * 실패 시 null 을 돌려 호출부가 폴백/에러 처리하게 한다.
 */
import { getVertexAccess, vertexUrl } from './vertex'

/** Imagen 모델(us-central1 제공). GOOGLE_VERTEX_IMAGE_MODEL 로 덮어쓰기. */
const IMAGE_MODEL = process.env.GOOGLE_VERTEX_IMAGE_MODEL || 'imagen-3.0-generate-002'
const TIMEOUT_MS = 120_000

type ImagenResponse = { predictions?: { bytesBase64Encoded?: string }[] }

export type AspectRatio = '1:1' | '4:5' | '3:4' | '16:9' | '9:16'

/**
 * 프롬프트 → base64 PNG(데이터만, 'data:' 접두어 없음). 실패 시 null.
 * Imagen 은 us-central1 리전 엔드포인트 + ':predict' 를 쓴다.
 */
export async function generateImage(
  prompt: string,
  opts?: { aspectRatio?: AspectRatio }
): Promise<string | null> {
  const access = await getVertexAccess()
  if (!access) return null

  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS)
  try {
    const res = await fetch(vertexUrl(access.project, IMAGE_MODEL, 'predict', 'us-central1'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        instances: [{ prompt }],
        parameters: { sampleCount: 1, aspectRatio: opts?.aspectRatio ?? '4:5' },
      }),
      signal: controller.signal,
    })

    if (!res.ok) {
      const detail = await res.text().catch(() => '')
      console.error(`[content] Imagen ${res.status}: ${detail.slice(0, 300)}`)
      return null
    }

    const json = (await res.json()) as ImagenResponse
    return json.predictions?.[0]?.bytesBase64Encoded ?? null
  } catch (e) {
    console.error('[content] Imagen 호출 실패:', e)
    return null
  } finally {
    clearTimeout(timer)
  }
}
