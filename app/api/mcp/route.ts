/**
 * 토타로 워크툴 MCP 서버 — HTTP transport (claude.ai Custom Connector 용).
 *
 * 핸들러·도구 정의는 lib/mcp/{handlers,tools}.ts 에 있고 stdio (scripts/mailroom-mcp.ts) 와 공유.
 *
 * 인증: `Authorization: Bearer <MCP_BEARER_TOKEN>` 헤더.
 *   토큰은 Vercel env var 로 관리, claude.ai 등록 시 한 번 붙여넣기.
 *
 * 프로토콜: JSON-RPC 2.0, MCP 사양 2025-03-26.
 *   - initialize: 서버 정보 + 능력
 *   - notifications/initialized: ack
 *   - tools/list: 도구 목록
 *   - tools/call: 도구 호출
 *
 * 등록 방법 (claude.ai):
 *   Settings → Connectors → Add custom connector
 *   URL: https://totaro-worktool.vercel.app/api/mcp
 *   Auth: Bearer / 토큰 입력
 */
import { NextResponse } from 'next/server'

import { dispatchTool } from '@/lib/mcp/handlers'
import { TOOLS } from '@/lib/mcp/tools'
import { getIssuer, getServiceSupabase, hashToken } from '@/lib/oauth/utils'

import type { NextRequest } from 'next/server'

/** Vercel function 최대 실행 시간 (Drive 큰 파일 추출 대비). Pro 플랜 기준. */
export const maxDuration = 60
export const runtime = 'nodejs'

const PROTOCOL_VERSION = '2025-03-26'
const SERVER_INFO = { name: 'totaro-worktool', version: '0.2.0' }

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Authorization, Content-Type, mcp-session-id',
  'Access-Control-Max-Age': '86400',
}

type JsonRpcRequest = {
  jsonrpc: '2.0'
  id?: number | string | null
  method: string
  params?: Record<string, unknown>
}

type JsonRpcResponse = {
  jsonrpc: '2.0'
  id: number | string | null
  result?: unknown
  error?: { code: number; message: string; data?: unknown }
}

function jsonRpcError(id: number | string | null, code: number, message: string): JsonRpcResponse {
  return { jsonrpc: '2.0', id, error: { code, message } }
}

function jsonRpcResult(id: number | string | null, result: unknown): JsonRpcResponse {
  return { jsonrpc: '2.0', id, result }
}

/**
 * Bearer 토큰 검증 — 두 경로 모두 허용:
 *   1) MCP_BEARER_TOKEN env (직접 테스트 / 로컬 dev 용)
 *   2) OAuth 액세스 토큰 (oauth_tokens 테이블, claude.ai 정식 경로)
 * 둘 다 실패하면 false.
 */
async function checkAuth(req: NextRequest): Promise<boolean> {
  const auth = req.headers.get('authorization') ?? ''
  const match = /^Bearer\s+(.+)$/i.exec(auth.trim())
  if (!match) return false
  const token = match[1]

  // 1) env 정적 토큰
  const staticToken = process.env.MCP_BEARER_TOKEN
  if (staticToken && token === staticToken) return true

  // 2) DB 의 OAuth 토큰
  try {
    const supabase = getServiceSupabase()
    const { data } = await supabase
      .from('oauth_tokens')
      .select('token_hash, expires_at')
      .eq('token_hash', hashToken(token))
      .maybeSingle()
    if (!data) return false
    if (new Date(data.expires_at as string).getTime() < Date.now()) return false
    return true
  } catch {
    return false
  }
}

/** 401 응답 — WWW-Authenticate 헤더에 디스커버리 URL 을 실어 claude.ai 가 OAuth 흐름을 시작하게 한다. */
function unauthorized(req: NextRequest): Response {
  const issuer = getIssuer(req)
  const resourceMeta = `${issuer}/.well-known/oauth-protected-resource`
  return new Response(JSON.stringify({ error: 'Unauthorized' }), {
    status: 401,
    headers: {
      'Content-Type': 'application/json',
      'WWW-Authenticate': `Bearer realm="MCP", resource_metadata="${resourceMeta}"`,
      ...CORS_HEADERS,
    },
  })
}

/** JSON-RPC 메서드 처리 — 메인 디스패치. */
async function handleMethod(msg: JsonRpcRequest): Promise<JsonRpcResponse | null> {
  const { id = null, method, params = {} } = msg

  // 알림(notification)은 응답 없음 (id 도 없음).
  if (id === null || id === undefined) {
    // notifications/initialized, notifications/cancelled 등 — 그냥 ack
    return null
  }

  switch (method) {
    case 'initialize': {
      return jsonRpcResult(id, {
        protocolVersion: PROTOCOL_VERSION,
        serverInfo: SERVER_INFO,
        capabilities: { tools: {} },
      })
    }
    case 'tools/list': {
      return jsonRpcResult(id, { tools: TOOLS })
    }
    case 'tools/call': {
      const name = String(params.name ?? '')
      const args = (params.arguments as Record<string, unknown>) ?? {}
      try {
        const text = await dispatchTool(name, args)
        return jsonRpcResult(id, {
          content: [{ type: 'text', text }],
        })
      } catch (e) {
        const msgText = e instanceof Error ? e.message : String(e)
        return jsonRpcResult(id, {
          content: [{ type: 'text', text: `❌ 에러: ${msgText}` }],
          isError: true,
        })
      }
    }
    case 'ping': {
      return jsonRpcResult(id, {})
    }
    default:
      return jsonRpcError(id, -32601, `Method not found: ${method}`)
  }
}

export async function POST(req: NextRequest): Promise<Response> {
  console.log(
    '[mcp] POST',
    req.url,
    'auth=',
    req.headers.get('authorization') ? 'yes' : 'no',
    'ua=',
    req.headers.get('user-agent')?.slice(0, 60)
  )
  // 1) Bearer 인증 — env 토큰 또는 OAuth 토큰
  if (!(await checkAuth(req))) return unauthorized(req)

  // 2) JSON-RPC 파싱
  let body: JsonRpcRequest | JsonRpcRequest[]
  try {
    body = (await req.json()) as JsonRpcRequest | JsonRpcRequest[]
  } catch {
    return NextResponse.json(jsonRpcError(null, -32700, 'Parse error'), {
      status: 400,
      headers: CORS_HEADERS,
    })
  }

  // 3) 단일 또는 배치
  if (Array.isArray(body)) {
    const responses = await Promise.all(body.map(handleMethod))
    const filtered = responses.filter((r): r is JsonRpcResponse => r !== null)
    return NextResponse.json(filtered, { headers: CORS_HEADERS })
  }

  const response = await handleMethod(body)
  if (response === null) {
    // 알림 — MCP Streamable HTTP 사양상 202 Accepted (204 X)
    return new Response(null, { status: 202, headers: CORS_HEADERS })
  }
  return NextResponse.json(response, { headers: CORS_HEADERS })
}

export async function OPTIONS(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * MCP Streamable HTTP 사양 — 클라이언트가 세션 종료 시 DELETE.
 * 우리는 stateless (Mcp-Session-Id 미사용) 라 단순 ack.
 */
export async function DELETE(): Promise<Response> {
  return new Response(null, { status: 204, headers: CORS_HEADERS })
}

/**
 * GET — MCP Streamable HTTP 사양상 서버→클라 SSE 채널.
 * stateless 라 즉시 닫는 빈 SSE 스트림으로 응답 (호환성).
 * `?debug=1` 으로 server info JSON 도 받을 수 있음.
 */
export async function GET(req: NextRequest): Promise<Response> {
  console.log('[mcp] GET', req.url, 'auth=', req.headers.get('authorization') ? 'yes' : 'no')
  const url = new URL(req.url)
  if (url.searchParams.get('debug') === '1') {
    return NextResponse.json(
      {
        name: SERVER_INFO.name,
        version: SERVER_INFO.version,
        protocol: PROTOCOL_VERSION,
        tools: TOOLS.length,
      },
      { headers: CORS_HEADERS }
    )
  }
  // 즉시 닫는 SSE 스트림 — 사양 요구만 만족하고 빠져나옴.
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(new TextEncoder().encode(': mcp-keepalive\n\n'))
      controller.close()
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      ...CORS_HEADERS,
    },
  })
}
