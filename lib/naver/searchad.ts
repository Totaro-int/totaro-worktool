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
  conversions: number
  adRevenue: number
  roas: number
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
  ccnt?: number
  convAmt?: number
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

/** 검색광고 API 호출 타임아웃 (ms) — 응답이 없으면 페이지가 무한 대기하지 않도록. */
const SEARCHAD_TIMEOUT_MS = 8000

/** 검색광고 API GET 요청. path는 쿼리스트링을 제외한 경로(서명 대상)이다. */
async function searchAdGet<T>(config: SearchAdConfig, path: string, query = ''): Promise<T> {
  const timestamp = Date.now()
  let res: Response
  try {
    res = await fetch(`${SEARCHAD_API}${path}${query}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json; charset=UTF-8',
        'X-Timestamp': String(timestamp),
        'X-API-KEY': config.apiKey,
        'X-Customer': config.customerId,
        'X-Signature': buildSignature(config.secretKey, timestamp, 'GET', path),
      },
      cache: 'no-store',
      signal: AbortSignal.timeout(SEARCHAD_TIMEOUT_MS),
    })
  } catch (error) {
    if (error instanceof DOMException && error.name === 'TimeoutError') {
      throw new Error(
        `검색광고 API 응답이 ${SEARCHAD_TIMEOUT_MS / 1000}초 안에 오지 않았습니다 (${path}).`
      )
    }
    throw error
  }
  if (!res.ok) {
    throw new Error(`검색광고 API 오류 (${res.status} · ${path}). API 키·고객 ID를 확인하세요.`)
  }
  return res.json() as Promise<T>
}

/** Asia/Seoul 기준 날짜(YYYY-MM-DD)를 반환한다. */
function seoulDate(): string {
  return new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
}

/** /hub/naver 대시보드용 — 검색광고 캠페인·기간 성과를 조회한다. */
export async function getSearchAdData(range?: {
  since: string
  until: string
}): Promise<SearchAdResult> {
  const config = getConfig()
  if (!config) return { status: 'unconfigured' }

  try {
    const campaigns = await searchAdGet<RawCampaign[]>(config, '/ncc/campaigns')
    const enabledCount = campaigns.filter((c) => !c.userLock && c.status === 'ELIGIBLE').length

    let impressions = 0
    let clicks = 0
    let cost = 0
    let conversions = 0
    let adRevenue = 0

    if (campaigns.length > 0) {
      const today = seoulDate()
      const since = range?.since ?? `${today.slice(0, 8)}01`
      const until = range?.until ?? today
      const ids = encodeURIComponent(JSON.stringify(campaigns.map((c) => c.nccCampaignId)))
      const timeRange = encodeURIComponent(JSON.stringify({ since, until }))

      // 노출·클릭·광고비 — 검증된 기본 필드
      try {
        const fields = encodeURIComponent(JSON.stringify(['impCnt', 'clkCnt', 'salesAmt']))
        const stats = await searchAdGet<{ data?: RawStatRow[] }>(
          config,
          '/stats',
          `?ids=${ids}&fields=${fields}&timeRange=${timeRange}`
        )
        for (const row of stats.data ?? []) {
          impressions += row.impCnt ?? 0
          clicks += row.clkCnt ?? 0
          cost += row.salesAmt ?? 0
        }
      } catch {
        // 기본 성과 통계 실패 시 0 으로 둔다.
      }

      // 전환수·전환매출 — 전환추적(프리미엄 로그 분석) 연동 시에만 값이 들어온다
      try {
        const fields = encodeURIComponent(JSON.stringify(['ccnt', 'convAmt']))
        const stats = await searchAdGet<{ data?: RawStatRow[] }>(
          config,
          '/stats',
          `?ids=${ids}&fields=${fields}&timeRange=${timeRange}`
        )
        for (const row of stats.data ?? []) {
          conversions += row.ccnt ?? 0
          adRevenue += row.convAmt ?? 0
        }
      } catch {
        // 전환추적 미연동이면 전환 지표는 0 으로 둔다.
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
      conversions,
      adRevenue,
      roas: cost > 0 ? (adRevenue / cost) * 100 : 0,
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
