/**
 * AI 직원 보고서 — 특정 우편실 폴더의 최신 보고서 1건 + 본문.
 *
 * inbox_documents 메타를 조회하고, body_excerpt 가 있으면 그걸로(빠름),
 * 없으면 Drive 본문을 다운로드한다. 실패해도 메타·요약은 돌려준다.
 */
import { driveLink } from '@/lib/assistant/retrieve'
import { downloadFile, getDriveClient } from '@/lib/drive/client'
import { createClient } from '@/lib/supabase/server'

export type AgentReport = {
  filename: string
  createdAt: string
  /** Drive 본문(또는 body_excerpt). 가져오기 실패 시 null → 요약으로 폴백. */
  content: string | null
  summary: string | null
  driveLink: string | null
}

type Row = {
  filename: string
  folder_path: string | null
  drive_file_id: string | null
  ai_reasoning: string | null
  description: string | null
  body_excerpt: string | null
  created_at: string
}

/** folderMatch(부분 일치) 폴더의 최신 보고서 1건. 본문은 DB 발췌 → Drive 순. */
export async function latestReport(folderMatch: string): Promise<AgentReport | null> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('inbox_documents')
    .select(
      'filename, folder_path, drive_file_id, ai_reasoning, description, body_excerpt, created_at'
    )
    .ilike('folder_path', `%${folderMatch}%`)
    .not('drive_file_id', 'is', null)
    .not('status', 'in', '(trashed,rejected,failed)')
    .order('created_at', { ascending: false })
    .limit(1)
    .maybeSingle()

  const row = data as Row | null
  if (!row) return null

  let content = row.body_excerpt
  if (!content && row.drive_file_id) {
    try {
      content = await downloadFile(getDriveClient(), row.drive_file_id)
    } catch {
      content = null
    }
  }

  return {
    filename: row.filename,
    createdAt: row.created_at,
    content,
    summary: row.ai_reasoning ?? row.description,
    driveLink: driveLink(row.drive_file_id),
  }
}
