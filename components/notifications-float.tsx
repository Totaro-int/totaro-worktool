'use client'

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  loadNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  type NotificationItem,
} from '@/lib/notifications/actions'

const POLL_INTERVAL_MS = 30_000
const TOAST_DURATION_MS = 6_000

export function NotificationsFloat(): React.JSX.Element {
  const [items, setItems] = useState<NotificationItem[]>([])
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState<NotificationItem | null>(null)
  const seenIds = useRef<Set<string>>(new Set())
  const dropdownRef = useRef<HTMLDivElement>(null)

  const refresh = useCallback(async (isInitial: boolean) => {
    try {
      const next = await loadNotifications(20)
      // 새로 들어온 거 (unread 중 seenIds 에 없는 것) → 최신 1개를 토스트
      const newOnes = next.filter((n) => !n.readAt && !seenIds.current.has(n.id))
      next.forEach((n) => seenIds.current.add(n.id))
      setItems(next)
      if (!isInitial && newOnes.length > 0) {
        setToast(newOnes[0])
      }
    } catch {
      // 조용히 무시
    }
  }, [])

  // 초기 + 30초 폴링 — setState 캐스케이드 방지를 위해 초기 호출도 다음 tick 으로
  useEffect(() => {
    const first = setTimeout(() => void refresh(true), 0)
    const id = setInterval(() => void refresh(false), POLL_INTERVAL_MS)
    return () => {
      clearTimeout(first)
      clearInterval(id)
    }
  }, [refresh])

  // 토스트 자동 닫힘
  useEffect(() => {
    if (!toast) return
    const id = setTimeout(() => setToast(null), TOAST_DURATION_MS)
    return () => clearTimeout(id)
  }, [toast])

  // 드롭다운 바깥 클릭 시 닫기
  useEffect(() => {
    function onDown(e: MouseEvent): void {
      if (!dropdownRef.current) return
      if (!dropdownRef.current.contains(e.target as Node)) setOpen(false)
    }
    if (open) document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [open])

  const unreadCount = items.filter((i) => !i.readAt).length

  async function handleMarkOne(id: string): Promise<void> {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, readAt: new Date().toISOString() } : n))
    )
    await markNotificationRead(id)
  }

  async function handleMarkAll(): Promise<void> {
    const now = new Date().toISOString()
    setItems((prev) => prev.map((n) => (n.readAt ? n : { ...n, readAt: now })))
    await markAllNotificationsRead()
  }

  return (
    <>
      {/* 종 + 드롭다운 (우측 상단 고정) */}
      <div ref={dropdownRef} className="fixed top-3 right-3 z-50">
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="relative inline-flex h-10 w-10 items-center justify-center rounded-full bg-white text-slate-700 shadow-md ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
          aria-label="알림"
        >
          <BellIcon />
          {unreadCount > 0 && (
            <span className="absolute -top-1 -right-1 flex h-5 min-w-[20px] items-center justify-center rounded-full bg-rose-500 px-1 text-[11px] font-semibold text-white">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
          )}
        </button>

        {open && (
          <div className="absolute top-12 right-0 max-h-[70vh] w-96 overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div className="text-sm font-semibold text-slate-900">알림</div>
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={() => void handleMarkAll()}
                  className="text-xs text-slate-500 hover:text-slate-700"
                >
                  모두 읽음
                </button>
              )}
            </div>
            <div className="max-h-[60vh] overflow-y-auto">
              {items.length === 0 && (
                <div className="px-4 py-10 text-center text-sm text-slate-400">알림 없음</div>
              )}
              {items.map((n) => (
                <NotificationRow key={n.id} item={n} onMarkRead={() => void handleMarkOne(n.id)} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 새 알림 토스트 */}
      {toast && (
        <div
          role="alert"
          className="animate-in fixed top-3 right-16 z-50 w-80 rounded-xl bg-white p-4 shadow-lg ring-1 ring-slate-200"
        >
          <div className="flex items-start gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
              📬
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-slate-900">{toast.title}</div>
              {toast.body && (
                <div className="mt-0.5 text-xs text-slate-600">{toast.body.slice(0, 90)}</div>
              )}
              {toast.doc?.driveUrl && (
                <a
                  href={toast.doc.driveUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="mt-1.5 inline-flex items-center gap-1 text-xs font-medium text-indigo-600 hover:text-indigo-800"
                  onClick={() => void handleMarkOne(toast.id)}
                >
                  🔗 Drive 에서 열기
                </a>
              )}
            </div>
            <button
              type="button"
              onClick={() => setToast(null)}
              className="text-slate-400 hover:text-slate-700"
              aria-label="닫기"
            >
              ✕
            </button>
          </div>
        </div>
      )}
    </>
  )
}

function NotificationRow({
  item,
  onMarkRead,
}: {
  item: NotificationItem
  onMarkRead: () => void
}): React.JSX.Element {
  const isUnread = !item.readAt
  return (
    <div
      className={`border-b border-slate-100 px-4 py-3 transition-colors hover:bg-slate-50 ${
        isUnread ? 'bg-indigo-50/40' : ''
      }`}
    >
      <div className="flex items-start gap-2">
        {isUnread && <span className="mt-1.5 h-2 w-2 shrink-0 rounded-full bg-indigo-500" />}
        <div className="min-w-0 flex-1">
          <div className="text-sm font-medium text-slate-900">{item.title}</div>
          {item.body && <div className="mt-0.5 text-xs text-slate-600">{item.body}</div>}
          {item.doc?.folderPath && (
            <div className="mt-0.5 text-xs text-slate-400">📁 {item.doc.folderPath}</div>
          )}
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            {item.doc?.driveUrl && (
              <a
                href={item.doc.driveUrl}
                target="_blank"
                rel="noreferrer"
                onClick={onMarkRead}
                className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-2 py-1 text-[11px] font-medium text-white hover:bg-slate-800"
              >
                🔗 Drive
              </a>
            )}
            {item.link && (
              <a
                href={item.link}
                onClick={onMarkRead}
                className="inline-flex items-center gap-1 rounded-md bg-white px-2 py-1 text-[11px] font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50"
              >
                /inbox 에서 보기
              </a>
            )}
            {isUnread && (
              <button
                type="button"
                onClick={onMarkRead}
                className="rounded-md px-2 py-1 text-[11px] text-slate-400 hover:text-slate-700"
              >
                읽음 표시
              </button>
            )}
          </div>
        </div>
        <div className="shrink-0 text-[11px] text-slate-400">{relativeTime(item.createdAt)}</div>
      </div>
    </div>
  )
}

function BellIcon(): React.JSX.Element {
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
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )
}

function relativeTime(iso: string): string {
  if (!iso) return ''
  const ms = Date.now() - new Date(iso).getTime()
  if (ms < 60_000) return '방금'
  if (ms < 3_600_000) return `${Math.floor(ms / 60_000)}분 전`
  if (ms < 86_400_000) return `${Math.floor(ms / 3_600_000)}시간 전`
  const days = Math.floor(ms / 86_400_000)
  if (days < 7) return `${days}일 전`
  return new Date(iso).toLocaleDateString('ko-KR', { month: '2-digit', day: '2-digit' })
}
