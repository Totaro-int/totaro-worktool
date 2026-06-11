import { PageHeader } from '@/components/ui'
import { getMetricsData } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

/**
 * 시안 B (Stripe 에디토리얼) 디자인 토큰 — draft-B-20260611-153808.html 커밋 선언 값.
 * ink #0d253d · mute #64748d · accent #533afd · hairline #e3e8ee · soft #f6f9fc
 */

function wonCompact(n: number): string {
  if (n >= 1e8) return `₩${Number((n / 1e8).toFixed(1))}억`
  if (n >= 1e4) return `₩${Math.round(n / 1e4).toLocaleString('ko-KR')}만`
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

/** 장부 행 하나 — 영역 / 지표명·이유 / 큰 숫자 / 기간. */
function LedgerRow({
  area,
  name,
  why,
  value,
  unit,
  period,
}: {
  area: string
  name: string
  /** 이 숫자를 보는 이유 — 한 줄. */
  why: string
  value: string
  unit?: string
  period: string
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[#e3e8ee] px-5 py-6 last:border-b-0 sm:grid-cols-[140px_1fr_200px_88px] sm:gap-6">
      <span className="text-xs font-medium tracking-wide text-[#64748d]">{area}</span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[#0d253d]">{name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#64748d]">{why}</p>
      </div>
      <p className="text-3xl font-light tracking-tight text-[#0d253d] tabular-nums sm:text-right sm:text-4xl">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-[#64748d]">{unit}</span>}
      </p>
      <span className="text-xs text-[#64748d] sm:text-right">{period}</span>
    </div>
  )
}

export default async function MetricsPage(): Promise<React.JSX.Element> {
  const data = await getMetricsData()

  return (
    <>
      <PageHeader title="우리의 지표" description="영역마다 숫자 하나씩만 본다." />
      <div className="bg-white">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          {/* 미션 */}
          <section aria-labelledby="mission-heading" className="py-16 sm:py-20">
            <p className="text-xs font-semibold tracking-[0.18em] text-[#533afd]">MISSION</p>
            <h2
              id="mission-heading"
              className="mt-5 text-4xl leading-[1.12] font-light tracking-[-0.03em] text-[#0d253d] sm:text-5xl"
            >
              세 명이
              <br />
              서른 명처럼 움직인다.
            </h2>
            <p className="mt-6 max-w-md text-[15px] leading-relaxed text-[#64748d]">
              방법은 하나 — AI가 팀의 모든 데이터 위에서 일하게 만드는 것. 우리가 먼저 그렇게
              일하고, 증명된 도구를 판다. 워크툴·소싱 AI·마케팅 에이전트가 그 증거다.
            </p>
          </section>

          {/* 장부 — 영역별 KPI 3개를 행으로 정렬 */}
          <section aria-labelledby="ledger-heading" className="pb-24">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="ledger-heading" className="text-lg font-medium text-[#0d253d]">
                영역별 KPI
              </h2>
              <p className="text-xs text-[#64748d]">세 영역, 숫자 하나씩</p>
            </div>

            <div className="border-t border-[#e3e8ee]">
              <LedgerRow
                area="이커머스"
                name="ROAS"
                why={
                  data.paidRevenue != null
                    ? `광고비 대비 매출 목표 — 오늘 결제 매출 ${wonCompact(data.paidRevenue)} · 주문 ${data.orderCount ?? 0}건`
                    : '광고비 대비 매출 목표 — 네이버 워커 동기화 대기 중'
                }
                value={data.targetRoas != null ? String(data.targetRoas) : '—'}
                unit={data.targetRoas != null ? '%' : undefined}
                period="목표"
              />
              <LedgerRow
                area="Web totaro"
                name="견적 매칭"
                why="OEM 공급사와 해외 바이어의 견적 매칭 건수 — 본업 매출의 선행지표"
                value={String(data.quoteDocs)}
                unit="건"
                period="최근 30일"
              />
              <LedgerRow
                area="에이전트 판매"
                name="목표 매출"
                why="AI 에이전트 구축·판매로 만들 매출 — 목표 금액 설정 대기"
                value="—"
                period="이번 분기"
              />
            </div>
          </section>
        </div>
      </div>
    </>
  )
}
