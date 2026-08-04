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

/**
 * 모델이 실제로 서빙되는 엔드포인트 리전.
 *
 * Gemini 3.x 는 `global` 엔드포인트 전용이다 — us-central1 같은 리전 엔드포인트는
 * 404 를 준다(2026-08-04 totaro-mailroom-gmail 실측). 그래서 설정된 리전과 무관하게
 * 강제로 global 로 보낸다. 안 그러면 배포 env 에 리전이 박혀 있을 때 3.x 가 통째로
 * 죽는다. 임베딩(text-multilingual-embedding-002)은 global·리전 양쪽 다 200 이라
 * 설정값을 그대로 존중한다.
 */
function locationFor(model: string): string {
  return model.startsWith('gemini-3') ? 'global' : VERTEX_LOCATION
}

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
export function vertexUrl(
  project: string,
  model: string,
  method: string,
  // 기본값이 locationFor(model) 이라 호출부가 아무것도 안 넘겨도 3.x 는 global 로 간다.
  // imagen(us-central1 전용)·content(TEXT_LOCATION) 처럼 리전을 아는 호출부는
  // 계속 명시로 덮어쓴다 — 자동 기본값과 명시 오버라이드를 둘 다 유지한다.
  location: string = locationFor(model)
): string {
  // 'global' 엔드포인트만 호스트에 리전 프리픽스가 없다.
  const host =
    location === 'global' ? 'aiplatform.googleapis.com' : `${location}-aiplatform.googleapis.com`
  return (
    `https://${host}/v1/projects/${project}` +
    `/locations/${location}/publishers/google/models/${model}:${method}`
  )
}
