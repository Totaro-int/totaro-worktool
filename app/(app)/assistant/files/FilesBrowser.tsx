'use client'

import { useMemo, useState } from 'react'

import Link from 'next/link'

import type { FileEntry } from './types'

type FolderEntry = { name: string; count: number; path: string }

export function FilesBrowser({
  currentPath,
  folders,
  files,
  totalCount,
}: {
  currentPath: string
  folders: FolderEntry[]
  files: FileEntry[]
  totalCount: number
}): React.JSX.Element {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<FileEntry | null>(null)

  const crumbs = useMemo(() => breadcrumbs(currentPath), [currentPath])
  const filteredFolders = useMemo(() => {
    if (!query) return folders
    const q = query.toLowerCase()
    return folders.filter((f) => f.name.toLowerCase().includes(q))
  }, [folders, query])
  const filteredFiles = useMemo(() => {
    if (!query) return files
    const q = query.toLowerCase()
    return files.filter(
      (f) =>
        f.filename.toLowerCase().includes(q) ||
        (f.docType ?? '').toLowerCase().includes(q) ||
        (f.description ?? '').toLowerCase().includes(q)
    )
  }, [files, query])

  return (
    <div className="mx-auto w-full max-w-7xl flex-1 p-4 lg:p-6">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <Link
          href="/assistant"
          className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-sm text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
        >
          💬 채팅
        </Link>
        <div className="text-xs text-slate-500">
          전체 {totalCount.toLocaleString()}개 인덱싱 · 현재 폴더 {folders.length}개 / 파일{' '}
          {files.length}개
        </div>
      </div>

      {/* 브레드크럼 */}
      <nav className="mb-4 flex flex-wrap items-center gap-1 text-sm">
        {crumbs.map((c, i) => (
          <span key={c.path} className="flex items-center gap-1">
            {i > 0 && <span className="text-slate-400">/</span>}
            <Link
              href={`/assistant/files?path=${encodeURIComponent(c.path)}`}
              className={`rounded px-2 py-1 ${
                i === crumbs.length - 1
                  ? 'bg-slate-900 text-white'
                  : 'text-slate-700 hover:bg-slate-100'
              }`}
            >
              {c.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* 검색 */}
      <div className="mb-4">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="현재 폴더 안 검색 (파일명·종류·설명)"
          className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        {/* 폴더 + 파일 리스트 */}
        <div className="lg:col-span-2">
          {filteredFolders.length === 0 && filteredFiles.length === 0 && (
            <div className="rounded-xl bg-white p-10 text-center text-sm text-slate-500 ring-1 ring-slate-200">
              {query ? '검색 결과 없음' : '비어있는 폴더'}
            </div>
          )}

          {filteredFolders.length > 0 && (
            <div className="mb-4 rounded-xl bg-white ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500">
                폴더 {filteredFolders.length}
              </div>
              <ul>
                {filteredFolders.map((f) => (
                  <li key={f.path}>
                    <Link
                      href={`/assistant/files?path=${encodeURIComponent(f.path)}`}
                      className="flex items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-50"
                    >
                      <span className="text-xl">📁</span>
                      <span className="flex-1 truncate text-sm font-medium text-slate-900">
                        {f.name}
                      </span>
                      <span className="text-xs text-slate-400">{f.count} 파일</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {filteredFiles.length > 0 && (
            <div className="rounded-xl bg-white ring-1 ring-slate-200">
              <div className="border-b border-slate-100 px-4 py-2.5 text-xs font-medium text-slate-500">
                파일 {filteredFiles.length}
              </div>
              <ul>
                {filteredFiles.map((f) => (
                  <li key={f.id}>
                    <button
                      onClick={() => setSelected(f)}
                      className={`flex w-full items-center gap-3 border-l-2 px-4 py-3 text-left transition-colors hover:bg-slate-50 ${
                        selected?.id === f.id
                          ? 'border-l-indigo-500 bg-indigo-50/50'
                          : 'border-l-transparent'
                      }`}
                    >
                      <span className="text-xl">{fileIcon(f.filename)}</span>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium text-slate-900">
                          {f.filename}
                        </div>
                        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-xs text-slate-500">
                          {f.docType && <span>{f.docType}</span>}
                          <span>·</span>
                          <span>{formatSize(f.size)}</span>
                          <span>·</span>
                          <span>{formatDate(f.createdAt)}</span>
                          {f.source && (
                            <>
                              <span>·</span>
                              <span className="text-slate-400">{f.source}</span>
                            </>
                          )}
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>

        {/* 미리보기 패널 */}
        <aside className="lg:col-span-1">
          {selected ? (
            <FilePreview file={selected} onClose={() => setSelected(null)} />
          ) : (
            <div className="sticky top-4 rounded-xl bg-white p-6 text-sm text-slate-500 ring-1 ring-slate-200">
              <p className="mb-2 font-medium text-slate-700">파일 미리보기</p>
              <p>왼쪽에서 파일을 클릭하면 본문 발췌 + Drive 링크가 여기에 뜹니다.</p>
            </div>
          )}
        </aside>
      </div>
    </div>
  )
}

function FilePreview({
  file,
  onClose,
}: {
  file: FileEntry
  onClose: () => void
}): React.JSX.Element {
  const driveUrl = `https://drive.google.com/file/d/${file.driveFileId}/view`
  const drivePreview = `https://drive.google.com/file/d/${file.driveFileId}/preview`

  return (
    <div className="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto rounded-xl bg-white ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2 border-b border-slate-100 p-4">
        <div className="min-w-0 flex-1">
          <div className="mb-1 text-2xl">{fileIcon(file.filename)}</div>
          <div className="text-sm font-medium break-all text-slate-900">{file.filename}</div>
          <div className="mt-1 text-xs text-slate-500">
            {file.docType && <>{file.docType} · </>}
            {formatSize(file.size)} · {formatDate(file.createdAt)}
          </div>
        </div>
        <button
          onClick={onClose}
          className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
          aria-label="닫기"
        >
          ✕
        </button>
      </div>

      <div className="space-y-3 p-4 text-sm">
        {file.description && (
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">설명</div>
            <div className="text-slate-700">{file.description}</div>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <a
            href={driveUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
          >
            🔗 Drive 에서 열기
          </a>
          <a
            href={drivePreview}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3 py-1.5 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
          >
            👁️ 미리보기
          </a>
        </div>

        {file.bodyExcerpt && (
          <div>
            <div className="mb-1 text-xs font-medium text-slate-500">본문 발췌</div>
            <pre className="max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3 text-xs leading-relaxed whitespace-pre-wrap text-slate-700">
              {file.bodyExcerpt}
            </pre>
          </div>
        )}

        {/* Drive 인라인 임베드 — iframe (PDF·이미지·docx 등 자동 렌더링) */}
        <div>
          <div className="mb-1 text-xs font-medium text-slate-500">Drive 인라인</div>
          <iframe
            src={drivePreview}
            className="h-96 w-full rounded-lg border border-slate-200"
            title={file.filename}
            sandbox="allow-scripts allow-same-origin allow-popups"
          />
        </div>
      </div>
    </div>
  )
}

function breadcrumbs(path: string): Array<{ label: string; path: string }> {
  if (path === '/' || path === '') return [{ label: '🏠 루트', path: '/' }]
  const segs = path.split('/').filter(Boolean)
  const out: Array<{ label: string; path: string }> = [{ label: '🏠 루트', path: '/' }]
  let acc = ''
  for (const s of segs) {
    acc += '/' + s
    out.push({ label: s, path: acc + '/' })
  }
  return out
}

function fileIcon(filename: string): string {
  const ext = filename.split('.').pop()?.toLowerCase() ?? ''
  if (['pdf'].includes(ext)) return '📄'
  if (['docx', 'doc'].includes(ext)) return '📝'
  if (['xlsx', 'xls', 'csv'].includes(ext)) return '📊'
  if (['pptx', 'ppt'].includes(ext)) return '🎞️'
  if (['hwp', 'hwpx'].includes(ext)) return '📜'
  if (['png', 'jpg', 'jpeg', 'gif', 'webp', 'heic'].includes(ext)) return '🖼️'
  if (['md', 'txt'].includes(ext)) return '📃'
  if (['zip'].includes(ext)) return '🗜️'
  return '📁'
}

function formatSize(bytes: number): string {
  if (!bytes) return '—'
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function formatDate(iso: string): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return ''
  return d.toLocaleDateString('ko-KR', {
    year: '2-digit',
    month: '2-digit',
    day: '2-digit',
  })
}
