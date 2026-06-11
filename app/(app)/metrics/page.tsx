import { PageHeader } from '@/components/ui'
import { getMetricsData } from '@/lib/metrics'
import type { MetricsData } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

/**
 * 시안 B (Stripe 에디토리얼) 디자인 토큰 — draft-B-20260611-153808.html 커밋 선언 값.
 * ink #0d253d · mute #64748d · accent #533afd · hairline #e3e8ee · soft #f6f9fc
 */

/** 토타로 5개조 — 흩어져 있던 원칙을 문서 출처와 함께 명문화. */
const PRINCIPLES = [
  {
    title: '만들고, 실측으로 검증한 뒤, 다음으로',
    detail: '한 번에 하나씩. 기능이 아니라 검증된 결과가 진행이다.',
    source: '고도화 로드맵',
  },
  {
    title: '자동화 우선, 수동은 보조',
    detail: '입력 부담 없는 도구만 3인 팀에서 살아남는다.',
    source: '기획서',
  },
  {
    title: '되돌릴 수 있으면 AI가, 못 되돌리면 사람이',
    detail: 'AI 네이티브 운영의 안전 원칙. 삭제는 소프트 삭제로만.',
    source: '채널 통합 로드맵',
  },
  {
    title: '3인 규모를 넘는 복잡도를 만들지 않는다',
    detail: '복잡한 권한·승인·조직 구조 금지. 무료 티어에서 시작.',
    source: '기획서',
  },
  {
    title: '우리가 첫 번째 고객이다',
    detail: '내부에서 안 쓰는 기능은 팔 수도 없다. 이 워크툴이 그 증명.',
    source: '고도화 로드맵',
  },
]

function pct(part: number, total: number): string {
  if (total === 0) return '—'
  return `${Math.round((part / total) * 100)}%`
}

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
    <div className="grid grid-cols-1 items-center gap-2 border-b border-[#e3e8ee] px-5 py-5 last:border-b-0 sm:grid-cols-[120px_1fr_200px_88px] sm:gap-6">
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

/** 멤버별 이번 주 기록 바 — 북극성 행 하단에 붙는다. */
function CoverageBars({ data }: { data: MetricsData }): React.JSX.Element | null {
  if (data.weeklyLogs.length === 0) return null
  const max = data.weeklyLogs[0].count
  return (
    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 border-t border-[#e3e8ee] px-5 py-3.5">
      {data.weeklyLogs.slice(0, 5).map((m) => (
        <div key={m.member} className="flex items-center gap-2 text-xs">
          <span className="font-medium text-[#0d253d]">{m.member}</span>
          <span className="h-1 w-16 overflow-hidden rounded-full bg-[#e3e8ee]">
            <span
              className="block h-full rounded-full bg-[#533afd]"
              style={{ width: `${Math.max(10, (m.count / max) * 100)}%` }}
            />
          </span>
          <span className="text-[#64748d] tabular-nums">{m.count}건</span>
        </div>
      ))}
    </div>
  )
}

export default async function MetricsPage(): Promise<React.JSX.Element> {
  const data = await getMetricsData()

  const activeMembers = data.weeklyLogs.length
  const coverage =
    data.memberTotal > 0 ? `${activeMembers}/${data.memberTotal}` : String(activeMembers)
  const coverageGoal = data.memberTotal > 0 ? `${data.memberTotal}/${data.memberTotal}` : '전원'

  return (
    <>
      <PageHeader
        title="우리의 지표"
        description="방향은 미션 하나, 판단은 1번 숫자 하나. 나머지는 보조다."
      />
      <div className="bg-white">
        <div className="mx-auto max-w-5xl px-6 sm:px-10">
          {/* 미션 — 비대칭 2단: 선언 / 분기 목표 */}
          <section
            aria-labelledby="mission-heading"
            className="grid items-center gap-10 py-16 sm:py-20 lg:grid-cols-[1.4fr_1fr] lg:gap-14"
          >
            <div>
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
            </div>
            <div className="relative h-56 rounded-2xl bg-gradient-to-br from-[#ece9ff] via-[#fdeef5] to-[#fff6e9] lg:h-64">
              <div className="absolute right-5 bottom-5 left-5 rounded-xl bg-white p-4 shadow-[0_6px_24px_rgba(0,55,112,0.12)] sm:left-auto sm:w-64">
                <p className="text-[11px] font-semibold tracking-wide text-[#533afd]">
                  이번 분기 1번 숫자
                </p>
                <p className="mt-1.5 text-2xl font-light tracking-tight text-[#0d253d] tabular-nums">
                  주간 커버리지 {coverageGoal}
                </p>
                <p className="mt-1 text-xs text-[#64748d]">
                  매주 전원이 AI 작업 기록을 남기는 상태
                </p>
              </div>
            </div>
          </section>

          {/* 장부 — 영역별 KPI를 행으로 정렬, 북극성 행만 강조 */}
          <section aria-labelledby="ledger-heading" className="pb-20">
            <div className="mb-5 flex flex-wrap items-baseline justify-between gap-2">
              <h2 id="ledger-heading" className="text-lg font-medium text-[#0d253d]">
                영역별 KPI
              </h2>
              <p className="text-xs text-[#64748d]">분기마다 이 중 하나를 1번 숫자로 정한다</p>
            </div>

            {/* 북극성 행 */}
            <div className="rounded-xl border border-[#e3e8ee] bg-[#f6f9fc]">
              <div className="grid grid-cols-1 items-center gap-2 px-5 py-6 sm:grid-cols-[120px_1fr_200px_88px] sm:gap-6">
                <span className="inline-flex w-fit items-center rounded-md bg-[#ece9ff] px-2 py-1 text-[11px] font-semibold text-[#533afd]">
                  ★ 1번 숫자
                </span>
                <div className="min-w-0">
                  <p className="text-[15px] font-medium text-[#0d253d]">
                    이번 주 작업 기록 커버리지
                  </p>
                  <p className="mt-0.5 text-xs leading-relaxed text-[#64748d]">
                    전원이 AI 위에서 일하고 있는가 — 다른 모든 영역의 토대라서 1번이다 · 총{' '}
                    {data.weeklyLogTotal}건
                  </p>
                </div>
                <p className="text-4xl font-light tracking-tight text-[#0d253d] tabular-nums sm:text-right sm:text-5xl">
                  {coverage}
                  <span className="ml-1.5 text-base font-normal text-[#64748d]">명</span>
                </p>
                <span className="text-xs text-[#64748d] sm:text-right">이번 주</span>
              </div>
              <CoverageBars data={data} />
            </div>

            {/* 보조 행 */}
            <div className="mt-2 px-0">
              <LedgerRow
                area="워크툴 · AI 직원"
                name="인용 답변률"
                why={`AI 직원의 답이 근거를 갖는가 — ${data.assistantAnswers}건 중 출처 인용 ${data.assistantCited}건`}
                value={pct(data.assistantCited, data.assistantAnswers)}
                period="최근 30일"
              />
              <LedgerRow
                area="B2B 소싱 AI"
                name="견적 관련 문서"
                why="매출보다 먼저 움직이는 선행지표 — 우편실 '견적' 문서 기준 프록시"
                value={String(data.quoteDocs)}
                unit="건"
                period="최근 30일"
              />
              <LedgerRow
                area="AI 브랜딩"
                name="목표 ROAS"
                why={
                  data.paidRevenue != null
                    ? `오늘 결제 매출 ${wonCompact(data.paidRevenue)} · 주문 ${data.orderCount ?? 0}건`
                    : '광고비 대비 매출 목표 — 네이버 워커 동기화 대기 중'
                }
                value={data.targetRoas != null ? String(data.targetRoas) : '—'}
                unit={data.targetRoas != null ? '%' : undefined}
                period="오늘"
              />
              <LedgerRow
                area="에이전트 · 외주"
                name="외주의 제품화 비율"
                why="외주가 끝날 때마다 제품 자산이 된 것을 기록 — 일회성 노동 방지"
                value="—"
                period="수동 기록"
              />
            </div>
          </section>

          {/* 5개조 — 좌측 고정 제목 + 우측 행 */}
          <section
            aria-labelledby="principles-heading"
            className="grid gap-8 border-t border-[#e3e8ee] py-16 pb-24 lg:grid-cols-[1fr_2fr] lg:gap-14"
          >
            <div>
              <h2 id="principles-heading" className="text-lg font-medium text-[#0d253d]">
                토타로 5개조
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-[#64748d]">
                흩어져 있던 원칙의 명문화. 출처는 모두 우리 문서다 — 새로 지어낸 다짐이 아니라, 이미
                그렇게 일해온 방식이다.
              </p>
            </div>
            <ol>
              {PRINCIPLES.map((p, i) => (
                <li
                  key={p.title}
                  className="flex items-start gap-5 border-b border-[#e3e8ee] py-5 last:border-b-0"
                >
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[#ece9ff] text-xs font-semibold text-[#533afd] tabular-nums">
                    {i + 1}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-medium text-[#0d253d]">{p.title}</p>
                    <p className="mt-1 text-xs leading-relaxed text-[#64748d]">{p.detail}</p>
                  </div>
                  <span className="hidden shrink-0 self-center text-[11px] text-[#a8b3c4] sm:block">
                    {p.source}
                  </span>
                </li>
              ))}
            </ol>
          </section>
        </div>
      </div>
    </>
  )
}
