/**
 * /metrics 페이지용 지표 데이터 레이어.
 *
 * 토타로의 영역별 KPI 를 한 번에 모은다. 각 수치는 이미 쌓이고 있는
 * 테이블에서 읽고, 테이블이 없거나 조회가 실패하면 null/0 으로 우아하게
 * 폴백한다 (지표 하나가 깨져도 페이지는 뜬다).
 *
 * - 작업 기록 커버리지: claude_logs (이번 주, KST 월요일 시작)
 * - AI 직원 인용 응답률: assistant_messages (최근 30일)
 * - 네이버 ROAS 목표·매출: naver_kpi + naver_commerce_snapshot
 * - 견적 문서: inbox_documents 에서 "견적" 매칭 (최근 30일, 프록시 지표)
 */
import { createClient } from '@/lib/supabase/server'

const KST_OFFSET_MS = 9 * 3600_000
const QUOTE_WINDOW_DAYS = 30

export type MemberLogCount = {
  member: string
  count: number
}

export type MetricsData = {
  /** 이번 주(KST 월요일~) 멤버별 작업 기록 수. 많이 기록한 순. */
  weeklyLogs: MemberLogCount[]
  /** 이번 주 작업 기록 총 건수. */
  weeklyLogTotal: number
  /** members 테이블의 팀원 수 (커버리지 분모). */
  memberTotal: number
  /** 최근 30일 어시스턴트 답변 수. */
  assistantAnswers: number
  /** 그중 출처([n] 인용)가 붙은 답변 수. */
  assistantCited: number
  /** 네이버 목표 ROAS(%). 미설정이면 null. */
  targetRoas: number | null
  /** 네이버 오늘 결제 매출(원). 워커 미동작이면 null. */
  paidRevenue: number | null
  /** 네이버 오늘 주문 건수. */
  orderCount: number | null
  /** 최근 30일 우편실의 "견적" 관련 문서 수 (유효 견적 요청의 프록시). */
  quoteDocs: number
}

/** 이번 주 월요일 00:00 KST 를 UTC ISO 로. */
function weekStartIso(): string {
  const kstNow = new Date(Date.now() + KST_OFFSET_MS)
  const sinceMonday = (kstNow.getUTCDay() + 6) % 7
  const kstMonday = Date.UTC(
    kstNow.getUTCFullYear(),
    kstNow.getUTCMonth(),
    kstNow.getUTCDate() - sinceMonday
  )
  return new Date(kstMonday - KST_OFFSET_MS).toISOString()
}

function daysAgoIso(days: number): string {
  return new Date(Date.now() - days * 24 * 3600_000).toISOString()
}

/** 모든 지표를 병렬로 모은다. 개별 실패는 폴백값으로 흡수한다. */
export async function getMetricsData(): Promise<MetricsData> {
  const supabase = await createClient()
  const since30d = daysAgoIso(QUOTE_WINDOW_DAYS)

  const [logsRes, membersRes, answersRes, citedRes, kpiRes, snapshotRes, quoteRes] =
    await Promise.all([
      supabase.from('claude_logs').select('member').gte('occurred_at', weekStartIso()).limit(1000),
      supabase.from('members').select('id', { count: 'exact', head: true }),
      supabase
        .from('assistant_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'assistant')
        .gte('created_at', since30d),
      supabase
        .from('assistant_messages')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'assistant')
        .not('sources', 'is', null)
        .gte('created_at', since30d),
      supabase.from('naver_kpi').select('target_roas').eq('id', 1).maybeSingle(),
      supabase
        .from('naver_commerce_snapshot')
        .select('order_count, paid_revenue, synced_at')
        .eq('id', 1)
        .maybeSingle(),
      supabase
        .from('inbox_documents')
        .select('id', { count: 'exact', head: true })
        .or('filename.ilike.%견적%,description.ilike.%견적%')
        .gte('created_at', since30d),
    ])

  // 멤버별 집계 — 같은 사람의 기록을 합산해 많이 기록한 순으로.
  const byMember = new Map<string, number>()
  for (const row of (logsRes.data ?? []) as { member: string }[]) {
    byMember.set(row.member, (byMember.get(row.member) ?? 0) + 1)
  }
  const weeklyLogs: MemberLogCount[] = [...byMember.entries()]
    .map(([member, count]) => ({ member, count }))
    .sort((a, b) => b.count - a.count)

  const snapshot = snapshotRes.data
  const snapshotReady = snapshot != null && snapshot.synced_at != null

  return {
    weeklyLogs,
    weeklyLogTotal: weeklyLogs.reduce((sum, m) => sum + m.count, 0),
    memberTotal: membersRes.count ?? 0,
    assistantAnswers: answersRes.count ?? 0,
    assistantCited: citedRes.count ?? 0,
    targetRoas: kpiRes.data?.target_roas != null ? Number(kpiRes.data.target_roas) : null,
    paidRevenue: snapshotReady ? Number(snapshot.paid_revenue) : null,
    orderCount: snapshotReady ? Number(snapshot.order_count) : null,
    quoteDocs: quoteRes.count ?? 0,
  }
}
