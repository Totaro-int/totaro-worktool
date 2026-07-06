import Link from 'next/link'

import { AreaTaskList } from '@/components/AreaTaskList'
import { ConsoleShell, StatPanel } from '@/components/console'
import { PageHeader } from '@/components/ui'
import { isStale, timeAgo } from '@/lib/format'
import { getCommerceData } from '@/lib/naver/commerce'
import { getSearchAdData } from '@/lib/naver/searchad'
import { createClient } from '@/lib/supabase/server'

import { saveKpi } from './actions'

type RangeKey = 'today' | '7d' | '30d'

/** searchParams 의 range 값을 날짜 범위(YYYY-MM-DD)로 해석한다. */
function resolveRange(key?: string): {
  key: RangeKey
  label: string
  since: string
  until: string
} {
  const fmt = (d: Date): string => d.toLocaleDateString('en-CA', { timeZone: 'Asia/Seoul' })
  const until = fmt(new Date())
  const back = (n: number): string => {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return fmt(d)
  }
  if (key === 'today') return { key: 'today', label: '오늘', since: until, until }
  if (key === '30d') return { key: '30d', label: '최근 30일', since: back(29), until }
  return { key: '7d', label: '최근 7일', since: back(6), until }
}

/** 숫자를 원화 문자열로 변환한다. */
function won(n: number): string {
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

export default async function NaverHubPage({
  searchParams,
}: {
  searchParams: Promise<{ range?: string }>
}): Promise<React.JSX.Element> {
  const { range: rangeParam } = await searchParams
  const range = resolveRange(rangeParam)

  const supabase = await createClient()
  const [searchAd, commerce, kpiRes] = await Promise.all([
    getSearchAdData({ since: range.since, until: range.until }),
    getCommerceData(),
    supabase.from('naver_kpi').select('target_roas').eq('id', 1).maybeSingle(),
  ])

  const kpiMissing =
    kpiRes.error != null &&
    (kpiRes.error.code === '42P01' ||
      kpiRes.error.code === 'PGRST205' ||
      kpiRes.error.message.includes('does not exist') ||
      kpiRes.error.message.includes('schema cache'))
  const rawRoas = kpiRes.data ? Number(kpiRes.data.target_roas) : NaN
  const targetRoas = Number.isFinite(rawRoas) ? rawRoas : null

  const ad = searchAd.status === 'ok' ? searchAd : null

  const convNote = ad && ad.clicks > 0 && ad.adRevenue === 0 ? '전환추적 연동 필요' : undefined
  const com = commerce.status === 'ok' ? commerce : null
  // 스냅샷 워커가 최근 1시간 안에 돌았는지 판정 — 너무 오래되면 stale 경고
  const STALE_MS = 60 * 60 * 1000
  const syncedAt =
    commerce.status === 'ok' || (commerce.status === 'error' && commerce.syncedAt)
      ? (commerce as { syncedAt?: string }).syncedAt
      : undefined
  const stale = syncedAt ? isStale(syncedAt, STALE_MS) : false
  const syncNote = syncedAt
    ? stale
      ? `⚠️ 동기화 ${timeAgo(syncedAt)} (워커 점검 필요)`
      : `동기화 ${timeAgo(syncedAt)}`
    : undefined
  const commerceNote =
    commerce.status === 'error'
      ? `커머스 오류: ${commerce.message}`
      : commerce.status === 'needs_migration'
        ? 'naver_commerce_snapshot 테이블 생성 필요'
        : commerce.status === 'unconfigured'
          ? '워커 미실행 — sync-naver-commerce 1회 돌려 주세요'
          : syncNote
  const pendingNote =
    com && com.pendingRevenue > 0 ? `입금대기 ${won(com.pendingRevenue)}` : undefined
  const nonAdRevenue = com ? Math.max(com.paidRevenue - (ad?.adRevenue ?? 0), 0) : 0

  return (
    <>
      <PageHeader
        title="네이버 · 마케팅 콘솔"
        description="검색광고·커머스 지표를 매일 추적해 업무 계획에 씁니다."
      />
      <ConsoleShell>
        <AreaTaskList workAreaId="ai_branding" />

        <div className="flex flex-wrap items-center justify-between gap-3">
          <DateBar active={range.key} />
          <div className="flex items-center gap-1.5">
            <span
              className={`h-1.5 w-1.5 rounded-full ${
                searchAd.status === 'ok' ? 'bg-emerald-500' : 'bg-amber-400'
              }`}
            />
            <span className="font-mono text-[10px] tracking-[0.14em] text-[#6b7c96]">
              검색광고 {searchAd.status === 'ok' ? 'ONLINE' : 'OFFLINE'}
            </span>
          </div>
        </div>

        {searchAd.status === 'error' && (
          <p className="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-600 ring-1 ring-red-200">
            검색광고 데이터를 불러오지 못했습니다 — {searchAd.message}
          </p>
        )}

        <KpiPanel
          targetRoas={targetRoas}
          actualRoas={ad?.roas ?? 0}
          expectedRevenue={ad ? (ad.cost * (targetRoas ?? 0)) / 100 : 0}
          adRevenue={ad?.adRevenue ?? 0}
          missing={kpiMissing}
        />

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <StatPanel
            label="ROAS"
            value={ad ? `${ad.roas.toFixed(0)}%` : '—'}
            accent="blue"
            note={convNote}
          />
          <StatPanel
            label="광고매출 · 전환"
            value={ad ? won(ad.adRevenue) : '—'}
            accent="blue"
            note={convNote}
          />
          <StatPanel label="광고 지출비" value={ad ? won(ad.cost) : '—'} accent="slate" />
          <StatPanel
            label="전환수"
            value={ad ? ad.conversions.toLocaleString('ko-KR') : '—'}
            note={convNote}
          />
          <StatPanel
            label="클릭률 CTR"
            value={ad ? `${ad.ctr.toFixed(2)}%` : '—'}
            sub={
              ad
                ? `노출 ${ad.impressions.toLocaleString('ko-KR')} · 클릭 ${ad.clicks.toLocaleString('ko-KR')}`
                : undefined
            }
            accent="slate"
          />
          <StatPanel
            label="캠페인"
            value={ad ? `${ad.campaignCount}개` : '—'}
            sub={ad ? `운영 ${ad.enabledCount}개` : undefined}
            accent="slate"
          />
          <StatPanel
            label="총 실제 매출"
            value={com ? won(com.paidRevenue) : '—'}
            sub={com ? `오늘 · 주문 ${com.orderCount}건` : undefined}
            accent="amber"
            note={commerceNote ?? pendingNote}
          />
          <StatPanel
            label="광고 X 매출"
            value={com ? won(nonAdRevenue) : '—'}
            sub={com ? '오늘 매출 − 광고매출' : undefined}
            accent="amber"
            note={commerceNote}
          />
        </div>

        {commerce.status === 'needs_migration' && (
          <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-700 ring-1 ring-amber-200">
            커머스 스냅샷 테이블이 없습니다 — Supabase SQL Editor 에서{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              supabase/naver-commerce-snapshot.sql
            </code>{' '}
            을 실행한 뒤, 화이트리스트 IP 머신에서{' '}
            <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-xs">
              npx tsx scripts/sync-naver-commerce.ts
            </code>{' '}
            를 한 번 돌려 주세요.
          </p>
        )}

        <p className="font-mono text-[10px] tracking-wide text-[#6b7c96]">
          {range.since} ~ {range.until} · 네이버 검색광고 API · 커머스 스냅샷
          {syncedAt ? ` ${timeAgo(syncedAt)}` : ''}
        </p>
      </ConsoleShell>
    </>
  )
}

/** 기간 선택 컨트롤 바. */
function DateBar({ active }: { active: RangeKey }): React.JSX.Element {
  const opts: { key: RangeKey; label: string }[] = [
    { key: 'today', label: '오늘' },
    { key: '7d', label: '최근 7일' },
    { key: '30d', label: '최근 30일' },
  ]
  return (
    <div className="flex items-center gap-2.5">
      <span className="font-mono text-[10px] tracking-[0.2em] text-[#6b7c96]">RANGE</span>
      <div className="flex gap-1 rounded-lg bg-[#101f38] p-1 shadow-sm ring-1 ring-[#1c3556]">
        {opts.map((o) => (
          <Link
            key={o.key}
            href={`/hub/naver?range=${o.key}`}
            className={`rounded-md px-3 py-1 text-xs font-medium transition-colors ${
              active === o.key ? 'bg-blue-600 text-white' : 'text-[#8ea0b8] hover:bg-[#14263f]'
            }`}
          >
            {o.label}
          </Link>
        ))}
      </div>
    </div>
  )
}

/** KPI 셀 — 라벨 + 값. */
function KpiCell({
  label,
  value,
  big,
}: {
  label: string
  value: string
  big?: boolean
}): React.JSX.Element {
  return (
    <div>
      <p className="font-mono text-[10px] tracking-[0.14em] text-[#6b7c96]">{label}</p>
      <p className={`mt-1 font-bold text-[#dbe7f4] tabular-nums ${big ? 'text-2xl' : 'text-lg'}`}>
        {value}
      </p>
    </div>
  )
}

/** KPI 패널 — 목표 ROAS 대비 실제 성과 + 목표 수정. */
function KpiPanel({
  targetRoas,
  actualRoas,
  expectedRevenue,
  adRevenue,
  missing,
}: {
  targetRoas: number | null
  actualRoas: number
  expectedRevenue: number
  adRevenue: number
  missing: boolean
}): React.JSX.Element {
  const hasTarget = targetRoas != null && targetRoas > 0
  const achievement = targetRoas != null && targetRoas > 0 ? (actualRoas / targetRoas) * 100 : 0
  return (
    <div className="overflow-hidden rounded-xl bg-[#101f38] shadow-md ring-1 ring-[#1c3556]">
      <div className="flex items-center justify-between bg-blue-600 px-5 py-2.5">
        <span className="font-mono text-[11px] font-semibold tracking-[0.14em] text-white">
          KPI · 마케팅비 대비 매출 목표
        </span>
        <span className="font-mono text-[10px] tracking-wide text-blue-200">TARGET ROAS</span>
      </div>
      <div className="p-5">
        {missing ? (
          <p className="text-sm text-amber-600">
            KPI 테이블이 없습니다 — Supabase SQL Editor에서{' '}
            <code className="rounded bg-[#0c1830] px-1 py-0.5 font-mono text-xs text-[#9fb4d0]">
              supabase/naver-kpi.sql
            </code>{' '}
            을 실행하세요.
          </p>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              <KpiCell label="목표 ROAS" value={hasTarget ? `${targetRoas}%` : '미설정'} big />
              <KpiCell label="예상 매출" value={won(expectedRevenue)} />
              <KpiCell label="실제 ROAS" value={`${actualRoas.toFixed(0)}%`} big />
              <KpiCell label="실제 광고매출" value={won(adRevenue)} />
            </div>
            <div className="mt-4">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono tracking-wide text-[#6b7c96]">달성률</span>
                <span className="font-bold text-[#c4d2e4] tabular-nums">
                  {hasTarget ? `${achievement.toFixed(0)}%` : '—'}
                </span>
              </div>
              <div className="mt-1.5 h-2.5 overflow-hidden rounded-full bg-[#0c1830]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-blue-400 to-blue-600"
                  style={{ width: `${Math.min(Math.max(achievement, 0), 100)}%` }}
                />
              </div>
            </div>
            <details className="mt-4">
              <summary className="cursor-pointer list-none font-mono text-[11px] tracking-wide text-blue-500 hover:text-blue-600">
                목표 수정
              </summary>
              <form action={saveKpi} className="mt-2 flex items-center gap-2">
                <input
                  type="number"
                  name="target_roas"
                  min={1}
                  step={10}
                  defaultValue={targetRoas ?? 400}
                  className="w-28 rounded-lg border border-[#24405f] px-3 py-1.5 text-sm tabular-nums outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                />
                <span className="text-sm text-[#6b7c96]">%</span>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-blue-700"
                >
                  저장
                </button>
              </form>
            </details>
          </>
        )}
      </div>
    </div>
  )
}
