/**
 * MCP 원격 — OAuth 2.1 + PKCE 헬퍼.
 *
 * Public client 모드 — secret 없음, PKCE 로 보호.
 * 토큰은 raw 로 발급한 직후 해시만 DB 에 저장 (raw 는 절대 다시 못 조회).
 */
import crypto from 'node:crypto'

import { createClient } from '@supabase/supabase-js'

import type { SupabaseClient } from '@supabase/supabase-js'

/** 인가 코드 수명 (10분). */
export const CODE_TTL_SEC = 10 * 60

/** 접근 토큰 수명 (30일). */
export const TOKEN_TTL_SEC = 30 * 24 * 60 * 60

/** raw token 의 SHA-256 해시 (hex). DB 비교용. */
export function hashToken(raw: string): string {
  return crypto.createHash('sha256').update(raw).digest('hex')
}

/** 32바이트 무작위 토큰 (base64url, ~43자). */
export function randomToken(): string {
  return crypto.randomBytes(32).toString('base64url')
}

/** 16바이트 무작위 client_id (hex, 32자). */
export function randomClientId(): string {
  return crypto.randomBytes(16).toString('hex')
}

/**
 * PKCE 검증 — verifier 가 challenge 와 일치하는지.
 *   - S256: BASE64URL(SHA256(verifier)) == challenge
 *   - plain: verifier == challenge (보안 약함, 권장 X)
 */
export function verifyPkce(verifier: string, challenge: string, method: string): boolean {
  if (method === 'S256') {
    const h = crypto.createHash('sha256').update(verifier).digest('base64url')
    return h === challenge
  }
  if (method === 'plain') return verifier === challenge
  return false
}

let cachedClient: SupabaseClient | null = null

/** Supabase service-role 클라이언트 (서버 전용). */
export function getServiceSupabase(): SupabaseClient {
  if (cachedClient) return cachedClient
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !key) throw new Error('Supabase service_role 키가 .env.local 에 필요.')
  cachedClient = createClient(url, key, { auth: { persistSession: false } })
  return cachedClient
}

/**
 * issuer URL — OAuth 메타데이터가 자기 자신을 가리킬 때 사용.
 * 우선순위: env OAUTH_ISSUER → NEXT_PUBLIC_SITE_URL → 요청에서 추론.
 */
export function getIssuer(req?: Request): string {
  const fromEnv = process.env.OAUTH_ISSUER || process.env.NEXT_PUBLIC_SITE_URL
  if (fromEnv) return fromEnv.replace(/\/$/, '')
  if (req) {
    const url = new URL(req.url)
    return `${url.protocol}//${url.host}`
  }
  return 'http://localhost:3000'
}
