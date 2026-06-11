/**
 * Google OAuth 2.0 클라이언트 — 사용자별 People API 접근용.
 *
 * 흐름:
 *   1) /api/google/contacts/connect  → Google 동의 페이지로 redirect
 *   2) Google → /api/google/contacts/callback?code=...
 *   3) code → access/refresh token 교환 → google_oauth_tokens 저장
 *   4) 이후 contacts 동기화 시 refresh 자동
 */
import { getServiceSupabase } from '@/lib/oauth/utils'

// 한 번 동의로 contacts + calendar 둘 다. 기존 contacts 사용자는 prompt=consent 로
// 다음 OAuth 시 calendar 권한 자동 추가됨 (include_granted_scopes).
const SCOPES = [
  'https://www.googleapis.com/auth/contacts',
  'https://www.googleapis.com/auth/calendar.events',
  'openid',
  'email',
]
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
const AUTH_URL = 'https://accounts.google.com/o/oauth2/v2/auth'

export function getClientCreds(): { clientId: string; clientSecret: string } {
  const clientId = process.env.GOOGLE_OAUTH_CLIENT_ID
  const clientSecret = process.env.GOOGLE_OAUTH_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    throw new Error('GOOGLE_OAUTH_CLIENT_ID / GOOGLE_OAUTH_CLIENT_SECRET env 필요')
  }
  return { clientId, clientSecret }
}

export function buildRedirectUri(origin: string): string {
  return `${origin}/api/google/contacts/callback`
}

/** Google 동의 페이지 URL 생성 (state 에 사용자 식별자). */
export function buildAuthUrl(origin: string, state: string): string {
  const { clientId } = getClientCreds()
  const p = new URLSearchParams({
    client_id: clientId,
    redirect_uri: buildRedirectUri(origin),
    response_type: 'code',
    scope: SCOPES.join(' '),
    access_type: 'offline', // refresh_token 받기
    prompt: 'consent', // 항상 refresh_token 발급되게
    include_granted_scopes: 'true',
    state,
  })
  return `${AUTH_URL}?${p.toString()}`
}

type TokenResponse = {
  access_token: string
  refresh_token?: string
  expires_in: number
  scope?: string
  token_type: string
  id_token?: string
}

/** code → token 교환 (callback 에서 호출). */
export async function exchangeCode(code: string, origin: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getClientCreds()
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: buildRedirectUri(origin),
      grant_type: 'authorization_code',
    }),
  })
  if (!r.ok) throw new Error(`token exchange ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()) as TokenResponse
}

/** refresh_token → 새 access_token. */
async function refreshAccessToken(refreshToken: string): Promise<TokenResponse> {
  const { clientId, clientSecret } = getClientCreds()
  const r = await fetch(TOKEN_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      client_id: clientId,
      client_secret: clientSecret,
      refresh_token: refreshToken,
      grant_type: 'refresh_token',
    }),
  })
  if (!r.ok) throw new Error(`refresh ${r.status}: ${(await r.text()).slice(0, 200)}`)
  return (await r.json()) as TokenResponse
}

/** id_token 디코드 → email 만 (검증 X — 동일 도메인 Google 응답이라 단순 파싱). */
function emailFromIdToken(idToken: string | undefined): string | null {
  if (!idToken) return null
  try {
    const payload = idToken.split('.')[1]
    const json = JSON.parse(Buffer.from(payload, 'base64').toString('utf-8')) as { email?: string }
    return json.email ?? null
  } catch {
    return null
  }
}

/** 토큰 발급 직후 저장 (callback 에서 호출). */
export async function saveTokens(userId: string, tokens: TokenResponse): Promise<void> {
  const admin = getServiceSupabase()
  const expiresAt = new Date(Date.now() + tokens.expires_in * 1000).toISOString()
  const email = emailFromIdToken(tokens.id_token)
  await admin.from('google_oauth_tokens').upsert(
    {
      user_id: userId,
      provider: 'google_contacts',
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token ?? null,
      scope: tokens.scope ?? SCOPES.join(' '),
      expires_at: expiresAt,
      email,
    },
    { onConflict: 'user_id' }
  )
}

/** 사용자 connection 정보 조회 (UI 표시용). */
export async function getConnection(
  userId: string
): Promise<{ connected: boolean; email: string | null }> {
  const admin = getServiceSupabase()
  const { data } = await admin
    .from('google_oauth_tokens')
    .select('email, refresh_token')
    .eq('user_id', userId)
    .maybeSingle()
  return { connected: Boolean(data?.refresh_token), email: (data?.email as string) ?? null }
}

/**
 * 사용자의 유효 access_token 반환. 만료 1분 전이면 자동 refresh + 저장.
 * 토큰 없으면 null → 호출부가 connect 유도.
 */
export async function getAccessToken(userId: string): Promise<string | null> {
  const admin = getServiceSupabase()
  const { data: row } = await admin
    .from('google_oauth_tokens')
    .select('access_token, refresh_token, expires_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (!row || !row.refresh_token) return null
  const expiresAt = row.expires_at ? new Date(row.expires_at as string).getTime() : 0
  if (expiresAt - Date.now() > 60_000) return row.access_token as string

  try {
    const refreshed = await refreshAccessToken(row.refresh_token as string)
    const newExpires = new Date(Date.now() + refreshed.expires_in * 1000).toISOString()
    await admin
      .from('google_oauth_tokens')
      .update({ access_token: refreshed.access_token, expires_at: newExpires })
      .eq('user_id', userId)
    return refreshed.access_token
  } catch {
    return null
  }
}

export async function disconnect(userId: string): Promise<void> {
  const admin = getServiceSupabase()
  await admin.from('google_oauth_tokens').delete().eq('user_id', userId)
}
