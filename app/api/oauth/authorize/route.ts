/**
 * OAuth 2.1 Authorization Endpoint.
 *
 * GET:  consent 페이지 렌더 (Supabase 로그인 안 됐으면 /login 으로 redirect).
 * POST: "허용" 클릭 시 인가 코드 발급 → 클라이언트(redirect_uri) 로 redirect.
 */
import crypto from 'node:crypto'

import { NextResponse } from 'next/server'

import { CODE_TTL_SEC, getServiceSupabase, hashToken, randomToken } from '@/lib/oauth/utils'
import { createClient } from '@/lib/supabase/server'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type AuthorizeParams = {
  response_type: string
  client_id: string
  redirect_uri: string
  code_challenge: string
  code_challenge_method: string
  state: string
  scope: string
}

function parseParams(searchParams: URLSearchParams): AuthorizeParams {
  return {
    response_type: searchParams.get('response_type') ?? '',
    client_id: searchParams.get('client_id') ?? '',
    redirect_uri: searchParams.get('redirect_uri') ?? '',
    code_challenge: searchParams.get('code_challenge') ?? '',
    code_challenge_method: searchParams.get('code_challenge_method') ?? 'S256',
    state: searchParams.get('state') ?? '',
    scope: searchParams.get('scope') ?? 'mcp',
  }
}

/** redirect_uri 가 등록된 것 중 하나와 일치하는지 + 클라이언트 정보 반환. */
async function validateClient(
  params: AuthorizeParams
): Promise<{ ok: true; clientName: string } | { ok: false; reason: string }> {
  if (params.response_type !== 'code')
    return { ok: false, reason: 'response_type 는 "code" 만 지원' }
  if (!params.client_id) return { ok: false, reason: 'client_id 없음' }
  if (!params.redirect_uri) return { ok: false, reason: 'redirect_uri 없음' }
  if (!params.code_challenge) return { ok: false, reason: 'code_challenge 필요 (PKCE)' }
  if (params.code_challenge_method !== 'S256')
    return { ok: false, reason: 'code_challenge_method 는 S256 만 지원' }

  const supabase = getServiceSupabase()
  const { data, error } = await supabase
    .from('oauth_clients')
    .select('client_id, client_name, redirect_uris')
    .eq('client_id', params.client_id)
    .maybeSingle()
  if (error || !data) return { ok: false, reason: '등록되지 않은 client_id' }
  const uris = (data.redirect_uris as string[]) ?? []
  if (!uris.includes(params.redirect_uri)) {
    return { ok: false, reason: 'redirect_uri 가 등록된 값과 일치하지 않음' }
  }
  return { ok: true, clientName: String(data.client_name ?? params.client_id) }
}

function htmlEscape(s: string): string {
  return s.replace(/[&<>"']/g, (c) => {
    if (c === '&') return '&amp;'
    if (c === '<') return '&lt;'
    if (c === '>') return '&gt;'
    if (c === '"') return '&quot;'
    return '&#39;'
  })
}

function consentPage(opts: {
  clientName: string
  scope: string
  userName: string
  csrf: string
  rawQuery: string
}): string {
  const { clientName, scope, userName, csrf, rawQuery } = opts
  return `<!doctype html>
<html lang="ko">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>토타로 워크툴 — 접근 허용</title>
<style>
  :root { color-scheme: light; }
  body {
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Text", "Pretendard", sans-serif;
    background: #f8fafc; color: #0f172a; margin: 0;
    display: flex; align-items: center; justify-content: center; min-height: 100vh;
  }
  .card {
    background: #fff; border-radius: 16px; padding: 32px 28px;
    box-shadow: 0 1px 3px rgba(0,0,0,0.04), 0 10px 40px rgba(0,0,0,0.08);
    max-width: 420px; width: 100%; box-sizing: border-box;
  }
  h1 { font-size: 18px; margin: 0 0 4px; }
  .sub { font-size: 13px; color: #64748b; margin: 0 0 24px; }
  .who { font-size: 14px; padding: 12px 14px; background: #f1f5f9; border-radius: 10px; margin: 0 0 16px; }
  .who strong { color: #0f172a; }
  .perms { font-size: 13px; color: #475569; margin: 0 0 24px; padding-left: 18px; }
  .perms li { margin: 6px 0; }
  .row { display: flex; gap: 10px; }
  button {
    flex: 1; font-size: 14px; padding: 11px 16px; border-radius: 10px;
    border: 0; cursor: pointer; font-weight: 500;
  }
  .approve { background: #0f172a; color: #fff; }
  .approve:hover { background: #1e293b; }
  .deny { background: #f1f5f9; color: #475569; }
  .deny:hover { background: #e2e8f0; }
  .meta { font-size: 11px; color: #94a3b8; margin-top: 18px; text-align: center; }
</style>
</head>
<body>
  <div class="card">
    <h1>워크툴 접근 허용</h1>
    <p class="sub">아래 앱이 토타로 워크툴의 데이터에 접근하려고 합니다.</p>
    <p class="who"><strong>${htmlEscape(clientName)}</strong> 가 <strong>${htmlEscape(userName)}</strong> 으로 접근</p>
    <ul class="perms">
      <li>우편실 자료 검색 + 본문 읽기</li>
      <li>태스크 · 팀원 조회</li>
      <li>GitHub 코드 · 개발 문서 읽기</li>
      <li>Claude 생성 문서 우편실에 저장</li>
    </ul>
    <form method="POST" action="/api/oauth/authorize?${htmlEscape(rawQuery)}" class="row">
      <input type="hidden" name="csrf" value="${htmlEscape(csrf)}">
      <input type="hidden" name="decision" id="decision" value="">
      <button class="deny"    type="submit" onclick="document.getElementById('decision').value='deny'">거부</button>
      <button class="approve" type="submit" onclick="document.getElementById('decision').value='approve'">허용</button>
    </form>
    <p class="meta">scope: ${htmlEscape(scope)}</p>
  </div>
</body>
</html>`
}

function errorPage(message: string): Response {
  return new Response(
    `<!doctype html><meta charset="utf-8"><title>OAuth 오류</title>
<body style="font-family:-apple-system,sans-serif;padding:40px;color:#0f172a;background:#f8fafc">
<h1 style="font-size:18px">접근 요청을 처리할 수 없습니다</h1>
<p style="color:#475569;font-size:14px">${htmlEscape(message)}</p>
</body>`,
    { status: 400, headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function GET(req: NextRequest): Promise<Response> {
  const url = new URL(req.url)
  const params = parseParams(url.searchParams)
  const validation = await validateClient(params)
  if (!validation.ok) return errorPage(validation.reason)

  // 사용자 로그인 확인 (Supabase Auth)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    // /login 으로 보내고, 로그인 후 이 URL 로 다시 돌아오게.
    const next = encodeURIComponent(`${url.pathname}${url.search}`)
    return NextResponse.redirect(new URL(`/login?next=${next}`, req.url))
  }

  // CSRF 토큰 — 단순 stateless 형식: sha256(user_id|client_id|state|secret)
  const csrf = crypto
    .createHash('sha256')
    .update(
      `${user.id}|${params.client_id}|${params.state}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`
    )
    .digest('hex')

  const userName =
    (user.user_metadata as { name?: string; full_name?: string } | undefined)?.name ??
    (user.user_metadata as { full_name?: string } | undefined)?.full_name ??
    user.email ??
    '나'

  return new Response(
    consentPage({
      clientName: validation.clientName,
      scope: params.scope,
      userName,
      csrf,
      rawQuery: url.search.replace(/^\?/, ''),
    }),
    { headers: { 'Content-Type': 'text/html; charset=utf-8' } }
  )
}

export async function POST(req: NextRequest): Promise<Response> {
  const url = new URL(req.url)
  const params = parseParams(url.searchParams)
  const validation = await validateClient(params)
  if (!validation.ok) return errorPage(validation.reason)

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return errorPage('세션 만료 — 다시 로그인해주세요.')

  const form = await req.formData()
  const csrf = String(form.get('csrf') ?? '')
  const decision = String(form.get('decision') ?? '')

  const expectedCsrf = crypto
    .createHash('sha256')
    .update(
      `${user.id}|${params.client_id}|${params.state}|${process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''}`
    )
    .digest('hex')
  if (csrf !== expectedCsrf) return errorPage('CSRF 검증 실패. 페이지를 새로고침해주세요.')

  const redirect = new URL(params.redirect_uri)
  if (decision !== 'approve') {
    redirect.searchParams.set('error', 'access_denied')
    redirect.searchParams.set('error_description', 'User denied')
    if (params.state) redirect.searchParams.set('state', params.state)
    // 303 See Other — POST → GET 으로 메서드 강제 변환 (OAuth 콜백은 GET 필수)
    return NextResponse.redirect(redirect, 303)
  }

  // 인가 코드 발급
  const code = randomToken()
  const codeHash = hashToken(code)
  const expiresAt = new Date(Date.now() + CODE_TTL_SEC * 1000).toISOString()

  const adminSb = getServiceSupabase()
  const { error: insErr } = await adminSb.from('oauth_codes').insert({
    code_hash: codeHash,
    client_id: params.client_id,
    user_id: user.id,
    redirect_uri: params.redirect_uri,
    code_challenge: params.code_challenge,
    code_challenge_method: params.code_challenge_method,
    scope: params.scope,
    expires_at: expiresAt,
  })
  if (insErr) return errorPage(`인가 코드 저장 실패: ${insErr.message}`)

  redirect.searchParams.set('code', code)
  if (params.state) redirect.searchParams.set('state', params.state)
  // 303 See Other — POST → GET 으로 메서드 강제 변환 (OAuth 콜백은 GET 필수)
  return NextResponse.redirect(redirect, 303)
}
