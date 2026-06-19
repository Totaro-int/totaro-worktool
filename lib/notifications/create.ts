/**
 * 알림 생성 — 인앱 알림 INSERT + 폰 푸시 발송을 한 번에.
 *
 * 모든 알림 트리거(문서 전달·새 우편·김사현 보고 등)가 이걸 거치면 자동으로 폰까지 간다.
 * service_role 로 쓰므로 서버(Server Action·route·cron)에서만 호출.
 */
import { getServiceSupabase } from '@/lib/oauth/utils'
import { sendPushToRecipients } from '@/lib/push/send'

export type CreateNotificationInput = {
  recipientIds: string[]
  type: string
  title: string
  body?: string | null
  link?: string | null
  relatedTable?: string | null
  relatedId?: string | null
}

/** 인앱 알림 행 생성 + 폰 푸시. 푸시 실패는 무시(인앱 알림은 그대로 남음). */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  const ids = Array.from(new Set(input.recipientIds.filter(Boolean)))
  if (ids.length === 0) return

  const sb = getServiceSupabase()
  await sb.from('notifications').insert(
    ids.map((rid) => ({
      recipient_id: rid,
      type: input.type,
      title: input.title,
      body: input.body ?? null,
      link: input.link ?? null,
      related_table: input.relatedTable ?? null,
      related_id: input.relatedId ?? null,
    }))
  )

  await sendPushToRecipients(ids, {
    title: input.title,
    body: input.body ?? undefined,
    url: input.link ?? '/',
    tag: input.relatedId ?? input.type,
  })
}
