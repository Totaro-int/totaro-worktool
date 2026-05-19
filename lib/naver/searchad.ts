import { createHmac } from 'node:crypto'

const SEARCHAD_API = 'https://api.naver.com'

export type SearchAdData = {
  status: 'ok'
  campaignCount: number
  enabledCount: number
  impressions: number
  clicks: number
  cost: number
  ctr: number
  campaigns: { name: string; enabled: boolean }[]
}

export type SearchAdResult =
  | SearchAdData
  | { status: 'unconfigured' }
  | { status: 'error'; message: string }

type SearchAdConfig = {
  apiKey: string
  secretKey: string
  customerId: string
}

type RawCampaign = {
  nccCampaignId: string
  name: string
  status?: string
  userLock?: boolean
}

type RawStatRow = {
  impCnt?: number
  clkCnt?: number
  salesAmt?: number
}

function getConfig(): SearchAdConfig | null {
  const apiKey = process.env.NAVER_SEARCHAD_API_KEY
  const secretKey = process.env.NAVER_SEARCHAD_SECRET_KEY
  const customerId = process.env.NAVER_SEARCHAD_CUSTOMER_ID
  if (!apiKey || !secretKey || !customerId) return null
  return { apiKey, secretKey, customerId }
}

/** 검색광고 API 서명: HMAC-SHA256(`${timestamp}.${method}.${path}`) 후 base64 인코딩. */
function buildSignature(
  secretKey: string,
  timestamp: number,
  method: string,
  path: string
): string {
  return createHmac('sha256', secretKey).update(`${timestamp}.${method}.${path}`).digest('base64')
}

/** 검색광고 API GET 요청. path는 쿼리스트링을 제외한 경로(서명 대상)이다. */
async function searchAdGet<T>(config: SearchAdConfig, path: string, query = ''): Promise<T> {
  const timestamp = Date.now()
  const res = await fetch(`${SEARCHAD_API}${path}${query}`, {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json; charset=UTF-8',
      'X-Timestamp': String(timestamp),
      'X-API-KEY': config.apiKey,
      'X-Customer': config.customerId,
      'X-Signature': buildSignature(config.secretKey, timestamp, 'GET', path),
    },
    cache: 'no-store',
  })
  if (!res.ok) {
    throw new Error(`검색광고 API 오류 (${res.status} · ${path}). API 키·고객 ID를 확인하세요.`)
  }
  return res.json() as Promise<T>
}

/** Asia/Seoul 기준 날짜(YYYY-MM-DD)를 반환한다. */
function seoulDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** /hub/naver 대시보드용 — 검색광고 캠페인·이번 달 성과를 조회한다. */
export async function getSearchAdData(): Promise<SearchAdResult> {
  const config = getConfig()
  if (!config) return { status: 'unconfigured' }

  try {
    const campaigns = await searchAdGet<RawCampaign[]>(config, '/ncc/campaigns')
    const enabledCount = campaigns.filter((c) => !c.userLock && c.status === 'ELIGIBLE').length

    let impressions = 0
    let clicks = 0
    let cost = 0
    if (campaigns.length > 0) {
      try {
        const today = seoulDate()
        const monthStart = `${today.slice(0, 8)}01`
        const ids = JSON.stringify(campaigns.map((c) => c.nccCampaignId))
        const fields = JSON.stringify(['impCnt', 'clkCnt', 'salesAmt'])
        const timeRange = JSON.stringify({ since: monthStart, until: today })
        const query =
          `?ids=${encodeURIComponent(ids)}` +
          `&fields=${encodeURIComponent(fields)}` +
          `&timeRange=${encodeURIComponent(timeRange)}`
        const stats = await searchAdGet<{ data?: RawStatRow[] }>(config, '/stats', query)
        for (const row of stats.data ?? []) {
          impressions += row.impCnt ?? 0
          clicks += row.clkCnt ?? 0
          cost += row.salesAmt ?? 0
        }
      } catch {
        // 성과 통계 조회 실패 시 캠페인 수만 노출하고 지표는 0으로 둔다.
      }
    }

    return {
      status: 'ok',
      campaignCount: campaigns.length,
      enabledCount,
      impressions,
      clicks,
      cost,
      ctr: impressions > 0 ? (clicks / impressions) * 100 : 0,
      campaigns: campaigns.slice(0, 6).map((c) => ({
        name: c.name,
        enabled: !c.userLock && c.status === 'ELIGIBLE',
      })),
    }
  } catch (error) {
    return {
      status: 'error',
      message: error instanceof Error ? error.message : '알 수 없는 오류가 발생했습니다.',
    }
  }
}
