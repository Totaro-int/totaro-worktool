/**
 * Web Push 구독 저장/해제. 클라이언트가 pushManager.subscribe 후 여기에 등록한다.
 * endpoint 기준 upsert(같은 기기 재구독 시 갱신).
 */
import { getServiceSupabase } from '@/lib/oauth/utils'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'

type SubBody = { endpoint?: string; keys?: { p256dh?: string; auth?: string } }

export async function POST(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: SubBody
  try {
    body = (await req.json()) as SubBody
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  const endpoint = body.endpoint
  const p256dh = body.keys?.p256dh
  const auth = body.keys?.auth
  if (!endpoint || !p256dh || !auth) return new Response('invalid subscription', { status: 400 })

  const sb = getServiceSupabase()
  const ua = req.headers.get('user-agent')?.slice(0, 300) ?? null
  const { error } = await sb
    .from('push_subscriptions')
    .upsert(
      { recipient_id: user.id, endpoint, p256dh, auth, user_agent: ua },
      { onConflict: 'endpoint' }
    )
  if (error) return new Response(error.message, { status: 500 })
  return Response.json({ ok: true })
}

export async function DELETE(req: Request): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { endpoint?: string }
  try {
    body = (await req.json()) as { endpoint?: string }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }
  if (!body.endpoint) return new Response('missing endpoint', { status: 400 })

  const sb = getServiceSupabase()
  await sb
    .from('push_subscriptions')
    .delete()
    .eq('endpoint', body.endpoint)
    .eq('recipient_id', user.id)
  return Response.json({ ok: true })
}
