'use client'

import { useCallback, useState, useTransition } from 'react'

import { useDropzone } from 'react-dropzone'

import {
  type ClassifyResponse,
  confirmClassification,
  rejectClassification,
  uploadAndClassify,
} from './actions'

type Member = { id: string; name: string }

type Stage = 'idle' | 'uploading' | 'classified' | 'confirming' | 'done' | 'error'

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

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted.length === 0) return
    setFile(accepted[0])
    setStage('idle')
    setError(null)
    setClassification(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: false,
  })

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

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <header className="space-y-1">
        <h1 className="text-2xl font-bold text-slate-900">📥 내부 AI 우편실</h1>
        <p className="text-sm text-slate-500">
          파일을 떨어트리면 AI가 적절한 Drive 폴더에 분류·저장합니다. 카톡 대신 여기로.
        </p>
      </header>

      {/* 드롭존 */}
      <div
        {...getRootProps()}
        className={`cursor-pointer rounded-xl border-2 border-dashed p-10 text-center transition-colors ${
          isDragActive
            ? 'border-blue-400 bg-blue-50'
            : 'border-slate-300 bg-slate-50 hover:border-slate-400'
        }`}
      >
        <input {...getInputProps()} />
        {file ? (
          <div className="space-y-1">
            <p className="text-sm font-semibold text-slate-700">{file.name}</p>
            <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
          </div>
        ) : isDragActive ? (
          <p className="text-sm text-blue-600">여기에 놓으세요</p>
        ) : (
          <p className="text-sm text-slate-500">
            파일을 끌어다 놓거나 클릭해서 선택. PDF·docx·이미지 등 다 받음.
          </p>
        )}
      </div>

      {/* 폼 — 파일 선택 후 */}
      {file && stage === 'idle' && (
        <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              한 줄 설명 (선택, 그러나 입력하면 분류 정확도 ↑)
            </label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="예: 모네 하우스 계약 초안"
              className="w-full rounded-md border border-slate-300 px-3 py-2 text-sm outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold text-slate-600">
              알림 받을 사람 (다중 선택)
            </label>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <button
                  type="button"
                  key={m.id}
                  onClick={() => toggleNotify(m.id)}
                  className={`rounded-full border px-3 py-1 text-xs font-medium ${
                    notifyIds.includes(m.id)
                      ? 'border-blue-500 bg-blue-500 text-white'
                      : 'border-slate-300 bg-white text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={submitClassify}
            disabled={isPending}
            className="w-full rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            🤖 AI 분류 시작
          </button>
        </div>
      )}

      {/* 진행 상태 */}
      {stage === 'uploading' && (
        <div className="rounded-xl bg-blue-50 p-5 text-center text-sm text-blue-700">
          분류 중... (Claude Opus 호출)
        </div>
      )}

      {/* 분류 결과 */}
      {stage === 'classified' && classification && (
        <div className="space-y-4 rounded-xl border border-blue-200 bg-blue-50 p-5">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-900">분류 결과</h2>
            <span className="text-xs text-slate-500">
              자신도 {Math.round((classification.confidence ?? 0) * 100)}% · {classification.method}
            </span>
          </div>
          <div className="space-y-2 text-sm">
            <div>
              <span className="font-semibold">📁 저장 위치:</span>{' '}
              <input
                type="text"
                value={editedFolder}
                onChange={(e) => setEditedFolder(e.target.value)}
                className="ml-1 inline-block w-3/4 rounded border border-slate-300 px-2 py-1 font-mono text-xs"
              />
            </div>
            <div>
              <span className="font-semibold">📝 한 줄 요약:</span>{' '}
              <span className="text-slate-700">{classification.summary}</span>
            </div>
            <div>
              <span className="font-semibold">🏷 문서 종류:</span>{' '}
              <span className="text-slate-700">{classification.doc_type}</span>
            </div>
            <div>
              <span className="font-semibold">🔔 알림:</span>{' '}
              <span className="text-slate-700">
                {(classification.notify_users ?? []).join(', ') || '(없음)'}
              </span>
            </div>
            {(classification.alternatives?.length ?? 0) > 0 && (
              <div className="mt-3 rounded border border-slate-200 bg-white p-2 text-xs text-slate-500">
                <p className="mb-1 font-semibold">대안:</p>
                {classification.alternatives?.map((a) => (
                  <p key={a.folder}>
                    · {a.folder} ({Math.round(a.confidence * 100)}%)
                  </p>
                ))}
              </div>
            )}
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={submitConfirm}
              disabled={isPending}
              className="flex-1 rounded-md bg-blue-600 px-4 py-2 text-sm font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
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
              className="rounded-md border border-slate-300 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 disabled:opacity-50"
            >
              취소
            </button>
          </div>
        </div>
      )}

      {/* 완료 */}
      {stage === 'done' && (
        <div className="space-y-3 rounded-xl border border-emerald-200 bg-emerald-50 p-5 text-center">
          <p className="text-base font-semibold text-emerald-700">✅ Drive에 저장 완료</p>
          <p className="text-xs text-slate-500">{classification?.target_folder_path} 에 저장됨</p>
          <button
            type="button"
            onClick={reset}
            className="rounded-md bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-700"
          >
            다음 파일
          </button>
        </div>
      )}

      {/* 에러 */}
      {error && (
        <div className="rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          <p className="font-semibold">에러</p>
          <p className="mt-1">{error}</p>
        </div>
      )}
    </div>
  )
}
