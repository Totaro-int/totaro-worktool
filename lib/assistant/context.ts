/**
 * AI 직원 — 검색 컨텍스트 준비 레이어 (공유).
 *
 * 질문 → 관련 회사 자료(docs) + 본문 발췌 + 멤버 맥락을 모은다.
 * 동기 server action(actions.ts)과 스트리밍 route(stream/route.ts)가 함께 사용한다.
 */
import { createClient } from '@/lib/supabase/server'

import { driveLink, retrieveDocs } from './retrieve'

import type { DocWithExcerpt } from './answer'
import type { RetrievedDoc } from './retrieve'

/** 답변이 인용한 출처 카드(화면용). */
export type AssistantSource = {
  n: number
  id: string
  filename: string
  docType: string | null
  folderPath: string | null
  summary: string | null
  source: string | null
  link: string | null
}

export type AssistantContext = {
  docs: DocWithExcerpt[]
  members: string[]
}

/**
 * 질문에 대한 관련 자료(발췌 포함) + 회사 멤버 맥락을 모은다.
 *
 * v2: body_excerpt 컬럼이 inbox_documents 에 있어서 Drive 호출 0회.
 *   - 첫 토큰까지 지연 ~1.2~4s → < 1s
 *   - 백필 안 된 문서는 excerpt 없이 진행 (description + ai_reasoning 만으로도 답변 가능)
 *   - 백필: npm run backfill:excerpts
 */
export async function retrieveContext(question: string): Promise<AssistantContext> {
  // 관련 문서 + 멤버 컨텍스트를 병렬로 (Drive 호출 제거)
  const [{ docs }, supabase] = await Promise.all([retrieveDocs(question), createClient()])
  const { data: members } = await supabase.from('members').select('name')
  const memberNames = (members ?? []).map((m) => m.name).filter(Boolean) as string[]

  const withExcerpts: DocWithExcerpt[] = docs.map((d) => ({
    ...d,
    excerpt: d.bodyExcerpt ?? undefined,
  }))
  return { docs: withExcerpts, members: memberNames }
}

export function toSource(d: RetrievedDoc, n: number): AssistantSource {
  return {
    n,
    id: d.id,
    filename: d.filename,
    docType: d.docType,
    folderPath: d.folderPath,
    summary: d.description,
    source: d.source,
    link: driveLink(d.driveFileId),
  }
}

/** 답변 텍스트에서 인용한 [n] 만 출처 카드로 추린다. */
export function citedSources(answerText: string, docs: DocWithExcerpt[]): AssistantSource[] {
  const cited = new Set(
    [...answerText.matchAll(/\[(\d+)\]/g)].map((m) => Number(m[1])).filter((n) => n >= 1)
  )
  return docs
    .map((d, i) => ({ d, n: i + 1 }))
    .filter(({ n }) => cited.has(n))
    .map(({ d, n }) => toSource(d, n))
}
