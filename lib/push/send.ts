/**
 * Web Push 발송 — recipient(들)의 저장된 구독으로 푸시. PWA 가 닫혀 있어도 폰에 알림.
 *
 * VAPID 키(NEXT_PUBLIC_VAPID_PUBLIC_KEY / VAPID_PRIVATE_KEY)가 없으면 조용히 스킵한다
 * — 키 등록 전에도 인앱 알림은 그대로 동작하고 앱이 안 깨지도록.
 */
import webpush from 'web-push'

import { getServiceSupabase } from '@/lib/oauth/utils'

let configured: boolean | null = null

/** VAPID 설정(1회). 키 없으면 false → 발송 스킵. */
function ensureVapid(): boolean {
  if (configured !== null) return configured
  const pub = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY
  const priv = process.env.VAPID_PRIVATE_KEY
  if (!pub || !priv) {
    configured = false
    return false
  }
  const subject = process.env.VAPID_SUBJECT ?? 'mailto:admin@totaro.team'
  webpush.setVapidDetails(subject, pub, priv)
  configured = true
  return true
}

export type PushPayload = {
  title: string
  body?: string
  url?: string
  tag?: string
}

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string }

/** recipient_id 목록의 모든 구독으로 푸시. 죽은 구독(404/410)은 삭제. 실패해도 throw 안 함. */
export async function sendPushToRecipients(
  recipientIds: string[],
  payload: PushPayload
): Promise<{ sent: number; pruned: number }> {
  const ids = Array.from(new Set(recipientIds.filter(Boolean)))
  if (!ensureVapid() || ids.length === 0) return { sent: 0, pruned: 0 }
  try {
    const sb = getServiceSupabase()
    const { data } = await sb
      .from('push_subscriptions')
      .select('id, endpoint, p256dh, auth')
      .in('recipient_id', ids)
    const subs = (data ?? []) as SubRow[]
    if (subs.length === 0) return { sent: 0, pruned: 0 }

    const body = JSON.stringify(payload)
    const dead: string[] = []
    let sent = 0
    await Promise.all(
      subs.map(async (s) => {
        try {
          await webpush.sendNotification(
            { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
            body
          )
          sent += 1
        } catch (e) {
          const code = (e as { statusCode?: number }).statusCode
          if (code === 404 || code === 410) dead.push(s.id)
        }
      })
    )
    if (dead.length > 0) await sb.from('push_subscriptions').delete().in('id', dead)
    return { sent, pruned: dead.length }
  } catch {
    return { sent: 0, pruned: 0 }
  }
}
