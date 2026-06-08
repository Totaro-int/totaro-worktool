/**
 * Google 연락처 연결 시작.
 * 사용자가 /contacts 에서 "Google 연락처 연결" 클릭 → 여기 → Google 동의 페이지.
 */
import { NextResponse } from 'next/server'

import { buildAuthUrl } from '@/lib/google/oauth'
import { createClient } from '@/lib/supabase/server'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    const next = encodeURIComponent('/api/google/contacts/connect')
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url))
  }
  const origin = new URL(req.url).origin
  // state 에 user.id 박아 콜백에서 사용 (서버 액션에서 다시 인증 확인하니 안전)
  const authUrl = buildAuthUrl(origin, user.id)
  return NextResponse.redirect(authUrl)
}
