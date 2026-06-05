/**
 * Vertex AI 공용 인증/엔드포인트 — 임베딩(embedding.ts)과 답변생성(gemini.ts)이 공유.
 *
 * Drive 와 "같은" service account(GOOGLE_SERVICE_ACCOUNT_JSON)를 cloud-platform 스코프로
 * 재사용한다. 새 API 키 불필요 — 사용량은 GCP Cloud 크레딧으로 청구(현금 0).
 *
 * 설계: 키/프로젝트/토큰 중 하나라도 없으면 null 을 돌린다.
 *   → 호출부(임베딩/생성)가 자동으로 폴백(트라이그램 검색 / Anthropic·CLI)한다. 안 깨짐.
 */
import { google } from 'googleapis'

/** Vertex 리전. 모델이 제공되는 리전이어야 함(기본 us-central1). */
export const VERTEX_LOCATION = process.env.GOOGLE_VERTEX_LOCATION || 'us-central1'

let cachedAuth: InstanceType<typeof google.auth.GoogleAuth> | null = null
let authResolved = false
function getAuth(): InstanceType<typeof google.auth.GoogleAuth> | null {
  if (authResolved) return cachedAuth
  authResolved = true
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) return cachedAuth // null — 키 없음 → 폴백
  try {
    const credentials = JSON.parse(json)
    cachedAuth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/cloud-platform'],
    })
  } catch {
    cachedAuth = null // JSON 깨짐 → 폴백
  }
  return cachedAuth
}

/** access token + project 가 모두 준비됐을 때만 반환. 하나라도 없으면 null(폴백). */
export async function getVertexAccess(): Promise<{ token: string; project: string } | null> {
  const auth = getAuth()
  if (!auth) return null
  try {
    const token = await auth.getAccessToken()
    if (!token) return null
    const project = process.env.GOOGLE_VERTEX_PROJECT || (await auth.getProjectId())
    if (!project) return null
    return { token, project }
  } catch {
    return null
  }
}

/**
 * Vertex publisher 모델 엔드포인트 URL.
 * method 예: 'predict'(임베딩), 'generateContent', 'streamGenerateContent'(Gemini).
 */
export function vertexUrl(project: string, model: string, method: string): string {
  return (
    `https://${VERTEX_LOCATION}-aiplatform.googleapis.com/v1/projects/${project}` +
    `/locations/${VERTEX_LOCATION}/publishers/google/models/${model}:${method}`
  )
}
