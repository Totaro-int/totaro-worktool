'use client'

import { useCallback, useMemo, useState, useTransition } from 'react'

import Link from 'next/link'
import { useDropzone } from 'react-dropzone'

import { type ContactRow, deleteContact, loadContacts, uploadAndExtractCard } from './actions'

export function ContactsClient({ initial }: { initial: ContactRow[] }): React.JSX.Element {
  const [contacts, setContacts] = useState<ContactRow[]>(initial)
  const [query, setQuery] = useState('')
  const [uploading, setUploading] = useState<File[] | null>(null)
  const [progress, setProgress] = useState<{ done: number; total: number } | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [selected, setSelected] = useState<ContactRow | null>(null)
  const [, startTransition] = useTransition()

  const filtered = useMemo(() => {
    if (!query) return contacts
    const q = query.toLowerCase()
    return contacts.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        (c.company ?? '').toLowerCase().includes(q) ||
        (c.title ?? '').toLowerCase().includes(q) ||
        (c.phone ?? '').includes(q) ||
        (c.mobile ?? '').includes(q) ||
        (c.email ?? '').toLowerCase().includes(q)
    )
  }, [contacts, query])

  const onDrop = useCallback(async (accepted: File[]) => {
    if (accepted.length === 0) return
    const images = accepted.filter((f) => f.type.startsWith('image/'))
    if (images.length === 0) {
      setError('이미지 파일만 가능합니다 (jpg/png/heic 등).')
      return
    }
    setError(null)
    setUploading(images)
    setProgress({ done: 0, total: images.length })

    for (let i = 0; i < images.length; i++) {
      const fd = new FormData()
      fd.append('card', images[i])
      const result = await uploadAndExtractCard(fd)
      if (result.ok && result.contact) {
        setContacts((prev) => [result.contact!, ...prev])
      } else {
        setError(`${images[i].name}: ${result.error ?? '실패'}`)
      }
      setProgress({ done: i + 1, total: images.length })
    }
    setUploading(null)
    setProgress(null)
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    multiple: true,
    accept: { 'image/*': [] },
  })

  function handleDelete(id: string): void {
    if (!confirm('이 연락처를 삭제할까요?')) return
    startTransition(async () => {
      await deleteContact(id)
      setContacts((prev) => prev.filter((c) => c.id !== id))
      setSelected(null)
    })
  }

  async function handleRefresh(): Promise<void> {
    const fresh = await loadContacts()
    setContacts(fresh)
  }

  return (
    <div className="min-h-screen p-6" style={{ backgroundColor: '#eef2f8' }}>
      <div className="mx-auto max-w-5xl space-y-5">
        {/* 헤더 */}
        <header className="flex items-center gap-3">
          <Link
            href="/hub"
            className="group inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50 hover:text-slate-900"
          >
            <span className="transition-transform group-hover:-translate-x-0.5">←</span>
            허브
          </Link>
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500 to-teal-600 text-2xl shadow-lg shadow-emerald-200/50">
            📇
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">회사 연락처</h1>
            <p className="text-xs text-slate-500">
              명함 사진 끌어다 놓으면 AI 가 글자 읽어서 연락처로 정리합니다.
            </p>
          </div>
        </header>

        {/* 드롭존 */}
        <div
          {...getRootProps()}
          className={`group relative cursor-pointer overflow-hidden rounded-2xl border-2 border-dashed bg-white transition-all ${
            isDragActive
              ? 'scale-[1.01] border-emerald-500 bg-emerald-50 shadow-lg shadow-emerald-200/50'
              : 'border-slate-300 hover:border-slate-400'
          }`}
        >
          <input {...getInputProps()} />
          <div className="px-6 py-8 text-center">
            {uploading && progress ? (
              <div className="space-y-2">
                <div className="text-3xl">⚙️</div>
                <p className="text-sm font-medium text-slate-700">
                  명함 OCR 중... {progress.done}/{progress.total}
                </p>
              </div>
            ) : isDragActive ? (
              <div className="space-y-1">
                <div className="text-3xl">⬇️</div>
                <p className="text-sm font-semibold text-emerald-700">여기에 놓으세요</p>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="text-3xl opacity-60 transition-opacity group-hover:opacity-90">
                  📸
                </div>
                <p className="text-sm font-medium text-slate-700">
                  명함 사진 끌어다 놓거나{' '}
                  <span className="text-emerald-600 underline">클릭해서 선택</span>
                </p>
                <p className="text-xs text-slate-400">
                  jpg · png · heic · webp · 여러 장 동시에 OK
                </p>
              </div>
            )}
          </div>
        </div>

        {error && (
          <div className="rounded-lg bg-rose-50 px-4 py-2.5 text-xs text-rose-700">{error}</div>
        )}

        {/* 검색 + 통계 */}
        <div className="flex items-center gap-3">
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="이름·회사·직책·전화·이메일 검색"
            className="flex-1 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm placeholder:text-slate-400 focus:border-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void handleRefresh()}
            className="rounded-lg bg-white px-3 py-2 text-xs text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            aria-label="새로고침"
          >
            🔄
          </button>
        </div>
        <div className="text-xs text-slate-500">
          총 {contacts.length}개 · 검색결과 {filtered.length}개
        </div>

        {/* 연락처 그리드 */}
        {filtered.length === 0 ? (
          <div className="rounded-xl bg-white p-12 text-center text-sm text-slate-400 ring-1 ring-slate-200">
            {contacts.length === 0
              ? '아직 등록된 명함이 없어요. 위에 사진 드롭하세요.'
              : '검색 결과 없음'}
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {filtered.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                isSelected={selected?.id === c.id}
                onClick={() => setSelected(c)}
              />
            ))}
          </div>
        )}

        {/* 상세 모달 */}
        {selected && (
          <ContactDetailModal
            contact={selected}
            onClose={() => setSelected(null)}
            onDelete={() => handleDelete(selected.id)}
          />
        )}
      </div>
    </div>
  )
}

function ContactCard({
  contact,
  isSelected,
  onClick,
}: {
  contact: ContactRow
  isSelected: boolean
  onClick: () => void
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`rounded-xl bg-white p-4 text-left shadow-sm ring-1 transition-all hover:shadow-md ${
        isSelected ? 'ring-2 ring-emerald-500' : 'ring-slate-200'
      }`}
    >
      <div className="flex items-start gap-3">
        {contact.cardSignedUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.cardSignedUrl}
            alt={contact.name}
            className="h-14 w-20 shrink-0 rounded-lg object-cover ring-1 ring-slate-100"
          />
        ) : (
          <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-2xl">
            📇
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-bold text-slate-900">{contact.name}</div>
          {contact.title && <div className="truncate text-xs text-slate-500">{contact.title}</div>}
          {contact.company && (
            <div className="mt-0.5 truncate text-xs font-medium text-slate-700">
              {contact.company}
            </div>
          )}
        </div>
      </div>
      <div className="mt-2.5 space-y-0.5 text-xs">
        {contact.mobile && <div className="text-slate-700">📱 {contact.mobile}</div>}
        {contact.phone && <div className="text-slate-700">☎️ {contact.phone}</div>}
        {contact.email && (
          <div className="truncate text-indigo-600 hover:text-indigo-800">📧 {contact.email}</div>
        )}
      </div>
    </button>
  )
}

function ContactDetailModal({
  contact,
  onClose,
  onDelete,
}: {
  contact: ContactRow
  onClose: () => void
  onDelete: () => void
}): React.JSX.Element {
  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center bg-black/40 p-4"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl bg-white shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        {contact.cardSignedUrl && (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={contact.cardSignedUrl}
            alt={contact.name}
            className="w-full rounded-t-2xl bg-slate-100 object-contain"
            style={{ maxHeight: '240px' }}
          />
        )}
        <div className="space-y-3 p-5">
          <div>
            <div className="text-xl font-bold text-slate-900">{contact.name}</div>
            {contact.title && <div className="text-sm text-slate-600">{contact.title}</div>}
            {contact.company && (
              <div className="mt-0.5 text-sm font-medium text-slate-700">{contact.company}</div>
            )}
          </div>

          <div className="space-y-1.5 text-sm">
            <Field icon="📱" label="휴대전화" value={contact.mobile} copy />
            <Field icon="☎️" label="전화" value={contact.phone} copy />
            <Field
              icon="📧"
              label="이메일"
              value={contact.email}
              copy
              link={`mailto:${contact.email}`}
            />
            <Field
              icon="🌐"
              label="웹사이트"
              value={contact.website}
              link={contact.website ?? undefined}
            />
            <Field icon="📍" label="주소" value={contact.address} />
            {contact.memo && <Field icon="📝" label="메모" value={contact.memo} />}
          </div>

          {contact.extracted_by_ai && (
            <div className="rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-700">
              🤖 AI OCR (신뢰도 {Math.round((contact.extraction_confidence ?? 0) * 100)}%)
            </div>
          )}

          <div className="flex justify-between pt-2">
            <button
              type="button"
              onClick={onDelete}
              className="rounded-lg px-3 py-1.5 text-xs text-rose-600 hover:bg-rose-50"
            >
              삭제
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-lg bg-slate-900 px-4 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
            >
              닫기
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function Field({
  icon,
  label,
  value,
  copy,
  link,
}: {
  icon: string
  label: string
  value: string | null
  copy?: boolean
  link?: string
}): React.JSX.Element | null {
  if (!value) return null
  const inner = link ? (
    <a
      href={link}
      target="_blank"
      rel="noreferrer"
      className="text-indigo-600 hover:text-indigo-800 hover:underline"
    >
      {value}
    </a>
  ) : (
    <span className="text-slate-800">{value}</span>
  )
  return (
    <div className="flex items-start gap-2">
      <span className="mt-0.5">{icon}</span>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] text-slate-400 uppercase">{label}</div>
        <div className="text-sm break-all">{inner}</div>
      </div>
      {copy && (
        <button
          type="button"
          onClick={() => void navigator.clipboard?.writeText(value)}
          className="shrink-0 rounded px-1.5 py-0.5 text-[10px] text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        >
          복사
        </button>
      )}
    </div>
  )
}
