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

/** 7/31 여름 스프린트 마감 정보 (KST). */
function sprintDeadline(): { label: string; due: string; dday: string } {
  const KST_OFFSET_MS = 9 * 3600_000
  const kstNow = new Date(Date.now() + KST_OFFSET_MS)
  // 2026-07-31 (8월 0일 = 7월 말일)
  const endUtc = Date.UTC(2026, 7, 0)
  const daysLeft = Math.max(
    0,
    Math.ceil((endUtc - (kstNow.getTime() - KST_OFFSET_MS)) / 86_400_000)
  )
  return { label: '여름 스프린트', due: '7월 31일', dday: `D-${daysLeft}` }
}

/** 장부 행 하나 — 영역 / 지표명·이유 / 큰 숫자 / 기한. */
function LedgerRow({
  area,
  name,
  why,
  value,
  unit,
  deadline,
  dday,
}: {
  area: string
  name: string
  /** 이 숫자를 보는 이유 — 한 줄. */
  why: string
  value: string
  unit?: string
  /** 언제까지 달성할 것인가. */
  deadline: string
  dday?: string
}): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[#e3e8ee] px-5 py-6 last:border-b-0 sm:grid-cols-[160px_1fr_200px_110px] sm:gap-6">
      <span className="text-xs font-medium tracking-wide text-[#64748d]">{area}</span>
      <div className="min-w-0">
        <p className="text-[15px] font-medium text-[#0d253d]">{name}</p>
        <p className="mt-0.5 text-xs leading-relaxed text-[#64748d]">{why}</p>
      </div>
      <p className="text-3xl font-light tracking-tight text-[#0d253d] tabular-nums sm:text-right sm:text-4xl">
        {value}
        {unit && <span className="ml-1 text-base font-normal text-[#64748d]">{unit}</span>}
      </p>
      <div className="sm:text-right">
        <p className="text-xs font-medium text-[#0d253d]">{deadline}</p>
        {dday && <p className="mt-0.5 text-[11px] font-semibold text-[#533afd]">{dday}</p>}
      </div>
    </div>
  )
}

export default async function MetricsPage(): Promise<React.JSX.Element> {
  const data = await getMetricsData()
  const q = sprintDeadline()

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
              방법은 하나 — AI 에이전트로 우리 브랜드를 키우고, 거기서 증명된 도구만 판다.
              모네하우스(브랜딩)·워크툴·마케팅 에이전트가 그 증거다.
            </p>
          </section>

          {/* 장부 — 7/31 스프린트 KPI */}
          <section aria-labelledby="ledger-heading" className="pb-24">
            <div className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="ledger-heading" className="text-lg font-medium text-[#0d253d]">
                7/31 KPI
              </h2>
              <p className="text-xs text-[#64748d]">
                {q.label} — {q.due}까지{' '}
                <span className="font-semibold text-[#533afd]">{q.dday}</span>
              </p>
            </div>

            <div className="border-t border-[#e3e8ee]">
              <LedgerRow
                area="브랜딩 · 모네하우스"
                name="장바구니 → 결제 전환율"
                why="현재 ~26% · 핵심 증명 — 장바구니가 결제로 넘어가는 비율 = 'AI 브랜딩이 사게 만든다'"
                value="45%+"
                deadline={`${q.due}까지`}
                dday={q.dday}
              />
              <LedgerRow
                area="이커머스"
                name="모네하우스 누적 매출"
                why={
                  data.paidRevenue != null
                    ? `현재 누적 ₩30만 · 장바구니 ₩85만 대기 — 오늘 결제 ${wonCompact(data.paidRevenue)} · 주문 ${data.orderCount ?? 0}건`
                    : '현재 누적 ₩30만 · 장바구니 ₩85만 대기 중'
                }
                value="₩500만"
                deadline={`${q.due}까지`}
                dday={q.dday}
              />
              <LedgerRow
                area="고객 이해"
                name="고객 대화"
                why="산 사람·장바구니 이탈자 인터뷰 — 전환 개선의 연료 (현재 0건)"
                value="20"
                unit="건"
                deadline={`${q.due}까지`}
                dday={q.dday}
              />
              <LedgerRow
                area="실행"
                name="전환 실험"
                why="주 1개 배포 · 전후 전환율 기록 — 신뢰배지·배송정책·리뷰·결제 단순화 (현재 0개)"
                value="6"
                unit="개"
                deadline={`${q.due}까지`}
                dday={q.dday}
              />
              <LedgerRow
                area="에이전트 판매"
                name="검증 에이전트 게시"
                why="워크툴서 매일 쓰는 · 1곳 납품 완료(₩300만)한 마케팅 에이전트 판매 페이지 게시"
                value="₩300만"
                deadline={`${q.due}까지`}
                dday={q.dday}
              />
            </div>

            <p className="mt-4 px-5 text-xs text-[#64748d]">
              🛡️ 규율 — 맞춤 외주 <span className="font-semibold text-[#0d253d]">0건</span>. 검증된
              것만 판다.
            </p>
          </section>

          {/* 각오 */}
          <section
            aria-labelledby="resolve-heading"
            className="border-t border-[#e3e8ee] py-16 pb-24"
          >
            <p className="text-xs font-semibold tracking-[0.18em] text-[#533afd]">각오</p>
            <p
              id="resolve-heading"
              className="mt-5 text-3xl leading-[1.2] font-light tracking-[-0.03em] text-[#0d253d] sm:text-4xl"
            >
              이루지 못하면,
              <br />
              바다에 빠져 죽는다.
            </p>
            <p className="mt-5 text-sm text-[#64748d]">— {q.label}, 토타로 세 사람</p>
          </section>
        </div>
      </div>
    </>
  )
}
