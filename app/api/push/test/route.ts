/**
 * 테스트 푸시 — 현재 로그인 사용자의 구독으로 '알림 켜짐' 푸시를 즉시 보낸다.
 * 구독 직후 클라이언트가 호출해 폰에서 실제 도착을 확인.
 */
import { sendPushToRecipients } from '@/lib/push/send'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

export async function POST(): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  const { sent } = await sendPushToRecipients([user.id], {
    title: 'Totaro 알림 켜짐 ✅',
    body: '이제 휴대폰으로 알림을 받아요.',
    url: '/',
    tag: 'push-test',
  })
  return Response.json({ ok: true, sent })
}
