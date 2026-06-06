/**
 * OAuth 2.0 Protected Resource Metadata (RFC 9728).
 * claude.ai 가 401 을 받으면 여기를 조회해 "인가 서버가 어디인지" 알아낸다.
 */
import { NextResponse } from 'next/server'

import { getIssuer } from '@/lib/oauth/utils'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function GET(req: Request): Promise<Response> {
  const issuer = getIssuer(req)
  return NextResponse.json(
    {
      resource: `${issuer}/api/mcp`,
      authorization_servers: [issuer],
      scopes_supported: ['mcp'],
      bearer_methods_supported: ['header'],
      resource_documentation: `${issuer}/api/mcp`,
    },
    {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=3600',
      },
    }
  )
}
