/**
 * OAuth 2.0 Dynamic Client Registration (RFC 7591).
 * claude.ai 가 "나를 클라이언트로 등록해줘" 라고 한 번 POST.
 * 우리는 client_id 만 발급 (PKCE public client — secret 없음).
 */
import { NextResponse } from 'next/server'

import { getServiceSupabase, randomClientId } from '@/lib/oauth/utils'

import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
}

type RegistrationRequest = {
  client_name?: string
  redirect_uris?: string[]
  token_endpoint_auth_method?: string
  grant_types?: string[]
  response_types?: string[]
  scope?: string
}

export async function POST(req: NextRequest): Promise<Response> {
  let body: RegistrationRequest
  try {
    body = (await req.json()) as RegistrationRequest
  } catch {
    return NextResponse.json(
      { error: 'invalid_client_metadata', error_description: 'JSON 파싱 실패' },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const redirectUris = Array.isArray(body.redirect_uris)
    ? body.redirect_uris.filter((u) => typeof u === 'string' && u.length > 0)
    : []
  if (redirectUris.length === 0) {
    return NextResponse.json(
      {
        error: 'invalid_redirect_uri',
        error_description: 'redirect_uris 한 개 이상 필요',
      },
      { status: 400, headers: CORS_HEADERS }
    )
  }

  const clientName = (body.client_name ?? '').toString().slice(0, 200) || 'Unnamed Client'
  const clientId = randomClientId()

  const supabase = getServiceSupabase()
  const { error } = await supabase.from('oauth_clients').insert({
    client_id: clientId,
    client_name: clientName,
    redirect_uris: redirectUris,
    metadata: {
      token_endpoint_auth_method: body.token_endpoint_auth_method ?? 'none',
      grant_types: body.grant_types ?? ['authorization_code'],
      response_types: body.response_types ?? ['code'],
      scope: body.scope ?? 'mcp',
    },
  })
  if (error) {
    return NextResponse.json(
      { error: 'server_error', error_description: error.message },
      { status: 500, headers: CORS_HEADERS }
    )
  }

  return NextResponse.json(
    {
      client_id: clientId,
      client_name: clientName,
      redirect_uris: redirectUris,
      grant_types: ['authorization_code'],
      response_types: ['code'],
      token_endpoint_auth_method: 'none',
      scope: 'mcp',
    },
    { status: 201, headers: CORS_HEADERS }
  )
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}
