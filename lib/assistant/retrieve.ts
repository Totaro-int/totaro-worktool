/**
 * AI 직원 — 검색(retrieval) 레이어.
 *
 * 우편실(inbox_documents)에 쌓인 회사 자료에서 질문과 관련된 문서를 골라낸다.
 * 임베딩/벡터DB 없이 키워드 ilike OR-매칭 + 최신순 폴백으로 v1을 단순하게 간다.
 * (코퍼스가 작아서 — 약 100~200건 — Claude가 후보 중 진짜 근거를 추려 쓰면 충분.)
 *
 * 중요한 데이터 사실(코드에서 확인):
 *   - Gmail 동기화 문서는 status='classified' 로 들어온다(gmail-sync.ts). 'confirmed' 아님.
 *     → status 로 거르지 말고 "drive_file_id 있고 trashed/rejected/failed 아님" 으로 거른다.
 *   - 요약은 description 에 있다. ai_reasoning 은 Gmail 은 "보낸사람|제목", 수동확정본은 Drive 링크.
 *     → 화면 요약은 description, 링크는 drive_file_id 로 직접 구성.
 */
import { createClient } from '@/lib/supabase/server'

import { embedText } from './embedding'

export type RetrievedDoc = {
  id: string
  filename: string
  description: string | null
  docType: string | null
  folderPath: string | null
  /** Gmail: "보낸사람 | 제목" / 수동확정: Drive 링크. 요약 아님 주의. */
  aiReasoning: string | null
  driveFileId: string | null
  mimeType: string | null
  source: string | null
  createdAt: string
  confidence: number | null
}

const COLS =
  'id, filename, description, doc_type, folder_path, ai_reasoning, drive_file_id, mime_type, source, created_at, classification_confidence'

/** ilike OR-매칭 대상 컬럼. */
const MATCH_COLS = ['filename', 'description', 'doc_type', 'folder_path', 'ai_reasoning']

type Row = {
  id: string
  filename: string
  description: string | null
  doc_type: string | null
  folder_path: string | null
  ai_reasoning: string | null
  drive_file_id: string | null
  mime_type: string | null
  source: string | null
  created_at: string
  classification_confidence: number | null
}

function toDoc(r: Row): RetrievedDoc {
  return {
    id: r.id,
    filename: r.filename,
    description: r.description,
    docType: r.doc_type,
    folderPath: r.folder_path,
    aiReasoning: r.ai_reasoning,
    driveFileId: r.drive_file_id,
    mimeType: r.mime_type,
    source: r.source,
    createdAt: r.created_at,
    confidence: r.classification_confidence,
  }
}

/**
 * 질문에서 검색 키워드 추출. 한국어 조사 제거 + 불용어 제거 + 중복 제거.
 * 완벽하지 않아도 됨 — recall 만 어느 정도 확보하면 Claude 가 추려 쓴다.
 */
export function extractKeywords(question: string): string[] {
  const tokens = question
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter(Boolean)

  const out: string[] = []
  const seen = new Set<string>()
  for (const raw of tokens) {
    const tok = stripJosa(raw)
    if (tok.length < 2) continue
    if (STOPWORDS.has(tok)) continue
    if (seen.has(tok)) continue
    seen.add(tok)
    out.push(tok)
    if (out.length >= 6) break
  }
  return out
}

// 길이 긴 조사부터 떼야 '으로' 가 '로' 보다 먼저 매칭됨.
const JOSA = [
  '으로서',
  '으로써',
  '에서는',
  '에게서',
  '으로',
  '에서',
  '에게',
  '한테',
  '이랑',
  '까지',
  '부터',
  '보다',
  '처럼',
  '만큼',
  '이나',
  '라고',
  '이라',
  '에는',
  '에도',
  '는',
  '은',
  '이',
  '가',
  '을',
  '를',
  '에',
  '의',
  '도',
  '와',
  '과',
  '랑',
  '로',
  '만',
  '요',
]

function stripJosa(tok: string): string {
  if (tok.length < 3) return tok
  for (const j of JOSA) {
    if (tok.endsWith(j) && tok.length - j.length >= 2) return tok.slice(0, -j.length)
  }
  return tok
}

const STOPWORDS = new Set([
  '그',
  '저',
  '이',
  '것',
  '거',
  '수',
  '등',
  '및',
  '좀',
  '왜',
  '뭐',
  '무엇',
  '어떻게',
  '어디',
  '언제',
  '누가',
  '누구',
  '해줘',
  '알려줘',
  '있어',
  '있나',
  '없어',
  '관련',
  '대해',
  '대한',
  '하는',
  '한거',
  '인거',
  '그리고',
  '근데',
  '그래서',
  '하지만',
  '우리',
  '내',
  '나',
  '너',
  '저희',
  '지금',
  '오늘',
  '어제',
  'the',
  'a',
  'an',
  'of',
  'to',
  'is',
  'are',
  'what',
  'how',
  'when',
  'where',
  'who',
  'about',
  'for',
  'and',
  'or',
])

/** server Supabase 클라이언트 타입(별도 import 없이 추론). */
type ServerClient = Awaited<ReturnType<typeof createClient>>

/**
 * 질문과 관련된 문서 후보를 가져온다. 3단 폴백 — 위에서부터 되는 걸 쓴다.
 * 1) 임베딩(의미) 검색 — 벡터 컬럼/함수가 있고 키·백필이 준비됐을 때 (assistant-embeddings.sql).
 * 2) pg_trgm 유사도 검색 — SQL 함수만 있으면 (assistant-search.sql).
 * 3) 기존 ilike OR-매칭 + 최신순 보강 — 아무것도 없을 때.
 * 각 단계는 실패/미설치/0건이면 null 을 돌려 다음 단계로 내려간다. 그래서 안 깨진다.
 * 최종 14건으로 자른다(프롬프트 토큰 + 인용 번호 관리).
 */
export async function retrieveDocs(
  question: string
): Promise<{ docs: RetrievedDoc[]; keywords: string[] }> {
  const supabase = await createClient()
  const keywords = extractKeywords(question)
  // 트라이그램엔 조사/불용어를 걷어낸 키워드가 잡음이 적다. 없으면 원문 사용.
  const q = keywords.length > 0 ? keywords.join(' ') : question.trim()

  // 1) 의미(임베딩) 검색 — 원문 질문을 그대로 임베딩한다(조사·불용어가 의미 신호).
  const semantic = await searchByEmbedding(supabase, question)
  if (semantic) return { docs: semantic.slice(0, 14).map(toDoc), keywords }

  // 2) 트라이그램 유사도 검색 — SQL 함수가 깔려 있으면 사용
  const ranked = await searchByTrigram(supabase, q)
  if (ranked) return { docs: ranked.slice(0, 14).map(toDoc), keywords }

  // 3) 폴백: 기존 ilike OR-매칭 (+ 최신순 보강)
  const rows = await searchByKeyword(supabase, keywords)
  return { docs: rows.slice(0, 14).map(toDoc), keywords }
}

/**
 * 임베딩(의미) 검색 — 질문을 벡터로 바꿔 코사인 거리가 가까운 문서를 가져온다.
 * 다음 중 하나라도 해당하면 null 을 돌려 호출부가 트라이그램으로 폴백한다:
 *   - 키/권한 없음(embedText 가 null), match_inbox_documents 함수 미설치, 결과 0건(백필 전).
 * pgvector 는 JS 배열을 그대로 못 받는다 → JSON.stringify 로 '[...]' 문자열을 넘겨
 * PostgREST 가 text → vector 로 캐스팅하게 한다(배열 그대로면 '{...}' 가 돼서 실패).
 */
async function searchByEmbedding(supabase: ServerClient, question: string): Promise<Row[] | null> {
  const vec = await embedText(question, 'RETRIEVAL_QUERY')
  if (!vec) return null
  const { data, error } = await supabase
    .rpc('match_inbox_documents', { query_embedding: JSON.stringify(vec), match_limit: 16 })
    .select(COLS)
  if (error || !data || (data as unknown[]).length === 0) return null
  return data as unknown as Row[]
}

/**
 * pg_trgm 함수(search_inbox_documents) 호출. word_similarity 로 관련도 정렬.
 * 함수 미설치/에러면 null 을 돌려 호출부가 기존 키워드 검색으로 폴백한다.
 */
async function searchByTrigram(supabase: ServerClient, q: string): Promise<Row[] | null> {
  if (!q) return null
  const { data, error } = await supabase
    .rpc('search_inbox_documents', { q, match_limit: 16 })
    .select(COLS)
  if (error || !data) return null
  return data as unknown as Row[]
}

/**
 * 폴백 경로 — 기존 ilike OR-매칭(최신순 16건) + 매칭 빈약하면(6건 미만) 최신 보강.
 * 살아있는(휴지통/반려/실패 아님) + 실제 Drive 에 있는(drive_file_id) 문서만.
 * Gmail 문서는 status='classified' 라 confirmed 로 거르면 안 됨 → 이 조합으로 거른다.
 */
async function searchByKeyword(supabase: ServerClient, keywords: string[]): Promise<Row[]> {
  let rows: Row[] = []
  if (keywords.length > 0) {
    const orExpr = keywords.flatMap((k) => MATCH_COLS.map((c) => `${c}.ilike.%${k}%`)).join(',')
    const { data } = await supabase
      .from('inbox_documents')
      .select(COLS)
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .or(orExpr)
      .order('created_at', { ascending: false })
      .limit(16)
    rows = (data ?? []) as Row[]
  }

  if (rows.length < 6) {
    const { data: recent } = await supabase
      .from('inbox_documents')
      .select(COLS)
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .order('created_at', { ascending: false })
      .limit(12)
    const have = new Set(rows.map((r) => r.id))
    for (const r of (recent ?? []) as Row[]) {
      if (!have.has(r.id)) rows.push(r)
    }
  }

  return rows
}

/** drive_file_id 로 Drive 미리보기 링크 구성. ai_reasoning 의 링크에 의존하지 않는다. */
export function driveLink(driveFileId: string | null): string | null {
  if (!driveFileId) return null
  return `https://drive.google.com/file/d/${driveFileId}/view`
}
