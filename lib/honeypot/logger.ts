import { createServiceClient } from '@/lib/supabase/service'

import type { NextRequest } from 'next/server'

export interface HitExtras {
  status: number
  bytesReturned: number | null
  responseMs: number | null
}

/**
 * Honeypot 요청 1건을 supabase 에 기록한다.
 * **반드시 await 가 아닌 `after(logHit(...))` 형태로 호출**해서 응답 지연을 막을 것.
 */
export async function logHit(
  req: NextRequest,
  variant: string,
  honeypotId: string,
  extras: HitExtras
): Promise<void> {
  try {
    const supabase = createServiceClient()
    const url = new URL(req.url)

    const headers: Record<string, string> = {}
    req.headers.forEach((value, key) => {
      headers[key] = value
    })

    const query: Record<string, string> = {}
    url.searchParams.forEach((value, key) => {
      query[key] = value
    })

    const xff = req.headers.get('x-forwarded-for')
    const ip = xff?.split(',')[0]?.trim() ?? req.headers.get('x-real-ip')

    await supabase.from('honeypot_hits').insert({
      honeypot_id: honeypotId,
      variant,
      method: req.method,
      url: req.url,
      query,
      ip,
      user_agent: req.headers.get('user-agent'),
      referer: req.headers.get('referer'),
      accept: req.headers.get('accept'),
      accept_language: req.headers.get('accept-language'),
      accept_encoding: req.headers.get('accept-encoding'),
      cf_ray: req.headers.get('cf-ray'),
      x_forwarded_for: xff,
      headers,
      status_returned: extras.status,
      bytes_returned: extras.bytesReturned,
      response_ms: extras.responseMs,
    })
  } catch (error) {
    // 로깅 실패가 honeypot 응답을 깨면 안 됨 — 조용히 console 으로
    console.error('[honeypot] log failed:', error)
  }
}
