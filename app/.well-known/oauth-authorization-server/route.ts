/**
 * OAuth 2.0 Authorization Server Metadata (RFC 8414).
 * claude.ai 가 등록/인가/토큰 엔드포인트 URL 을 여기서 알아낸다.
 */
import { NextResponse } from 'next/server'

import { getIssuer } from '@/lib/oauth/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const issuer = getIssuer(req)
  return NextResponse.json(
    {
      issuer,
      authorization_endpoint: `${issuer}/api/oauth/authorize`,
      token_endpoint: `${issuer}/api/oauth/token`,
      registration_endpoint: `${issuer}/api/oauth/register`,
      response_types_supported: ['code'],
      grant_types_supported: ['authorization_code', 'refresh_token'],
      code_challenge_methods_supported: ['S256'],
      token_endpoint_auth_methods_supported: ['none'],
      scopes_supported: ['mcp'],
      service_documentation: `${issuer}/api/mcp`,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
