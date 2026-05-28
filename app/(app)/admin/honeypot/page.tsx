import Link from 'next/link'

import { identifyBot, type BotIdentity } from '@/lib/honeypot/identify'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'
export const revalidate = 0

interface HoneypotHit {
  id: string
  honeypot_id: string
  variant: string
  method: string | null
  url: string | null
  ip: string | null
  user_agent: string | null
  referer: string | null
  accept: string | null
  status_returned: number | null
  bytes_returned: number | null
  response_ms: number | null
  hit_at: string
}

interface BotAgg {
  identity: BotIdentity
  count: number
  lastHitAt: string
  variants: Set<string>
}

interface VariantAgg {
  variant: string
  count: number
  bots: Set<string>
  lastHitAt: string
}

function aggregateByBot(hits: HoneypotHit[]): BotAgg[] {
  const map = new Map<string, BotAgg>()
  for (const h of hits) {
    const id = identifyBot(h.user_agent)
    const key = id.name
    const existing = map.get(key)
    if (existing) {
      existing.count++
      existing.variants.add(h.variant)
      if (h.hit_at > existing.lastHitAt) existing.lastHitAt = h.hit_at
    } else {
      map.set(key, {
        identity: id,
        count: 1,
        lastHitAt: h.hit_at,
        variants: new Set([h.variant]),
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

function aggregateByVariant(hits: HoneypotHit[]): VariantAgg[] {
  const map = new Map<string, VariantAgg>()
  for (const h of hits) {
    const existing = map.get(h.variant)
    const botName = identifyBot(h.user_agent).name
    if (existing) {
      existing.count++
      existing.bots.add(botName)
      if (h.hit_at > existing.lastHitAt) existing.lastHitAt = h.hit_at
    } else {
      map.set(h.variant, {
        variant: h.variant,
        count: 1,
        bots: new Set([botName]),
        lastHitAt: h.hit_at,
      })
    }
  }
  return Array.from(map.values()).sort((a, b) => b.count - a.count)
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  })
}

function fmtBytes(b: number | null): string {
  if (b === null) return '—'
  if (b < 1024) return `${b}B`
  if (b < 1024 * 1024) return `${(b / 1024).toFixed(1)}KB`
  return `${(b / 1024 / 1024).toFixed(2)}MB`
}

function botTypeBadge(type: BotIdentity['type']): { label: string; cls: string } {
  switch (type) {
    case 'training':
      return { label: '학습', cls: 'bg-red-100 text-red-800' }
    case 'search':
      return { label: '검색', cls: 'bg-blue-100 text-blue-800' }
    case 'user':
      return { label: '사용자', cls: 'bg-emerald-100 text-emerald-800' }
    case 'human':
      return { label: '사람', cls: 'bg-slate-200 text-slate-700' }
    default:
      return { label: '기타', cls: 'bg-amber-100 text-amber-800' }
  }
}

export default async function HoneypotDashboardPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('honeypot_hits')
    .select('*')
    .order('hit_at', { ascending: false })
    .limit(500)

  if (error) {
    return (
      <div className="mx-auto max-w-4xl p-8">
        <h1 className="mb-4 text-2xl font-bold">Honeypot Dashboard</h1>
        <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-900">
          <p className="font-semibold">Supabase 쿼리 실패</p>
          <p className="mt-1 font-mono text-xs">{error.message}</p>
          <p className="mt-3">
            <code>supabase/honeypot.sql</code> 을 Supabase SQL Editor 에 실행했는지 확인하세요.
          </p>
        </div>
      </div>
    )
  }

  const hits = (data ?? []) as HoneypotHit[]
  const byBot = aggregateByBot(hits)
  const byVariant = aggregateByVariant(hits)

  // 요청 시점 기준 — server component 는 매 요청마다 새로 렌더되므로 안전
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const lastHour = hits.filter((h) => now - new Date(h.hit_at).getTime() < 60 * 60 * 1000).length
  const lastDay = hits.filter(
    (h) => now - new Date(h.hit_at).getTime() < 24 * 60 * 60 * 1000
  ).length
  const distinctBots = new Set(hits.map((h) => identifyBot(h.user_agent).name)).size

  return (
    <div className="mx-auto max-w-7xl space-y-8 p-8">
      <header className="flex items-end justify-between">
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Honeypot Dashboard</h1>
          <p className="mt-1 text-sm text-slate-600">
            AI 크롤러 실측 — AEO/GEO Reverse Engineering · 최근 500건
          </p>
        </div>
        <Link
          href="/admin/honeypot"
          className="rounded-md bg-slate-900 px-3 py-1.5 text-sm font-medium text-white hover:bg-slate-700"
        >
          새로고침
        </Link>
      </header>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <SummaryCard label="총 hits (최근 500건)" value={hits.length.toString()} />
        <SummaryCard label="지난 1시간" value={lastHour.toString()} />
        <SummaryCard label="지난 24시간" value={lastDay.toString()} />
        <SummaryCard label="구분된 봇 수" value={distinctBots.toString()} />
      </div>

      {/* By bot */}
      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">봇별 hit (User-Agent 식별)</h2>
        {byBot.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">봇</th>
                  <th className="px-4 py-2 font-medium">분류</th>
                  <th className="px-4 py-2 font-medium">제공사</th>
                  <th className="px-4 py-2 text-right font-medium">hits</th>
                  <th className="px-4 py-2 font-medium">테스트한 variant</th>
                  <th className="px-4 py-2 font-medium">최근 hit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byBot.map((agg) => {
                  const badge = botTypeBadge(agg.identity.type)
                  return (
                    <tr key={agg.identity.name}>
                      <td className="px-4 py-2 font-mono">{agg.identity.name}</td>
                      <td className="px-4 py-2">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs ${badge.cls}`}>
                          {badge.label}
                        </span>
                      </td>
                      <td className="px-4 py-2 text-slate-600">{agg.identity.provider}</td>
                      <td className="px-4 py-2 text-right font-mono font-semibold">{agg.count}</td>
                      <td className="px-4 py-2 text-xs text-slate-600">
                        {Array.from(agg.variants).join(', ')}
                      </td>
                      <td className="px-4 py-2 text-xs text-slate-500">{fmtTime(agg.lastHitAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* By variant */}
      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">Variant 별 hit</h2>
        {byVariant.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-4 py-2 font-medium">Variant</th>
                  <th className="px-4 py-2 text-right font-medium">hits</th>
                  <th className="px-4 py-2 font-medium">방문 봇</th>
                  <th className="px-4 py-2 font-medium">최근 hit</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {byVariant.map((v) => (
                  <tr key={v.variant}>
                    <td className="px-4 py-2 font-mono">{v.variant}</td>
                    <td className="px-4 py-2 text-right font-mono font-semibold">{v.count}</td>
                    <td className="px-4 py-2 text-xs text-slate-600">
                      {Array.from(v.bots).join(', ')}
                    </td>
                    <td className="px-4 py-2 text-xs text-slate-500">{fmtTime(v.lastHitAt)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Recent hits */}
      <section>
        <h2 className="mb-3 text-xl font-semibold text-slate-900">최근 hits (raw)</h2>
        {hits.length === 0 ? (
          <EmptyHint />
        ) : (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white shadow-sm">
            <table className="w-full text-sm">
              <thead className="bg-slate-50 text-left text-slate-600">
                <tr>
                  <th className="px-3 py-2 font-medium">시간</th>
                  <th className="px-3 py-2 font-medium">variant</th>
                  <th className="px-3 py-2 font-medium">id</th>
                  <th className="px-3 py-2 font-medium">봇</th>
                  <th className="px-3 py-2 font-medium">IP</th>
                  <th className="px-3 py-2 text-right font-medium">status</th>
                  <th className="px-3 py-2 text-right font-medium">bytes</th>
                  <th className="px-3 py-2 text-right font-medium">ms</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {hits.slice(0, 100).map((h) => {
                  const id = identifyBot(h.user_agent)
                  return (
                    <tr key={h.id}>
                      <td className="px-3 py-2 text-xs text-slate-500">{fmtTime(h.hit_at)}</td>
                      <td className="px-3 py-2 font-mono text-xs">{h.variant}</td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">
                        {h.honeypot_id}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <span className="font-mono">{id.name}</span>
                      </td>
                      <td className="px-3 py-2 font-mono text-xs text-slate-600">{h.ip ?? '—'}</td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {h.status_returned ?? '—'}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {fmtBytes(h.bytes_returned)}
                      </td>
                      <td className="px-3 py-2 text-right font-mono text-xs">
                        {h.response_ms ?? '—'}
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <footer className="text-xs text-slate-500">
        테스트 방법: <code>docs/honeypot-test-battery.md</code> 참고. 페이지 자동 갱신은 없음 — 위의
        새로고침 버튼을 누르세요.
      </footer>
    </div>
  )
}

function SummaryCard({ label, value }: { label: string; value: string }): React.JSX.Element {
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-sm">
      <p className="text-xs font-medium text-slate-500">{label}</p>
      <p className="mt-1 text-2xl font-bold text-slate-900">{value}</p>
    </div>
  )
}

function EmptyHint(): React.JSX.Element {
  return (
    <div className="rounded-lg border border-dashed border-slate-300 bg-white p-8 text-center text-sm text-slate-500">
      아직 hit 가 없습니다. <code>docs/honeypot-test-battery.md</code> 의 prompt 를 AI 에 던지고
      새로고침하세요.
    </div>
  )
}
