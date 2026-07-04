/**
 * 임베딩 백필 코어 — 크론(시간당)이 호출. 스크립트(scripts/embed-backfill.ts)의 축약판.
 *
 * 대상:
 *  1) inbox_documents: embedding 이 비어있는 살아있는 문서(배치 제한) — 메타+본문 발췌 임베딩
 *  2) agent_memories: embedding 이 비어있는 기억 — content 임베딩
 *
 * 원칙: 개별 실패는 건너뛰고 계속(멱등, 재실행 안전). 임베딩 자체가 안 되면(null)
 * 그대로 0건 보고 — 쓰기 시 즉시 임베딩이 기본이고 이건 소급 보험이다.
 */
import { getServiceSupabase } from '@/lib/oauth/utils'

import { embedTexts } from './embedding'

const EXCERPT_LEN = 1500

type DocRow = {
  id: string
  filename: string
  description: string | null
  doc_type: string | null
  folder_path: string | null
  ai_reasoning: string | null
  body_excerpt: string | null
}

export type BackfillResult = {
  ok: boolean
  docs: number
  memories: number
  docsRemaining: number
  error?: string
}

/** 문서+기억의 미임베딩분을 한 배치 처리한다(서버리스 시간 안). */
export async function backfillEmbeddings(
  docLimit: number = 25,
  memLimit: number = 50
): Promise<BackfillResult> {
  const sb = getServiceSupabase()
  let docs = 0
  let memories = 0

  try {
    // 1) 문서 — Drive 다운로드 없이 DB의 body_excerpt(있으면)로 빠르게.
    const { data: docData } = await sb
      .from('inbox_documents')
      .select('id, filename, description, doc_type, folder_path, ai_reasoning, body_excerpt')
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .is('embedding', null)
      .limit(docLimit)
    const rows = (docData ?? []) as DocRow[]

    if (rows.length > 0) {
      const texts = rows.map((d) =>
        [
          d.filename,
          d.doc_type,
          d.folder_path,
          d.description,
          d.ai_reasoning,
          (d.body_excerpt ?? '').slice(0, EXCERPT_LEN),
        ]
          .map((s) => (s ?? '').trim())
          .filter(Boolean)
          .join('\n')
      )
      const vecs = await embedTexts(texts, 'RETRIEVAL_DOCUMENT')
      if (vecs && vecs.length === rows.length) {
        for (let i = 0; i < rows.length; i++) {
          const { error } = await sb
            .from('inbox_documents')
            .update({ embedding: JSON.stringify(vecs[i]) })
            .eq('id', rows[i].id)
          if (!error) docs++
        }
      }
    }

    // 2) 기억 — content 그대로 임베딩.
    const { data: memData } = await sb
      .from('agent_memories')
      .select('id, content')
      .is('embedding', null)
      .limit(memLimit)
    const mems = (memData ?? []) as Array<{ id: string; content: string }>

    if (mems.length > 0) {
      const vecs = await embedTexts(
        mems.map((m) => m.content),
        'RETRIEVAL_DOCUMENT'
      )
      if (vecs && vecs.length === mems.length) {
        for (let i = 0; i < mems.length; i++) {
          const { error } = await sb
            .from('agent_memories')
            .update({ embedding: JSON.stringify(vecs[i]) })
            .eq('id', mems[i].id)
          if (!error) memories++
        }
      }
    }

    // 남은 미임베딩 문서 수(다음 배치 크기 감 잡기용)
    const { count } = await sb
      .from('inbox_documents')
      .select('*', { count: 'exact', head: true })
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .is('embedding', null)

    return { ok: true, docs, memories, docsRemaining: count ?? 0 }
  } catch (e) {
    return {
      ok: false,
      docs,
      memories,
      docsRemaining: -1,
      error: e instanceof Error ? e.message : String(e),
    }
  }
}
