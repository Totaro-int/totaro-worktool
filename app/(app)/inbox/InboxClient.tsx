'use client'

import { useCallback, useState, useTransition } from 'react'

import Link from 'next/link'
import { useDropzone } from 'react-dropzone'

import {
  type ClassifyResponse,
  confirmClassification,
  rejectClassification,
  uploadAndClassify,
} from './actions'

type Member = { id: string; name: string }

type Stage = 'idle' | 'uploading' | 'classified' | 'confirming' | 'done' | 'error'

/** 7-axis 폴더별 액센트 컬러 — 분류 결과에 색 입혀 시각 식별. */
function axisAccent(folderPath: string): {
  bar: string
  bg: string
  text: string
  emoji: string
} {
  if (folderPath.includes('/01 '))
    return { bar: 'bg-blue-500', bg: 'bg-blue-50', text: 'text-blue-700', emoji: '📦' }
  if (folderPath.includes('/02 '))
    return { bar: 'bg-violet-500', bg: 'bg-violet-50', text: 'text-violet-700', emoji: '🤖' }
  if (folderPath.includes('/03 '))
    return { bar: 'bg-amber-500', bg: 'bg-amber-50', text: 'text-amber-700', emoji: '🏭' }
  if (folderPath.includes('/04 '))
    return { bar: 'bg-emerald-500', bg: 'bg-emerald-50', text: 'text-emerald-700', emoji: '🌏' }
  if (folderPath.includes('/05 '))
    return { bar: 'bg-pink-500', bg: 'bg-pink-50', text: 'text-pink-700', emoji: '📣' }
  if (folderPath.includes('/06 '))
    return { bar: 'bg-slate-500', bg: 'bg-[#0c1830]', text: 'text-[#c4d2e4]', emoji: '🏢' }
  if (folderPath.includes('/07 '))
    return { bar: 'bg-orange-500', bg: 'bg-orange-50', text: 'text-orange-700', emoji: '🧳' }
  return { bar: 'bg-slate-400', bg: 'bg-[#0c1830]', text: 'text-[#9fb4d0]', emoji: '📄' }
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

function fileTypeIcon(mime: string, name: string): string {
  const m = mime.toLowerCase()
  const n = name.toLowerCase()
  if (m === 'application/pdf' || n.endsWith('.pdf')) return '📄'
  if (m.includes('word') || n.endsWith('.docx')) return '📝'
  if (m.includes('sheet') || n.endsWith('.xlsx') || n.endsWith('.csv')) return '📊'
  if (m.includes('presentation') || n.endsWith('.pptx')) return '🖼️'
  if (m.startsWith('image/')) return '🖼️'
  if (m.startsWith('video/')) return '🎬'
  if (m.startsWith('audio/')) return '🎵'
  if (n.endsWith('.zip')) return '🗜️'
  if (n.endsWith('.hwp') || n.endsWith('.hwpx')) return '🇰🇷'
  return '📦'
}

type BatchStatus = 'pending' | 'classifying' | 'uploading' | 'done' | 'error'
type BatchItem = {
  key: string
  file: File
  status: BatchStatus
  error?: string
  targetPath?: string
  docType?: string
  docId?: string
  driveUrl?: string
  description?: string
}

/** 내부 AI 우편실 클라이언트 — 드래그 드롭, 분류 미리보기, 확인. */
export function InboxClient({ members }: { members: Member[] }): React.JSX.Element {
  const [file, setFile] = useState<File | null>(null)
  const [description, setDescription] = useState('')
  const [notifyIds, setNotifyIds] = useState<string[]>([])
  const [stage, setStage] = useState<Stage>('idle')
  const [classification, setClassification] = useState<ClassifyResponse | null>(null)
  const [editedFolder, setEditedFolder] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  // 일괄 모드 (2개+ 드롭 시)
  const [batchItems, setBatchItems] = useState<BatchItem[]>([])
  const [batchRunning, setBatchRunning] = useState(false)

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length === 0) return
    if (accepted.length === 1) {
      // 단일 파일 — 기존 상세 리뷰 흐름
      setFile(accepted[0])
      setStage('idle')
      setError(null)
      setClassification(null)
      setBatchItems([])
    } else {
      // 멀티 — 일괄 자동 처리 모드
      setFile(null)
      setStage('idle')
      setError(null)
      setClassification(null)
      setBatchItems(
        accepted.map((f, i) => ({
          key: `${Date.now()}-${i}-${f.name}`,
          file: f,
          status: 'pending',
        }))
      )
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
  })

  // 일괄 처리 — 동시 3개씩 (Drive 쿼터 보호) 순차 큐
  async function runBatch(): Promise<void> {
    if (batchRunning || batchItems.length === 0) return
    setBatchRunning(true)
    const sharedNotifyNames = notifyIds
      .map((id) => members.find((m) => m.id === id)?.name ?? '')
      .filter(Boolean)
      .join(',')

    const CONCURRENCY = 3
    const queue = [...batchItems]
    async function runOne(item: BatchItem): Promise<void> {
      // 1) classify
      setBatchItems((prev) =>
        prev.map((x) => (x.key === item.key ? { ...x, status: 'classifying' } : x))
      )
      const fd1 = new FormData()
      fd1.append('file', item.file)
      fd1.append('description', item.description ?? '')
      fd1.append('notify_users', sharedNotifyNames)
      const c = await uploadAndClassify(fd1)
      if (!c.ok || !c.documentId || !c.target_folder_path) {
        setBatchItems((prev) =>
          prev.map((x) =>
            x.key === item.key ? { ...x, status: 'error', error: c.error ?? '분류 실패' } : x
          )
        )
        return
      }

      // 2) confirm — AI 추천 폴더로 자동
      setBatchItems((prev) =>
        prev.map((x) =>
          x.key === item.key
            ? {
                ...x,
                status: 'uploading',
                targetPath: c.target_folder_path,
                docType: c.doc_type,
                docId: c.documentId,
              }
            : x
        )
      )
      const fd2 = new FormData()
      fd2.append('file', item.file)
      fd2.append('document_id', c.documentId)
      fd2.append('folder_path', c.target_folder_path)
      fd2.append('notify_user_ids', notifyIds.join(','))
      const cf = await confirmClassification(fd2)
      if (!cf.ok) {
        setBatchItems((prev) =>
          prev.map((x) =>
            x.key === item.key ? { ...x, status: 'error', error: cf.error ?? '저장 실패' } : x
          )
        )
        return
      }
      setBatchItems((prev) =>
        prev.map((x) =>
          x.key === item.key
            ? {
                ...x,
                status: 'done',
                targetPath: cf.target_folder_path ?? x.targetPath,
              }
            : x
        )
      )
    }

    // 워커 풀
    const workers: Promise<void>[] = []
    for (let i = 0; i < CONCURRENCY; i++) {
      workers.push(
        (async () => {
          for (;;) {
            const next = queue.shift()
            if (!next) return
            try {
              await runOne(next)
            } catch (e) {
              setBatchItems((prev) =>
                prev.map((x) =>
                  x.key === next.key
                    ? { ...x, status: 'error', error: e instanceof Error ? e.message : String(e) }
                    : x
                )
              )
            }
          }
        })()
      )
    }
    await Promise.all(workers)
    setBatchRunning(false)
  }

  function removeBatchItem(key: string): void {
    if (batchRunning) return
    setBatchItems((prev) => prev.filter((x) => x.key !== key))
  }

  function updateBatchDescription(key: string, desc: string): void {
    setBatchItems((prev) => prev.map((x) => (x.key === key ? { ...x, description: desc } : x)))
  }

  function resetBatch(): void {
    setBatchItems([])
    setNotifyIds([])
  }

  const submitClassify = (): void => {
    if (!file) return
    setStage('uploading')
    setError(null)
    const fd = new FormData()
    fd.append('file', file)
    fd.append('description', description)
    fd.append(
      'notify_users',
      notifyIds
        .map((id) => members.find((m) => m.id === id)?.name ?? '')
        .filter(Boolean)
        .join(',')
    )
    startTransition(async () => {
      const result = await uploadAndClassify(fd)
      if (!result.ok) {
        setError(result.error ?? '분류 실패')
        setStage('error')
        return
      }
      setClassification(result)
      setEditedFolder(result.target_folder_path ?? '')
      setStage('classified')
    })
  }

  const submitConfirm = (): void => {
    if (!file || !classification?.documentId || !editedFolder) return
    setStage('confirming')
    const fd = new FormData()
    fd.append('file', file)
    fd.append('document_id', classification.documentId)
    fd.append('folder_path', editedFolder)
    fd.append('notify_user_ids', notifyIds.join(','))
    startTransition(async () => {
      const result = await confirmClassification(fd)
      if (!result.ok) {
        setError(result.error ?? '저장 실패')
        setStage('error')
        return
      }
      setStage('done')
    })
  }

  const reset = (): void => {
    setFile(null)
    setDescription('')
    setNotifyIds([])
    setStage('idle')
    setClassification(null)
    setError(null)
  }

  const toggleNotify = (id: string): void => {
    setNotifyIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]))
  }

  const accent = classification?.target_folder_path
    ? axisAccent(classification.target_folder_path)
    : null

  return (
    <div
      className="min-h-screen p-6"
      style={{
        backgroundColor: '#eef2f8',
        backgroundImage:
          'radial-gradient(60% 55% at 42% 78%, rgba(99, 102, 241, 0.07), transparent 70%), repeating-linear-gradient(30deg, #e3e8f0 0 1.3px, transparent 1.3px 70px), repeating-linear-gradient(-30deg, #e3e8f0 0 1.3px, transparent 1.3px 70px)',
      }}
    >
      <div className="mx-auto max-w-3xl space-y-5">
        {/* 헤더 */}
        <header className="flex items-center gap-3">
          <Link
            href="/hub"
            className="group inline-flex items-center gap-1.5 rounded-full bg-[#101f38] px-3 py-1.5 text-xs font-medium text-[#9fb4d0] ring-1 ring-[#1c3556] transition-colors hover:bg-[#14263f] hover:text-[#dbe7f4]"
            aria-label="허브로 돌아가기"
          >
            <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true">
              ←
            </span>
            허브
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500 to-blue-600 text-2xl shadow-lg shadow-indigo-200/60">
            📥
          </div>
          <div>
            <h1 className="text-xl font-bold text-[#dbe7f4]">내부 AI 우편실</h1>
            <p className="text-xs text-[#8ea0b8]">
              파일을 떨어트리면 AI가 적절한 Drive 폴더에 자동 분류·저장합니다
            </p>
          </div>
        </header>

        {/* 드롭존 */}
        <div
          {...getRootProps()}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed transition-all ${
            isDragActive
              ? 'scale-[1.01] border-blue-500 bg-blue-50/80 shadow-lg shadow-blue-200/50'
              : file
                ? 'border-[#24405f] bg-[#101f38] shadow-sm'
                : 'border-[#24405f] bg-[#101f38]/70 backdrop-blur-sm hover:border-slate-400 hover:bg-[#14263f]'
          }`}
        >
          <input {...getInputProps()} />
          <div className="px-6 py-10 text-center">
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <div className="text-3xl">{fileTypeIcon(file.type, file.name)}</div>
                <div className="text-left">
                  <p className="font-semibold text-[#dbe7f4]">{file.name}</p>
                  <p className="text-xs text-[#8ea0b8]">
                    {formatBytes(file.size)} · {file.type || '알 수 없음'}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    reset()
                  }}
                  className="ml-2 rounded-md p-1 text-[#6b7c96] hover:bg-[#14263f] hover:text-[#c4d2e4]"
                  aria-label="파일 제거"
                >
                  ✕
                </button>
              </div>
            ) : isDragActive ? (
              <div className="space-y-1">
                <div className="text-4xl">⬇️</div>
                <p className="text-sm font-semibold text-blue-700">여기에 놓으세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-4xl opacity-50 transition-opacity group-hover:opacity-80">
                  📥
                </div>
                <p className="text-sm font-medium text-[#c4d2e4]">
                  파일을 끌어다 놓거나{' '}
                  <span className="text-blue-600 underline">클릭해서 선택</span>
                </p>
                <p className="text-xs text-[#6b7c96]">
                  PDF · docx · 이미지 · 한글 등. 카톡 대신 여기로. 여러 개 동시에 OK.
                </p>
              </div>
            )}
          </div>
        </div>

        {/* 일괄 모드 — 2개+ 드롭 시 */}
        {batchItems.length > 0 && (
          <BatchPanel
            items={batchItems}
            members={members}
            notifyIds={notifyIds}
            onToggleNotify={toggleNotify}
            running={batchRunning}
            onRun={() => void runBatch()}
            onRemove={removeBatchItem}
            onReset={resetBatch}
            onDescription={updateBatchDescription}
          />
        )}

        {/* 폼 — 파일 선택 후 (idle 상태에만) */}
        {file && stage === 'idle' && (
          <div className="space-y-4 rounded-2xl border border-[#1c3556] bg-[#101f38] p-5 shadow-sm">
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                한 줄 설명{' '}
                <span className="text-[#6b7c96] normal-case">(선택, 그러나 정확도 ↑)</span>
              </label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="예: 모네 하우스 계약 초안"
                className="w-full rounded-lg border border-[#1c3556] bg-[#0c1830]/50 px-3 py-2.5 text-sm transition-colors outline-none placeholder:text-[#6b7c96] focus:border-blue-500 focus:bg-[#101f38] focus:ring-2 focus:ring-blue-100"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                알림 받을 사람
              </label>
              <div className="flex flex-wrap gap-2">
                {members.map((m) => {
                  const on = notifyIds.includes(m.id)
                  return (
                    <button
                      type="button"
                      key={m.id}
                      onClick={() => toggleNotify(m.id)}
                      className={`rounded-full border px-3.5 py-1.5 text-xs font-medium transition-all ${
                        on
                          ? 'border-indigo-500 bg-indigo-500 text-white shadow-sm shadow-indigo-200'
                          : 'border-[#1c3556] bg-[#101f38] text-[#9fb4d0] hover:border-[#24405f] hover:bg-[#14263f]'
                      }`}
                    >
                      {on ? '✓ ' : ''}
                      {m.name}
                    </button>
                  )
                })}
              </div>
            </div>
            <button
              type="button"
              onClick={submitClassify}
              disabled={isPending}
              className="w-full rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-indigo-200/60 transition-all hover:shadow-lg hover:shadow-indigo-300/60 active:scale-[0.99] disabled:opacity-50"
            >
              🤖 AI 분류 시작
            </button>
          </div>
        )}

        {/* 진행 — 분류 중 */}
        {stage === 'uploading' && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-blue-200 bg-blue-50/60 p-6 text-sm text-blue-700">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-300 border-t-blue-700" />
            <span>분류 중... Claude Opus가 파일 읽고 폴더 결정</span>
          </div>
        )}

        {/* 분류 결과 — 확인 단계 */}
        {stage === 'classified' && classification && accent && (
          <div className="overflow-hidden rounded-2xl border border-[#1c3556] bg-[#101f38] shadow-sm">
            {/* 상단 액센트 바 */}
            <div className={`h-1 ${accent.bar}`} />
            <div className="space-y-4 p-5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">{accent.emoji}</span>
                  <h2 className="text-base font-bold text-[#dbe7f4]">분류 결과</h2>
                </div>
                <div
                  className={`rounded-full px-2.5 py-1 text-[11px] font-medium ${accent.bg} ${accent.text}`}
                >
                  자신도 {Math.round((classification.confidence ?? 0) * 100)}% ·{' '}
                  {classification.method}
                </div>
              </div>

              <div className="space-y-3 text-sm">
                <div className="space-y-1">
                  <div className="text-[11px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                    📁 저장 위치
                  </div>
                  <input
                    type="text"
                    value={editedFolder}
                    onChange={(e) => setEditedFolder(e.target.value)}
                    className="w-full rounded-lg border border-[#1c3556] bg-[#0c1830] px-3 py-2 font-mono text-xs text-[#dbe7f4] outline-none focus:border-blue-500 focus:bg-[#101f38] focus:ring-1 focus:ring-blue-200"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-0.5 rounded-lg bg-[#0c1830] p-3">
                    <div className="text-[10px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                      🏷 문서 종류
                    </div>
                    <div className="font-medium text-[#dbe7f4]">
                      {classification.doc_type || '—'}
                    </div>
                  </div>
                  <div className="space-y-0.5 rounded-lg bg-[#0c1830] p-3">
                    <div className="text-[10px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                      🔔 알림
                    </div>
                    <div className="text-xs text-[#c4d2e4]">
                      {(classification.notify_users ?? []).join(', ') || '(없음)'}
                    </div>
                  </div>
                </div>

                <div className="space-y-0.5 rounded-lg bg-[#0c1830] p-3">
                  <div className="text-[10px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                    📝 요약
                  </div>
                  <div className="text-[#c4d2e4] italic">{classification.summary || '—'}</div>
                </div>

                {(classification.alternatives?.length ?? 0) > 0 && (
                  <details className="rounded-lg border border-[#1c3556] bg-[#0c1830]/50 p-2">
                    <summary className="cursor-pointer text-[11px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
                      대안 폴더 {classification.alternatives?.length}개
                    </summary>
                    <div className="mt-2 space-y-1 text-xs text-[#9fb4d0]">
                      {classification.alternatives?.map((a) => (
                        <button
                          type="button"
                          key={a.folder}
                          onClick={() => setEditedFolder(a.folder)}
                          className="block w-full rounded p-1.5 text-left font-mono hover:bg-[#14263f]"
                        >
                          · {a.folder}{' '}
                          <span className="text-[#6b7c96]">
                            ({Math.round(a.confidence * 100)}%)
                          </span>
                        </button>
                      ))}
                    </div>
                  </details>
                )}
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={submitConfirm}
                  disabled={isPending}
                  className="flex-1 rounded-lg bg-gradient-to-r from-indigo-600 to-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-indigo-200/50 transition-all hover:shadow-lg active:scale-[0.99] disabled:opacity-50"
                >
                  ✅ 이대로 저장
                </button>
                <button
                  type="button"
                  onClick={async () => {
                    if (classification.documentId) {
                      await rejectClassification(classification.documentId)
                    }
                    reset()
                  }}
                  disabled={isPending}
                  className="rounded-lg border border-[#1c3556] bg-[#101f38] px-4 py-2.5 text-sm font-medium text-[#9fb4d0] transition-colors hover:bg-[#14263f] disabled:opacity-50"
                >
                  취소
                </button>
              </div>
            </div>
          </div>
        )}

        {/* 진행 — 저장 중 */}
        {stage === 'confirming' && (
          <div className="flex items-center justify-center gap-3 rounded-2xl border border-indigo-200 bg-indigo-50/60 p-6 text-sm text-[#35e0ff]">
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-indigo-300 border-t-indigo-700" />
            <span>Drive에 업로드 중...</span>
          </div>
        )}

        {/* 완료 */}
        {stage === 'done' && (
          <div className="space-y-3 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-6 text-center shadow-sm">
            <div className="text-5xl">🎉</div>
            <p className="text-base font-bold text-emerald-800">Drive에 저장 완료</p>
            <p className="font-mono text-xs text-[#8ea0b8]">{classification?.target_folder_path}</p>
            <button
              type="button"
              onClick={reset}
              className="mt-2 inline-block rounded-lg bg-emerald-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md shadow-emerald-200 transition-all hover:bg-emerald-700 hover:shadow-lg active:scale-[0.99]"
            >
              📥 다음 파일
            </button>
          </div>
        )}

        {/* 에러 */}
        {error && (
          <div className="space-y-2 rounded-2xl border border-red-200 bg-red-50/60 p-5">
            <div className="flex items-center gap-2">
              <span className="text-xl">⚠️</span>
              <p className="font-semibold text-red-800">에러</p>
            </div>
            <p className="text-sm text-red-700">{error}</p>
            <button
              type="button"
              onClick={reset}
              className="text-xs font-medium text-red-600 underline hover:text-red-800"
            >
              다시 시도
            </button>
          </div>
        )}

        {/* 푸터 안내 */}
        <p className="pt-4 text-center text-[10px] text-[#6b7c96]">
          AI가 추측 못 하는 건 사용자가 선택. 자율성 원칙: 되돌릴 수 있는 건 자유, 못 되돌리는 건
          너만.
        </p>
      </div>
    </div>
  )
}

/** 일괄 업로드 패널 — 멀티 파일 드롭 시. */
function BatchPanel({
  items,
  members,
  notifyIds,
  onToggleNotify,
  running,
  onRun,
  onRemove,
  onReset,
  onDescription,
}: {
  items: BatchItem[]
  members: Member[]
  notifyIds: string[]
  onToggleNotify: (id: string) => void
  running: boolean
  onRun: () => void
  onRemove: (key: string) => void
  onReset: () => void
  onDescription: (key: string, desc: string) => void
}): React.JSX.Element {
  const done = items.filter((x) => x.status === 'done').length
  const errors = items.filter((x) => x.status === 'error').length
  const pending = items.filter((x) => x.status === 'pending').length
  const allDone = done + errors === items.length && running === false && items.length > 0

  return (
    <div className="space-y-4 rounded-2xl border border-[#1c3556] bg-[#101f38] p-5 shadow-sm">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-[#dbe7f4]">📦 일괄 업로드 ({items.length}개)</h2>
          <p className="mt-0.5 text-xs text-[#8ea0b8]">
            AI 추천 폴더로 자동 분류·저장 (개별 검토 X). 진행 중엔 제거 불가.
          </p>
        </div>
        <div className="flex gap-2">
          {!running && !allDone && (
            <>
              <button
                type="button"
                onClick={onReset}
                className="rounded-lg bg-[#101f38] px-3 py-1.5 text-xs font-medium text-[#9fb4d0] ring-1 ring-[#1c3556] hover:bg-[#14263f]"
              >
                취소
              </button>
              <button
                type="button"
                onClick={onRun}
                className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
              >
                전부 처리 ({pending})
              </button>
            </>
          )}
          {running && (
            <span className="rounded-lg bg-indigo-50 px-3 py-1.5 text-xs font-medium text-[#35e0ff]">
              처리 중... {done + errors}/{items.length}
            </span>
          )}
          {allDone && (
            <button
              type="button"
              onClick={onReset}
              className="rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              새 일괄
            </button>
          )}
        </div>
      </div>

      {/* 공통 알림 대상 (있으면 전부에 적용) */}
      <div>
        <label className="mb-1.5 block text-[11px] font-semibold tracking-wide text-[#8ea0b8] uppercase">
          공통 알림 대상 (전부에 적용)
        </label>
        <div className="flex flex-wrap gap-1.5">
          {members.map((m) => (
            <button
              key={m.id}
              type="button"
              disabled={running}
              onClick={() => onToggleNotify(m.id)}
              className={`rounded-full px-2.5 py-1 text-xs ring-1 transition-colors ${
                notifyIds.includes(m.id)
                  ? 'bg-[#189ec2] text-white ring-indigo-600'
                  : 'bg-[#101f38] text-[#9fb4d0] ring-[#1c3556] hover:bg-[#14263f]'
              } ${running ? 'cursor-not-allowed opacity-60' : ''}`}
            >
              {m.name}
            </button>
          ))}
        </div>
      </div>

      {/* 파일 리스트 */}
      <ul className="divide-y divide-[#1c3556] rounded-xl border border-[#12233c]">
        {items.map((it) => (
          <li key={it.key} className="px-3 py-2.5">
            <div className="flex items-center gap-3">
              <span className="text-xl">{fileTypeIcon(it.file.type, it.file.name)}</span>
              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-medium text-[#dbe7f4]">{it.file.name}</div>
                <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[11px] text-[#8ea0b8]">
                  <span>{formatBytes(it.file.size)}</span>
                  {it.targetPath && (
                    <>
                      <span>·</span>
                      <span className="text-[#9fb4d0]">→ {it.targetPath}</span>
                    </>
                  )}
                  {it.docType && (
                    <>
                      <span>·</span>
                      <span className="text-[#8ea0b8]">{it.docType}</span>
                    </>
                  )}
                  {it.error && <span className="text-rose-600">❌ {it.error}</span>}
                </div>
              </div>
              <StatusBadge status={it.status} />
              {!running && it.status === 'pending' && (
                <button
                  type="button"
                  onClick={() => onRemove(it.key)}
                  className="rounded p-1 text-[#6b7c96] hover:bg-[#14263f] hover:text-[#c4d2e4]"
                  aria-label="제거"
                >
                  ✕
                </button>
              )}
            </div>
            {/* 파일별 설명 — 처리 시작 전에만 노출 */}
            {it.status === 'pending' && !running && (
              <input
                type="text"
                value={it.description ?? ''}
                onChange={(e) => onDescription(it.key, e.target.value)}
                placeholder="이 파일 한 줄 설명 (선택, 분류 정확도 ↑)"
                className="mt-1.5 ml-9 block w-[calc(100%-2.5rem)] rounded-md border border-[#1c3556] bg-[#101f38] px-2 py-1 text-xs placeholder:text-[#6b7c96] focus:border-indigo-400 focus:outline-none"
              />
            )}
            {/* 저장된 설명 표시 — 처리 중·완료 후 */}
            {it.description && it.status !== 'pending' && (
              <div className="mt-1 ml-9 text-[11px] text-[#8ea0b8]">💬 {it.description}</div>
            )}
          </li>
        ))}
      </ul>

      {/* 완료 요약 */}
      {allDone && (
        <div
          className={`rounded-lg p-3 text-xs ${
            errors === 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-amber-50 text-amber-700'
          }`}
        >
          {errors === 0
            ? `✅ 모두 완료 — Drive 저장 + ${notifyIds.length > 0 ? '담당자 알림 발송' : '알림 X'}`
            : `⚠️ ${done} 완료 · ${errors} 실패 — 실패한 건 다시 드롭해서 재시도`}
        </div>
      )}
    </div>
  )
}

function StatusBadge({ status }: { status: BatchStatus }): React.JSX.Element {
  if (status === 'done')
    return (
      <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700">
        ✓ 완료
      </span>
    )
  if (status === 'error')
    return (
      <span className="rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-medium text-rose-700">
        실패
      </span>
    )
  if (status === 'classifying')
    return (
      <span className="rounded bg-indigo-100 px-1.5 py-0.5 text-[10px] font-medium text-[#35e0ff]">
        분류 중
      </span>
    )
  if (status === 'uploading')
    return (
      <span className="rounded bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700">
        업로드
      </span>
    )
  return (
    <span className="rounded bg-[#0c1830] px-1.5 py-0.5 text-[10px] font-medium text-[#8ea0b8]">
      대기
    </span>
  )
}
