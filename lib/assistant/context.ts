/**
 * AI 직원 — 검색 컨텍스트 준비 레이어 (공유).
 *
 * 질문 → 관련 회사 자료(docs) + 본문 발췌 + 멤버 맥락을 모은다.
 * 동기 server action(actions.ts)과 스트리밍 route(stream/route.ts)가 함께 사용한다.
 */
import { getDriveClient } from '@/lib/drive/client'
import { extractContent } from '@/lib/mailroom/extract'
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

/** 본문 발췌를 시도할 텍스트형 문서 수 / 발췌 길이. */
const EXCERPT_DOCS = 4
const EXCERPT_LEN = 1500

export type AssistantContext = {
  docs: DocWithExcerpt[]
  members: string[]
}

/** 질문에 대한 관련 자료(발췌 포함) + 회사 멤버 맥락을 모은다. */
export async function retrieveContext(question: string): Promise<AssistantContext> {
  // 1) 관련 문서 후보 검색
  const { docs } = await retrieveDocs(question)

  // 2) 텍스트형 상위 문서는 Drive 에서 본문 발췌까지 (근거 강화)
  const withExcerpts = await attachExcerpts(docs)

  // 3) 회사 맥락(멤버)
  const supabase = await createClient()
  const { data: members } = await supabase.from('members').select('name')
  const memberNames = (members ?? []).map((m) => m.name).filter(Boolean) as string[]

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

/** 텍스트형(pdf/docx/txt/md) 상위 문서의 Drive 본문을 받아 발췌를 붙인다. 실패는 조용히 무시. */
async function attachExcerpts(docs: RetrievedDoc[]): Promise<DocWithExcerpt[]> {
  const targets = docs.filter((d) => d.driveFileId && isTextual(d)).slice(0, EXCERPT_DOCS)
  if (targets.length === 0) return docs

  let drive: ReturnType<typeof getDriveClient>
  try {
    drive = getDriveClient()
  } catch {
    return docs // Drive 미설정 → 메타데이터만으로 진행
  }

  const excerpts = new Map<string, string>()
  await Promise.allSettled(
    targets.map(async (d) => {
      try {
        const res = await drive.files.get(
          { fileId: d.driveFileId!, alt: 'media', supportsAllDrives: true },
          { responseType: 'arraybuffer' }
        )
        const buf = Buffer.from(res.data as ArrayBuffer)
        const extracted = await extractContent(buf, d.filename, d.mimeType ?? '')
        if (extracted.tier === 1 && extracted.text) {
          excerpts.set(d.id, extracted.text.slice(0, EXCERPT_LEN))
        }
      } catch {
        // 개별 파일 실패는 무시 — 나머지 자료로 답변
      }
    })
  )

  return docs.map((d) => ({ ...d, excerpt: excerpts.get(d.id) }))
}

function isTextual(d: RetrievedDoc): boolean {
  const mime = (d.mimeType ?? '').toLowerCase()
  const name = d.filename.toLowerCase()
  return (
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.(pdf|docx|txt|md)$/.test(name)
  )
}
