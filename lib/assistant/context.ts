/**
 * AI 직원 — 검색 컨텍스트 준비 레이어 (공유).
 *
 * 질문 → 관련 회사 자료(docs) + 본문 발췌 + 팀 작업 기록 + 멤버 맥락을 모은다.
 * 동기 server action(actions.ts)과 스트리밍 route(stream/route.ts)가 함께 사용한다.
 */
import { createClient } from '@/lib/supabase/server'

import { driveLink, extractKeywords, retrieveDocs } from './retrieve'

import type { DocWithExcerpt, WorkLog } from './answer'
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
  workLogs: WorkLog[]
}

/**
 * 질문에 대한 관련 자료(발췌 포함) + 팀 작업 기록 + 회사 멤버 맥락을 모은다.
 *
 * v2: body_excerpt 컬럼이 inbox_documents 에 있어서 Drive 호출 0회.
 *   - 첫 토큰까지 지연 ~1.2~4s → < 1s
 *   - 백필 안 된 문서는 excerpt 없이 진행 (description + ai_reasoning 만으로도 답변 가능)
 *   - 백필: npm run backfill:excerpts
 * v3: 팀 작업 기록(claude_logs)도 함께 검색 — "누가 뭘 작업했어?" 류 질문에 답변 가능.
 */
export async function retrieveContext(question: string): Promise<AssistantContext> {
  const supabase = await createClient()
  // 관련 문서 + 작업 기록 + 멤버 컨텍스트를 병렬로 (Drive 호출 제거)
  const [{ docs }, workLogs, { data: members }] = await Promise.all([
    retrieveDocs(question),
    retrieveWorkLogs(supabase, question),
    supabase.from('members').select('name'),
  ])
  const memberNames = (members ?? []).map((m) => m.name).filter(Boolean) as string[]

  const withExcerpts: DocWithExcerpt[] = docs.map((d) => ({
    ...d,
    excerpt: d.bodyExcerpt ?? undefined,
  }))
  return { docs: withExcerpts, members: memberNames, workLogs }
}

// ============================================================
// 팀 작업 기록(claude_logs) 검색
// ============================================================

type ServerClient = Awaited<ReturnType<typeof createClient>>

const LOG_COLS = 'id, member, summary, project, occurred_at'
/** ilike OR-매칭 대상 컬럼. */
const LOG_MATCH_COLS = ['member', 'summary', 'project']
const LOG_LIMIT = 8

type LogRow = {
  id: string
  member: string
  summary: string
  project: string | null
  occurred_at: string
}

/**
 * 질문과 관련된 팀 작업 기록을 가져온다.
 * 키워드 ilike OR-매칭(최신순) + 매칭 빈약하면(4건 미만) 최신순 보강 — retrieve.ts 폴백과 같은 패턴.
 * 코퍼스가 작고 한 줄 요약이라 임베딩 없이 충분. 에러 시 빈 배열(답변 자체는 계속 진행).
 */
async function retrieveWorkLogs(supabase: ServerClient, question: string): Promise<WorkLog[]> {
  const keywords = extractKeywords(question)

  let rows: LogRow[] = []
  if (keywords.length > 0) {
    const orExpr = keywords.flatMap((k) => LOG_MATCH_COLS.map((c) => `${c}.ilike.%${k}%`)).join(',')
    const { data } = await supabase
      .from('claude_logs')
      .select(LOG_COLS)
      .or(orExpr)
      .order('occurred_at', { ascending: false })
      .limit(LOG_LIMIT)
    rows = (data ?? []) as LogRow[]
  }

  if (rows.length < 4) {
    const { data: recent } = await supabase
      .from('claude_logs')
      .select(LOG_COLS)
      .order('occurred_at', { ascending: false })
      .limit(LOG_LIMIT)
    const have = new Set(rows.map((r) => r.id))
    for (const r of (recent ?? []) as LogRow[]) {
      if (!have.has(r.id) && rows.length < LOG_LIMIT) rows.push(r)
    }
  }

  return rows.map((r) => ({
    member: r.member,
    summary: r.summary,
    project: r.project,
    occurredAt: r.occurred_at,
  }))
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
