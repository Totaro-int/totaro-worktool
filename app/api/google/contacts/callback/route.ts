/**
 * Google 연락처 OAuth 콜백 — code → token 교환 → 저장 → /contacts 로 복귀.
 */
import { NextResponse } from 'next/server'

import { exchangeCode, saveTokens } from '@/lib/google/oauth'
import { createClient } from '@/lib/supabase/server'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') ?? ''
  const err = url.searchParams.get('error')

  if (err) {
    return NextResponse.redirect(
      new URL(`/contacts?google_error=${encodeURIComponent(err)}`, req.url)
    )
  }
  if (!code) {
    return NextResponse.redirect(new URL('/contacts?google_error=no_code', req.url))
  }

  // 실제 로그인 사용자 확인 (state 에 박힌 user_id 와 일치해야 안전)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user || user.id !== state) {
    return NextResponse.redirect(new URL('/contacts?google_error=auth_mismatch', req.url))
  }

  try {
    const tokens = await exchangeCode(code, url.origin)
    await saveTokens(user.id, tokens)
    return NextResponse.redirect(new URL('/contacts?google=connected', req.url))
  } catch (e) {
    const msg = encodeURIComponent(e instanceof Error ? e.message : 'unknown')
    return NextResponse.redirect(new URL(`/contacts?google_error=${msg}`, req.url))
  }
}
