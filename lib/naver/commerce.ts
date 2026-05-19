import bcrypt from 'bcryptjs'

const COMMERCE_API = 'https://api.commerce.naver.com'

export type CommerceData = {
  status: 'ok'
  todayOrderCount: number
}

export type CommerceResult =
  | CommerceData
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }

type TokenResponse = {
  access_token: string
  expires_in: number
}

type LastChangedResponse = {
  data?: {
    count?: number
    lastChangeStatuses?: { productOrderId: string }[]
  }
}

// 프로세스 메모리 내 토큰 캐시 (만료 60초 전까지 재사용)
let cachedToken: { token: string; expiresAt: number } | null = null

/**
 * 커머스 API 전자서명을 생성한다.
 * `${clientId}_${timestamp}` 를 clientSecret(bcrypt salt)으로 해싱 후 base64 인코딩.
 */
function buildSignature(clientId: string, clientSecret: string, timestamp: number): string {
  const password = `${clientId}_${timestamp}`
  const hashed = bcrypt.hashSync(password, clientSecret)
  return Buffer.from(hashed, 'utf-8').toString('base64')
}

/** 커머스 API 액세스 토큰을 발급(또는 캐시 재사용)한다. */
async function getAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const now = Date.now()
  if (cachedToken && cachedToken.expiresAt > now) return cachedToken.token

  const params = new URLSearchParams({
    client_id: clientId,
    timestamp: String(now),
    client_secret_sign: buildSignature(clientId, clientSecret, now),
    grant_type: 'client_credentials',
    type: 'SELF',
  })

  const res = await fetch(`${COMMERCE_API}/external/v1/oauth2/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString(),
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(
      `커머스 토큰 발급에 실패했습니다 (${res.status}). client_id·client_secret을 확인하세요.`
    )
  }

  const json = (await res.json()) as TokenResponse
  cachedToken = {
    token: json.access_token,
    expiresAt: now + (json.expires_in - 60) * 1000,
  }
  return json.access_token
}

/** Asia/Seoul 기준 오늘 0시를 ISO 8601(+09:00) 문자열로 반환한다. */
function seoulMidnightIso(): string {
  const date = new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  return `${date}T00:00:00.000+09:00`
}

/**
 * /hub/naver 대시보드용 — 오늘 스마트스토어 주문 현황을 조회한다.
 * 응답 형식은 커머스 API 버전에 따라 다를 수 있어 방어적으로 파싱한다.
 */
export async function getCommerceData(): Promise<CommerceResult> {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET
  if (!clientId || !clientSecret) return { status: 'unconfigured' }

  try {
    const token = await getAccessToken(clientId, clientSecret)
    const from = encodeURIComponent(seoulMidnightIso())
    const res = await fetch(
      `${COMMERCE_API}/external/v1/pay-order/seller/product-orders/last-changed-statuses?lastChangedFrom=${from}`,
      {
        headers: { Authorization: `Bearer ${token}` },
        cache: 'no-store',
      }
    )
    if (!res.ok) {
      throw new Error(`커머스 주문 조회에 실패했습니다 (${res.status}).`)
    }

    const json = (await res.json()) as LastChangedResponse
    const statuses = json.data?.lastChangeStatuses ?? []
    const todayOrderCount = json.data?.count ?? statuses.length
    return { status: 'ok', todayOrderCount }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}
