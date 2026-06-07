/**
 * AI 직원 — 파일 브라우저.
 * 우편실(inbox_documents) 의 folder_path 를 트리로 묶어 Drive 스타일로 탐색.
 */
import type { JSX } from 'react'

import { PageHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

import { FilesBrowser } from './FilesBrowser'

import type { FileEntry } from './types'

export const dynamic = 'force-dynamic'

export default async function AssistantFilesPage({
  searchParams,
}: {
  searchParams: Promise<{ path?: string }>
}): Promise<JSX.Element> {
  const { path: rawPath } = await searchParams
  const currentPath = normalizePath(rawPath || '/')

  const supabase = await createClient()
  const { data } = await supabase
    .from('inbox_documents')
    .select(
      'id, filename, doc_type, folder_path, size_bytes, created_at, drive_file_id, source, description, body_excerpt'
    )
    .not('drive_file_id', 'is', null)
    .not('status', 'in', '(trashed,rejected,failed)')
    .order('filename', { ascending: true })
    .limit(2000)

  const rows = (data ?? []) as Array<{
    id: string
    filename: string
    doc_type: string | null
    folder_path: string
    size_bytes: number | null
    created_at: string
    drive_file_id: string
    source: string | null
    description: string | null
    body_excerpt: string | null
  }>

  const all: FileEntry[] = rows.map((r) => ({
    id: r.id,
    filename: r.filename,
    docType: r.doc_type,
    folderPath: normalizePath(r.folder_path),
    size: Number(r.size_bytes ?? 0),
    createdAt: r.created_at,
    driveFileId: r.drive_file_id,
    source: r.source,
    description: r.description,
    bodyExcerpt: r.body_excerpt,
  }))

  // 현재 경로의 직속 자식: 하위 폴더 + 직속 파일
  const childFolders = new Map<string, number>() // 직속 sub 폴더 → 그 안 파일 총 개수
  const filesHere: FileEntry[] = []
  for (const f of all) {
    if (!f.folderPath.startsWith(currentPath)) continue
    const rest = f.folderPath.slice(currentPath.length) // 예: "AI 시스템/마케팅 에이전트/"
    if (rest === '' || rest === '/') {
      filesHere.push(f)
    } else {
      const firstSeg = rest.replace(/^\/+/, '').split('/')[0]
      if (firstSeg) {
        childFolders.set(firstSeg, (childFolders.get(firstSeg) ?? 0) + 1)
      }
    }
  }

  const folders = Array.from(childFolders.entries())
    .map(([name, count]) => ({ name, count, path: joinPath(currentPath, name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'ko'))

  filesHere.sort((a, b) => a.filename.localeCompare(b.filename, 'ko'))

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader title="AI 직원 — 파일" description="우편실 자료를 폴더로 탐색 · Drive 와 연동" />
      <FilesBrowser
        currentPath={currentPath}
        folders={folders}
        files={filesHere}
        totalCount={all.length}
      />
    </div>
  )
}

/** 경로 정규화 — 슬래시 시작 + 끝, 빈 경로는 "/". */
function normalizePath(p: string): string {
  if (!p || p === '/') return '/'
  let out = p.startsWith('/') ? p : '/' + p
  if (!out.endsWith('/')) out += '/'
  return out
}

function joinPath(parent: string, child: string): string {
  const p = parent.endsWith('/') ? parent : parent + '/'
  return p + child + '/'
}
