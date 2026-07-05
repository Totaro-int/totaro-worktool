/**
 * gbrain 브레인 읽기 프록시 — 김사현(Hermes)이 기존 HTTP MCP 로 회사 지식 브레인을 읽는다.
 *
 * 브레인 = gbrain(v0.18.2)이 관리하는 Supabase 테이블(pages — docs/gbrain-integration.md).
 * 여기서는 **읽기만** 한다. 쓰기/인제스트는 gbrain CLI(scripts/brain-ingest.ts)가 담당 —
 * 청킹·태그·링크 등 gbrain 불변식을 깨지 않기 위해서다.
 * 브레인이 아직 Supabase 로 이전 전이면(테이블 없음) 안내 문구를 돌려준다(안 깨짐).
 */
import { sbGet } from './handlers'

const NOT_READY =
  '브레인 미구축 상태 — gbrain Supabase 이전 전입니다. 당분간 mailroom_search_semantic / memory_search 를 사용하세요.'

const SNIPPET = 240

type PageRow = {
  slug: string
  type: string
  title: string
  compiled_truth: string
  updated_at: string | null
}

function isMissingTable(e: unknown): boolean {
  const msg = e instanceof Error ? e.message : String(e)
  return msg.includes('42P01') || msg.includes('does not exist') || msg.includes(' 404')
}

/** PostgREST or=() 표현식 안에서 안전하게 쓸 수 있게 위험 문자를 제거. */
function sanitize(q: string): string {
  return q
    .replace(/[,()*\\]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** 첫 매칭 위치 주변 발췌. 못 찾으면 앞부분. */
function excerpt(body: string, q: string): string {
  const idx = body.toLowerCase().indexOf(q.toLowerCase())
  const start = idx >= 0 ? Math.max(0, idx - 60) : 0
  const cut = body
    .slice(start, start + SNIPPET)
    .replace(/\s+/g, ' ')
    .trim()
  return `${start > 0 ? '…' : ''}${cut}${start + SNIPPET < body.length ? '…' : ''}`
}

export type BrainSearchInput = { query: string; limit?: number }

/** 회사 지식 브레인 키워드 검색 — 제목/본문 부분일치. */
export async function handleBrainSearch(input: BrainSearchInput): Promise<string> {
  const raw = sanitize(input.query ?? '')
  if (!raw) throw new Error('query 필수')
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20)

  try {
    const q = encodeURIComponent(raw)
    let rows = (await sbGet(
      `pages?select=slug,type,title,compiled_truth,updated_at` +
        `&or=(title.ilike.*${q}*,compiled_truth.ilike.*${q}*)` +
        `&order=updated_at.desc&limit=${limit}`
    )) as PageRow[]

    // 구문 전체가 안 맞으면 첫 토큰으로 한 번 더 (간단 완화)
    if (rows.length === 0 && raw.includes(' ')) {
      const t = encodeURIComponent(raw.split(' ')[0]!)
      rows = (await sbGet(
        `pages?select=slug,type,title,compiled_truth,updated_at` +
          `&or=(title.ilike.*${t}*,compiled_truth.ilike.*${t}*)` +
          `&order=updated_at.desc&limit=${limit}`
      )) as PageRow[]
    }

    if (rows.length === 0) return '브레인에서 일치 항목 없음. brain_get(slug) 또는 다른 검색어로.'
    return rows
      .map(
        (r, i) =>
          `${i + 1}. [${r.type}] ${r.title} (slug: ${r.slug})\n   ${excerpt(r.compiled_truth ?? '', raw)}`
      )
      .join('\n')
  } catch (e) {
    if (isMissingTable(e)) return NOT_READY
    throw e
  }
}

export type BrainGetInput = { slug: string }

/** 브레인 페이지 전문 읽기(최대 8000자). */
export async function handleBrainGet(input: BrainGetInput): Promise<string> {
  const slug = (input.slug ?? '').trim()
  if (!slug) throw new Error('slug 필수')

  try {
    const rows = (await sbGet(
      `pages?select=slug,type,title,compiled_truth,updated_at&slug=eq.${encodeURIComponent(slug)}&limit=1`
    )) as PageRow[]
    const p = rows[0]
    if (!p) return `브레인에 slug "${slug}" 없음. brain_search 로 먼저 찾아보세요.`
    const body = p.compiled_truth ?? ''
    return (
      `# ${p.title} [${p.type}] (slug: ${p.slug})\n\n` +
      body.slice(0, 8000) +
      (body.length > 8000 ? '\n… [생략, 8000자 초과]' : '')
    )
  } catch (e) {
    if (isMissingTable(e)) return NOT_READY
    throw e
  }
}
