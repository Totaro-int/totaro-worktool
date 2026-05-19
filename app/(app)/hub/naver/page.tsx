import { PageHeader } from '@/components/ui'
import { getCommerceData } from '@/lib/naver/commerce'
import type { CommerceResult } from '@/lib/naver/commerce'
import { getSearchAdData } from '@/lib/naver/searchad'
import type { SearchAdResult } from '@/lib/naver/searchad'

type SectionStatus = 'ok' | 'unconfigured' | 'error'

export default async function NaverHubPage(): Promise<React.JSX.Element> {
  const [commerce, searchAd] = await Promise.all([getCommerceData(), getSearchAdData()])

  return (
    <>
      <PageHeader
        title="네이버 · 판매 · 마케팅"
        description="스마트스토어 판매와 검색광고 효율을 한곳에서 확인합니다."
      />
      <div className="p-8">
        <div className="mx-auto max-w-4xl space-y-5">
          <CommerceSection result={commerce} />
          <SearchAdSection result={searchAd} />
        </div>
      </div>
    </>
  )
}

function StatusBadge({ status }: { status: SectionStatus }): React.JSX.Element {
  const meta: Record<SectionStatus, { label: string; cls: string }> = {
    ok: { label: '연동됨', cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
    unconfigured: { label: '설정 필요', cls: 'bg-slate-100 text-slate-500 ring-slate-200' },
    error: { label: '오류', cls: 'bg-red-50 text-red-600 ring-red-200' },
  }
  const { label, cls } = meta[status]
  return (
    <span className={`rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ${cls}`}>{label}</span>
  )
}

function Metric({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg bg-slate-50 px-3 py-2.5">
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-0.5 text-lg font-bold text-slate-900 tabular-nums">{value}</p>
    </div>
  )
}

function SetupHint({ guide, vars }: { guide: string; vars: string[] }): React.JSX.Element {
  return (
    <div className="mt-3 rounded-lg bg-slate-50 p-3.5 text-xs leading-relaxed text-slate-500">
      <p>{guide}</p>
      <p className="mt-2">
        <code className="font-mono text-slate-600">.env.local</code> 에 아래 값을 입력한 뒤 개발
        서버를 재시작하세요:
      </p>
      <ul className="mt-1 space-y-0.5">
        {vars.map((v) => (
          <li key={v}>
            <code className="font-mono text-slate-600">· {v}</code>
          </li>
        ))}
      </ul>
    </div>
  )
}

function CommerceSection({ result }: { result: CommerceResult }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">커머스 · 스마트스토어 판매</h2>
        <StatusBadge status={result.status} />
      </div>
      {result.status === 'unconfigured' && (
        <SetupHint
          guide="네이버 커머스 API 센터에서 애플리케이션을 등록하면 client_id·client_secret이 발급됩니다."
          vars={['NAVER_COMMERCE_CLIENT_ID', 'NAVER_COMMERCE_CLIENT_SECRET']}
        />
      )}
      {result.status === 'error' && <p className="mt-3 text-sm text-red-600">{result.message}</p>}
      {result.status === 'ok' && (
        <div className="mt-3">
          <Metric
            label="오늘 신규·변경 주문"
            value={`${result.todayOrderCount.toLocaleString('ko-KR')}건`}
          />
        </div>
      )}
    </section>
  )
}

function SearchAdSection({ result }: { result: SearchAdResult }): React.JSX.Element {
  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center justify-between">
        <h2 className="text-sm font-semibold text-slate-700">검색광고 · 마케팅 효율</h2>
        <StatusBadge status={result.status} />
      </div>
      {result.status === 'unconfigured' && (
        <SetupHint
          guide="네이버 검색광고 → 도구 → API 사용 관리에서 API 키·비밀키를 발급받으세요. 고객 ID는 검색광고 계정의 숫자 ID입니다."
          vars={[
            'NAVER_SEARCHAD_API_KEY',
            'NAVER_SEARCHAD_SECRET_KEY',
            'NAVER_SEARCHAD_CUSTOMER_ID',
          ]}
        />
      )}
      {result.status === 'error' && <p className="mt-3 text-sm text-red-600">{result.message}</p>}
      {result.status === 'ok' && (
        <>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <Metric
              label="캠페인"
              value={`${result.campaignCount}개 (운영 ${result.enabledCount})`}
            />
            <Metric label="이번 달 노출" value={result.impressions.toLocaleString('ko-KR')} />
            <Metric label="이번 달 클릭" value={result.clicks.toLocaleString('ko-KR')} />
            <Metric label="클릭률(CTR)" value={`${result.ctr.toFixed(2)}%`} />
          </div>
          <div className="mt-3">
            <Metric label="이번 달 광고비" value={`${result.cost.toLocaleString('ko-KR')}원`} />
          </div>
          {result.campaigns.length > 0 && (
            <ul className="mt-3 divide-y divide-slate-100">
              {result.campaigns.map((c) => (
                <li key={c.name} className="flex items-center justify-between gap-3 py-2">
                  <span className="min-w-0 truncate text-sm text-slate-700">{c.name}</span>
                  <span
                    className={`shrink-0 text-xs ${
                      c.enabled ? 'text-emerald-600' : 'text-slate-400'
                    }`}
                  >
                    {c.enabled ? '운영중' : '중지'}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </>
      )}
    </section>
  )
}
