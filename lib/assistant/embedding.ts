/**
 * AI 직원 — 임베딩(의미 벡터) 레이어. Google Vertex AI.
 *
 * 문서 본문/질문을 768차원 벡터로 바꿔 "의미 유사도" 검색을 가능케 한다.
 * 모델: text-multilingual-embedding-002 (다국어 → 한국어에 적합).
 *
 * 인증은 Drive 와 동일한 service account(GOOGLE_SERVICE_ACCOUNT_JSON)를 재사용한다.
 * 단, 스코프만 cloud-platform 으로 넓혀 Vertex AI predict 를 호출한다.
 * → 새 API 키 불필요. 비용은 GCP Cloud 크레딧으로 청구(현금 0).
 *
 * 설계 원칙: 모든 실패는 null 로 돌려보낸다.
 *   - 키/권한/네트워크/쿼터 문제로 임베딩이 안 되면 호출부(retrieve.ts)가
 *     자동으로 트라이그램 → 키워드 검색으로 폴백한다. 그래서 프로덕션이 안 깨진다.
 *
 * 차원/모델을 바꾸면 supabase/assistant-embeddings.sql 의 vector(768) 도 함께 바꾼다.
 */
import { getVertexAccess, vertexUrl } from './vertex'

/** 임베딩 차원 — DB 컬럼 vector(768) 과 반드시 일치. */
export const EMBED_DIM = 768

/** 한 번의 predict 요청에 담는 최대 텍스트 수(쿼터·페이로드 보수적으로). */
const EMBED_BATCH = 20

/** 텍스트 입력 최대 길이(자). 모델 토큰 한도 + autoTruncate 보호용. */
const INPUT_MAX = 2000

const MODEL = process.env.GOOGLE_VERTEX_EMBED_MODEL || 'text-multilingual-embedding-002'

/** Vertex 임베딩 task_type — 문서 색인 vs 질문 검색을 구분하면 품질이 오른다. */
export type EmbedTask = 'RETRIEVAL_DOCUMENT' | 'RETRIEVAL_QUERY'

type VertexPrediction = {
  embeddings?: { values?: number[] }
}
type VertexPredictResponse = {
  predictions?: VertexPrediction[]
}

function truncate(t: string): string {
  return t.length > INPUT_MAX ? t.slice(0, INPUT_MAX) : t
}

/**
 * 여러 텍스트를 임베딩한다. 입력 순서대로 number[](768) 배열을 돌려준다.
 * 어떤 단계든 실패하면 null → 호출부가 트라이그램/키워드로 폴백.
 */
export async function embedTexts(
  texts: string[],
  task: EmbedTask = 'RETRIEVAL_DOCUMENT'
): Promise<number[][] | null> {
  if (texts.length === 0) return []
  const access = await getVertexAccess()
  if (!access) return null

  try {
    const url = vertexUrl(access.project, MODEL, 'predict')

    const out: number[][] = []
    for (let i = 0; i < texts.length; i += EMBED_BATCH) {
      const batch = texts.slice(i, i + EMBED_BATCH)
      const instances = batch.map((t) => ({ task_type: task, content: truncate(t) }))

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${access.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          instances,
          parameters: { outputDimensionality: EMBED_DIM, autoTruncate: true },
        }),
      })
      if (!res.ok) return null

      const json = (await res.json()) as VertexPredictResponse
      const preds = json.predictions
      if (!preds || preds.length !== batch.length) return null
      for (const p of preds) {
        const values = p.embeddings?.values
        if (!values || values.length === 0) return null
        out.push(values)
      }
    }
    return out
  } catch {
    return null // 네트워크/쿼터/파싱 실패 → 폴백
  }
}

/** 단일 텍스트(보통 질문) 임베딩. 기본 task 는 질문용 RETRIEVAL_QUERY. */
export async function embedText(
  text: string,
  task: EmbedTask = 'RETRIEVAL_QUERY'
): Promise<number[] | null> {
  const trimmed = text.trim()
  if (!trimmed) return null
  const vecs = await embedTexts([trimmed], task)
  if (!vecs || vecs.length === 0) return null
  return vecs[0]
}
