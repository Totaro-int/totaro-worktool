/**
 * /hub/naver 대시보드용 커머스 데이터 — Supabase 스냅샷에서 읽는다.
 *
 * 네이버 커머스 API 는 IP 화이트리스트 필수라 Vercel(동적 IP)에서 직접 호출이
 * 안 된다. 그래서 화이트리스트에 등록된 머신에서 `scripts/sync-naver-commerce.mjs`
 * 가 주기적으로 라이브 API 를 호출해 `naver_commerce_snapshot` 테이블에 저장하고,
 * 여기서는 그 스냅샷을 읽기만 한다.
 *
 * 라이브 호출 함수(`fetchNaverCommerceLive`)는 `lib/naver/commerce-live.ts` 로
 * 분리됐다 — 워커가 Next 의존성 없이 import 할 수 있게 하기 위함.
 */
import { createClient } from '@/lib/supabase/server'

export type { LiveCommerceSnapshot } from './commerce-live'
export { fetchNaverCommerceLive } from './commerce-live'

export type CommerceData = {
  status: 'ok'
  orderCount: number
  paidRevenue: number
  pendingRevenue: number
  /** 워커가 마지막으로 동기화한 시각 (ISO 8601). */
  syncedAt: string
}

export type CommerceResult =
  | CommerceData
  | { status: 'unconfigured' }
  | { status: 'needs_migration' }
  | { status: 'error'; message: string; syncedAt?: string }

/**
 * naver_commerce_snapshot 에서 최신 스냅샷을 읽어 온다.
 * 테이블 자체가 없으면 needs_migration, 빈 행이면 unconfigured 를 돌려준다.
 */
export async function getCommerceData(): Promise<CommerceResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('naver_commerce_snapshot')
    .select('order_count, paid_revenue, pending_revenue, synced_at, error_message')
    .eq('id', 1)
    .maybeSingle()

  if (error) {
    const missing =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    if (missing) return { status: 'needs_migration' }
    return { status: 'error', message: error.message }
  }

  // 행이 없거나 한 번도 워커가 돌지 않은 상태
  if (!data || data.synced_at == null) {
    return { status: 'unconfigured' }
  }

  // 워커가 에러로 끝난 경우 — 마지막으로 성공한 수치는 그대로 보여 주고 메시지만 띄운다.
  if (data.error_message) {
    return {
      status: 'error',
      message: data.error_message,
      syncedAt: data.synced_at,
    }
  }

  return {
    status: 'ok',
    orderCount: Number(data.order_count ?? 0),
    paidRevenue: Number(data.paid_revenue ?? 0),
    pendingRevenue: Number(data.pending_revenue ?? 0),
    syncedAt: data.synced_at,
  }
}
