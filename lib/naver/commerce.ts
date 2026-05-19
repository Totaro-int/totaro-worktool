import bcrypt from 'bcryptjs'

const COMMERCE_API = 'https://api.commerce.naver.com'

export type CommerceData = {
  status: 'ok'
  orderCount: number
  paidRevenue: number
  pendingRevenue: number
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
    lastChangeStatuses?: { productOrderId: string }[]
  }
}

type ProductOrderQueryResponse = {
  data?: {
    productOrder?: { productOrderStatus?: string; totalPaymentAmount?: number }
  }[]
}

/** 결제가 확정돼 매출로 잡히는 상품주문 상태. */
const PAID_STATUSES = new Set(['PAYED', 'DELIVERING', 'DELIVERED', 'PURCHASE_DECIDED'])

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
 * /hub/naver 대시보드용 — 오늘 스마트스토어 주문·매출을 조회한다.
 * last-changed-statuses 로 오늘 변경된 주문 ID를 모은 뒤 product-orders/query 로
 * 상세를 받아, 결제 확정 상태의 totalPaymentAmount 를 합산한다.
 */
export async function getCommerceData(): Promise<CommerceResult> {
  const clientId = process.env.NAVER_COMMERCE_CLIENT_ID
  const clientSecret = process.env.NAVER_COMMERCE_CLIENT_SECRET
  if (!clientId || !clientSecret) return { status: 'unconfigured' }

  try {
    const token = await getAccessToken(clientId, clientSecret)
    const from = encodeURIComponent(seoulMidnightIso())

    const lcRes = await fetch(
      `${COMMERCE_API}/external/v1/pay-order/seller/product-orders/last-changed-statuses` +
        `?lastChangedFrom=${from}`,
      { headers: { Authorization: `Bearer ${token}` }, cache: 'no-store' }
    )
    if (!lcRes.ok) {
      throw new Error(`커머스 주문 조회에 실패했습니다 (${lcRes.status}).`)
    }
    const lc = (await lcRes.json()) as LastChangedResponse
    const ids = [...new Set((lc.data?.lastChangeStatuses ?? []).map((s) => s.productOrderId))]
    if (ids.length === 0) {
      return { status: 'ok', orderCount: 0, paidRevenue: 0, pendingRevenue: 0 }
    }

    let orderCount = 0
    let paidRevenue = 0
    let pendingRevenue = 0
    // product-orders/query — 안전하게 300개씩 끊어 조회
    for (let i = 0; i < ids.length; i += 300) {
      const qRes = await fetch(
        `${COMMERCE_API}/external/v1/pay-order/seller/product-orders/query`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ productOrderIds: ids.slice(i, i + 300) }),
          cache: 'no-store',
        }
      )
      if (!qRes.ok) continue
      const q = (await qRes.json()) as ProductOrderQueryResponse
      for (const row of q.data ?? []) {
        const po = row.productOrder
        if (!po) continue
        const amount = po.totalPaymentAmount ?? 0
        if (po.productOrderStatus && PAID_STATUSES.has(po.productOrderStatus)) {
          paidRevenue += amount
          orderCount += 1
        } else if (po.productOrderStatus === 'PAYMENT_WAITING') {
          pendingRevenue += amount
          orderCount += 1
        }
      }
    }

    return { status: 'ok', orderCount, paidRevenue, pendingRevenue }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}
