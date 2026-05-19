import {
  EmptyState,
  PageHeader,
  WorkAreaBadge,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '@/components/ui'
import { formatDate, formatFileSize } from '@/lib/format'
import { getLookups } from '@/lib/lookups'
import { createClient } from '@/lib/supabase/server'
import type { DocumentRow } from '@/lib/types'

import { deleteDocument, uploadDocument } from './actions'

export default async function DocumentsPage(): Promise<React.JSX.Element> {
  const { workAreas, memberById, workAreaById } = await getLookups()
  const supabase = await createClient()
  const { data } = await supabase
    .from('documents')
    .select('*')
    .order('created_at', { ascending: false })
  const documents = (data ?? []) as DocumentRow[]

  const signedUrls = new Map<string, string>()
  await Promise.all(
    documents.map(async (d) => {
      const { data: signed } = await supabase.storage
        .from('documents')
        .createSignedUrl(d.storage_path, 3600, { download: d.name })
      if (signed?.signedUrl) signedUrls.set(d.id, signed.signedUrl)
    })
  )

  return (
    <>
      <PageHeader title="문서" description="서류를 올리면 활동 피드에도 자동으로 기록됩니다." />
      <div className="p-8">
        <div className="mx-auto max-w-4xl">
          <details className="mb-6 rounded-xl bg-white ring-1 ring-slate-200">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-slate-700">
              + 문서 업로드
            </summary>
            <form action={uploadDocument} className="space-y-3 border-t border-slate-100 p-5">
              <div>
                <label className={labelClass} htmlFor="file">
                  파일
                </label>
                <input
                  type="file"
                  id="file"
                  name="file"
                  required
                  className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-indigo-50 file:px-3 file:py-2 file:text-sm file:font-medium file:text-indigo-700 hover:file:bg-indigo-100"
                />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="doc-area">
                    사업영역
                  </label>
                  <select id="doc-area" name="work_area_id" className={inputClass}>
                    <option value="">선택 안 함</option>
                    {workAreas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="doc-desc">
                    설명 (선택)
                  </label>
                  <input
                    id="doc-desc"
                    name="description"
                    placeholder="예: 5월 거래처 견적서"
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="submit" className={primaryButtonClass}>
                업로드
              </button>
            </form>
          </details>

          {documents.length === 0 ? (
            <EmptyState message="아직 업로드된 문서가 없습니다." />
          ) : (
            <ul className="space-y-2">
              {documents.map((d) => {
                const area = d.work_area_id ? workAreaById.get(d.work_area_id) : undefined
                const uploader = d.uploaded_by ? memberById.get(d.uploaded_by) : undefined
                const url = signedUrls.get(d.id)
                return (
                  <li key={d.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                    <div className="flex items-center gap-3">
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-50 text-amber-700">
                        <FileIcon />
                      </span>
                      <div className="min-w-0 flex-1">
                        {url ? (
                          <a
                            href={url}
                            className="text-sm font-medium text-slate-900 hover:text-indigo-600 hover:underline"
                          >
                            {d.name}
                          </a>
                        ) : (
                          <span className="text-sm font-medium text-slate-900">{d.name}</span>
                        )}
                        {d.description && (
                          <p className="truncate text-xs text-slate-500">{d.description}</p>
                        )}
                        <div className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-slate-400">
                          <WorkAreaBadge area={area} />
                          <span>·</span>
                          <span>{uploader?.name ?? '알 수 없음'}</span>
                          <span>·</span>
                          <span>{formatFileSize(d.file_size)}</span>
                          <span>·</span>
                          <span>{formatDate(d.created_at)}</span>
                        </div>
                      </div>
                      <form action={deleteDocument}>
                        <input type="hidden" name="id" value={d.id} />
                        <button
                          type="submit"
                          className="shrink-0 rounded-md px-2 py-1 text-xs text-slate-400 transition-colors hover:bg-red-50 hover:text-red-500"
                        >
                          삭제
                        </button>
                      </form>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function FileIcon(): React.JSX.Element {
  return (
    <svg
      className="h-5 w-5"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6" />
    </svg>
  )
}
