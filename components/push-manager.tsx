'use client'

import { useCallback, useEffect, useState } from 'react'

// 빌드 타임에 인라인됨. 키 없으면 버튼 자체가 안 뜸(앱 안 깨짐).
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY

/** base64url VAPID 공개키 → Uint8Array (pushManager.subscribe 가 요구). */
function urlBase64ToUint8Array(base64: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64.length % 4)) % 4)
  const b64 = (base64 + padding).replace(/-/g, '+').replace(/_/g, '/')
  const raw = atob(b64)
  const arr = new Uint8Array(raw.length)
  for (let i = 0; i < raw.length; i += 1) arr[i] = raw.charCodeAt(i)
  return arr
}

/**
 * 휴대폰 알림(Web Push) 켜기 버튼 + 서비스워커 등록.
 * 미지원·이미구독·권한거부·키없음 이면 아무것도 렌더 안 함.
 */
export function PushManager(): React.JSX.Element | null {
  const [supported, setSupported] = useState(false)
  const [permission, setPermission] = useState<NotificationPermission>('default')
  const [subscribed, setSubscribed] = useState(false)
  const [busy, setBusy] = useState(false)

  useEffect(() => {
    if (typeof window === 'undefined') return
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !VAPID_PUBLIC) return
    let cancelled = false
    // 동기 setState 회피 — 다음 tick 으로 (cascading render 방지, 코드베이스 패턴)
    const t = setTimeout(() => {
      if (cancelled) return
      setSupported(true)
      setPermission(Notification.permission)
      navigator.serviceWorker
        .register('/sw.js')
        .then((reg) => reg.pushManager.getSubscription())
        .then((sub) => {
          if (!cancelled) setSubscribed(Boolean(sub))
        })
        .catch(() => {})
    }, 0)
    return () => {
      cancelled = true
      clearTimeout(t)
    }
  }, [])

  const enable = useCallback(async () => {
    if (!VAPID_PUBLIC) return
    setBusy(true)
    try {
      const perm = await Notification.requestPermission()
      setPermission(perm)
      if (perm !== 'granted') return
      const reg = await navigator.serviceWorker.ready
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      })
      const json = sub.toJSON()
      await fetch('/api/push/subscribe', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ endpoint: json.endpoint, keys: json.keys }),
      })
      setSubscribed(true)
      // 즉시 테스트 푸시 → 폰에서 도착 확인
      await fetch('/api/push/test', { method: 'POST' })
    } catch {
      // 무시 — 다음에 다시 시도 가능
    } finally {
      setBusy(false)
    }
  }, [])

  if (!supported || subscribed || permission === 'denied') return null

  return (
    <button
      type="button"
      onClick={() => void enable()}
      disabled={busy}
      className="fixed right-4 bottom-4 z-50 inline-flex items-center gap-2 rounded-full bg-slate-900 px-4 py-2.5 text-sm font-medium text-white shadow-lg ring-1 ring-slate-700 transition-colors hover:bg-slate-800 disabled:opacity-60"
    >
      🔔 {busy ? '켜는 중…' : '휴대폰 알림 켜기'}
    </button>
  )
}
