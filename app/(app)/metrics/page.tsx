import { PageHeader } from '@/components/ui'
import { getMetricsData } from '@/lib/metrics'
import type { MetricsData } from '@/lib/metrics'

export const dynamic = 'force-dynamic'

/** 영역 라벨 색 — 허브 노드의 액센트와 톤을 맞춘다. */
const AREA_BADGE: Record<string, string> = {
  'B2B 소싱 AI': 'bg-blue-50 text-blue-700',
  'AI 브랜딩': 'bg-amber-50 text-amber-700',
  '워크툴 · AI 직원': 'bg-violet-50 text-violet-700',
  'AI 네이티브 운영': 'bg-indigo-50 text-indigo-700',
  '에이전트 · 외주': 'bg-emerald-50 text-emerald-700',
}

/** 토타로 5개조 — 흩어져 있던 원칙을 문서 출처와 함께 명문화. */
const PRINCIPLES = [
  {
    title: '만들고, 실측으로 검증한 뒤, 다음으로',
    detail: '한 번에 하나씩. 기능이 아니라 검증된 결과가 진행이다.',
    source: '고도화 로드맵 · 진행 원칙',
  },
  {
    title: '자동화 우선, 수동은 보조',
    detail: '입력 부담 없는 도구만 3인 팀에서 살아남는다.',
    source: '기획서 · 제품 원칙 2',
  },
  {
    title: '되돌릴 수 있으면 AI가 자유롭게, 못 되돌리면 사람이 확정',
    detail: 'AI 네이티브 운영의 안전 원칙. 삭제는 소프트 삭제로만.',
    source: '채널 통합 로드맵 · 자율성 원칙',
  },
  {
    title: '3인 규모를 넘는 복잡도를 만들지 않는다',
    detail: '복잡한 권한·승인·조직 구조 금지. 무료 티어에서 시작.',
    source: '기획서 · 제품 원칙 3·5',
  },
  {
    title: '우리가 첫 번째 고객이다',
    detail: '내부에서 안 쓰는 기능은 팔 수도 없다. 워크툴이 그 증명.',
    source: '고도화 로드맵 · Tier 3 (SaaS)',
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

function MetricCard({
  area,
  name,
  value,
  caption,
  manual,
  children,
}: {
  area: string
  name: string
  value: string
  caption: string
  /** 아직 자동 수집이 없는 수동 지표 표시. */
  manual?: boolean
  children?: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-col rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between gap-2">
        <span
          className={`rounded-md px-2 py-0.5 text-[11px] font-semibold ${AREA_BADGE[area] ?? 'bg-slate-100 text-slate-600'}`}
        >
          {area}
        </span>
        {manual && (
          <span className="rounded-md bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">
            수동 지표
          </span>
        )}
      </div>
      <p className="mt-3 text-sm font-medium text-slate-600">{name}</p>
      <p className="mt-1 text-4xl font-extrabold tracking-tight text-slate-900 tabular-nums">
        {value}
      </p>
      <p className="mt-1.5 text-xs leading-relaxed text-slate-400">{caption}</p>
      {children}
    </div>
  )
}

/** 이번 주 멤버별 기록 바 — 커버리지 카드 하단에 붙는다. */
function CoverageBars({ data }: { data: MetricsData }): React.JSX.Element | null {
  if (data.weeklyLogs.length === 0) return null
  const max = data.weeklyLogs[0].count
  return (
    <ul className="mt-4 space-y-1.5 border-t border-slate-100 pt-3">
      {data.weeklyLogs.slice(0, 5).map((m) => (
        <li key={m.member} className="flex items-center gap-2 text-xs">
          <span className="w-14 shrink-0 truncate font-medium text-slate-600">{m.member}</span>
          <span className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100">
            <span
              className="block h-full rounded-full bg-indigo-400"
              style={{ width: `${Math.max(8, (m.count / max) * 100)}%` }}
            />
          </span>
          <span className="w-8 shrink-0 text-right text-slate-400 tabular-nums">{m.count}</span>
        </li>
      ))}
    </ul>
  )
}

export default async function MetricsPage(): Promise<React.JSX.Element> {
  const data = await getMetricsData()

  const activeMembers = data.weeklyLogs.length
  const coverage =
    data.memberTotal > 0 ? `${activeMembers}/${data.memberTotal}` : String(activeMembers)

  return (
    <>
      <PageHeader
        title="우리의 지표"
        description="토타로가 가는 방향과, 그걸 증명하는 숫자. 영역마다 숫자 하나씩만 본다."
      />
      <div className="p-8">
        <div className="mx-auto max-w-5xl space-y-8">
          {/* 미션 */}
          <section className="rounded-2xl bg-slate-900 px-8 py-7 text-white">
            <p className="text-[11px] font-semibold tracking-[0.2em] text-slate-400">MISSION</p>
            <p className="mt-2 text-xl leading-relaxed font-semibold sm:text-2xl">
              AI가 팀의 모든 데이터 위에서 일하게 만들어, 작은 팀이 큰 회사처럼 움직이게 한다.
            </p>
            <p className="mt-2 text-sm text-slate-400">
              우리가 먼저 그렇게 일하고, 그 도구를 판다 — 워크툴·소싱 AI·마케팅 에이전트는 그 증명
              사례다.
            </p>
          </section>

          {/* 영역별 KPI */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              영역별 KPI
              <span className="ml-2 font-normal text-slate-400">
                분기마다 이 중 &ldquo;1번 숫자&rdquo; 하나를 정한다
              </span>
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <MetricCard
                area="AI 네이티브 운영"
                name="이번 주 작업 기록 커버리지"
                value={coverage}
                caption={`팀원 중 이번 주 Claude 작업 기록을 남긴 인원 · 총 ${data.weeklyLogTotal}건 (claude_logs)`}
              >
                <CoverageBars data={data} />
              </MetricCard>
              <MetricCard
                area="워크툴 · AI 직원"
                name="인용 답변률 (30일)"
                value={pct(data.assistantCited, data.assistantAnswers)}
                caption={`AI 직원 답변 ${data.assistantAnswers}건 중 출처 인용 ${data.assistantCited}건 — 근거 있는 답이 목표`}
              />
              <MetricCard
                area="B2B 소싱 AI"
                name="견적 관련 문서 (30일)"
                value={String(data.quoteDocs)}
                caption="우편실에 들어온 '견적' 문서 기준 프록시 — 매출의 선행지표"
              />
              <MetricCard
                area="AI 브랜딩"
                name="목표 ROAS"
                value={data.targetRoas != null ? `${data.targetRoas}%` : '—'}
                caption={
                  data.paidRevenue != null
                    ? `오늘 결제 매출 ${wonCompact(data.paidRevenue)} · 주문 ${data.orderCount ?? 0}건`
                    : '네이버 워커 동기화 대기 중'
                }
              />
              <MetricCard
                area="에이전트 · 외주"
                name="외주의 제품화 비율"
                value="—"
                caption="외주가 끝날 때마다 '제품 자산이 된 것'을 기록 — 일회성 노동 방지"
                manual
              />
            </div>
          </section>

          {/* 마음가짐 5개조 */}
          <section>
            <h2 className="mb-3 text-sm font-semibold text-slate-700">
              토타로 5개조
              <span className="ml-2 font-normal text-slate-400">
                흩어져 있던 원칙의 명문화 — 출처는 모두 우리 문서
              </span>
            </h2>
            <ol className="space-y-2">
              {PRINCIPLES.map((p, i) => (
                <li
                  key={p.title}
                  className="flex items-start gap-4 rounded-xl bg-white px-5 py-4 ring-1 ring-slate-200"
                >
                  <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-900 text-xs font-bold text-white">
                    {i + 1}
                  </span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-slate-900">{p.title}</p>
                    <p className="mt-0.5 text-xs text-slate-500">{p.detail}</p>
                  </div>
                  <span className="ml-auto shrink-0 self-center text-[11px] text-slate-400">
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
