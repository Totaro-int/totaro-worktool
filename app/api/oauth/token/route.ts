/**
 * OAuth 2.1 Token Endpoint.
 * POST form-encoded — RFC 6749 표준 (JSON 아님).
 *
 * 지원 grant:
 *   - authorization_code  (PKCE 필수)
 *   - 추후 refresh_token  (현재 미지원)
 */
import { NextResponse } from 'next/server'

import {
  TOKEN_TTL_SEC,
  getServiceSupabase,
  hashToken,
  randomToken,
  verifyPkce,
} from '@/lib/oauth/utils'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

function tokenError(code: string, description?: string, status = 400): Response {
  return NextResponse.json(
    { error: code, error_description: description },
    { status, headers: CORS_HEADERS }
  )
}

export async function POST(req: NextRequest): Promise<Response> {
  let params: URLSearchParams
  const ct = (req.headers.get('content-type') ?? '').toLowerCase()
  try {
    if (ct.includes('application/json')) {
      const json = (await req.json()) as Record<string, string>
      params = new URLSearchParams(json)
    } else {
      const text = await req.text()
      params = new URLSearchParams(text)
    }
  } catch {
    return tokenError('invalid_request', '본문 파싱 실패')
  }

  const grantType = params.get('grant_type') ?? ''
  if (grantType !== 'authorization_code') {
    return tokenError('unsupported_grant_type', `지원하지 않는 grant_type: ${grantType}`)
  }

  const code = params.get('code') ?? ''
  const clientId = params.get('client_id') ?? ''
  const redirectUri = params.get('redirect_uri') ?? ''
  const codeVerifier = params.get('code_verifier') ?? ''
  if (!code || !clientId || !redirectUri || !codeVerifier) {
    return tokenError('invalid_request', 'code · client_id · redirect_uri · code_verifier 필수')
  }

  const supabase = getServiceSupabase()
  const codeHash = hashToken(code)

  // 코드 조회
  const { data: codeRow, error: codeErr } = await supabase
    .from('oauth_codes')
    .select(
      'code_hash, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, scope, expires_at'
    )
    .eq('code_hash', codeHash)
    .maybeSingle()
  if (codeErr || !codeRow) return tokenError('invalid_grant', '인가 코드를 찾을 수 없음')

  // 만료
  if (new Date(codeRow.expires_at as string).getTime() < Date.now()) {
    await supabase.from('oauth_codes').delete().eq('code_hash', codeHash)
    return tokenError('invalid_grant', '인가 코드 만료')
  }

  // client_id / redirect_uri 일치
  if (codeRow.client_id !== clientId) return tokenError('invalid_grant', 'client_id 불일치')
  if (codeRow.redirect_uri !== redirectUri)
    return tokenError('invalid_grant', 'redirect_uri 불일치')

  // PKCE 검증
  if (
    !verifyPkce(codeVerifier, String(codeRow.code_challenge), String(codeRow.code_challenge_method))
  ) {
    return tokenError('invalid_grant', 'PKCE 검증 실패')
  }

  // 코드 단일 사용 — 즉시 삭제
  await supabase.from('oauth_codes').delete().eq('code_hash', codeHash)

  // 액세스 토큰 발급
  const accessToken = randomToken()
  const tokenHashStr = hashToken(accessToken)
  const expiresAt = new Date(Date.now() + TOKEN_TTL_SEC * 1000).toISOString()

  const { error: insErr } = await supabase.from('oauth_tokens').insert({
    token_hash: tokenHashStr,
    client_id: clientId,
    user_id: codeRow.user_id,
    scope: codeRow.scope,
    expires_at: expiresAt,
  })
  if (insErr) return tokenError('server_error', `토큰 저장 실패: ${insErr.message}`, 500)

  return NextResponse.json(
    {
      access_token: accessToken,
      token_type: 'Bearer',
      expires_in: TOKEN_TTL_SEC,
      scope: codeRow.scope,
    },
    { status: 200, headers: CORS_HEADERS }
  )
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
