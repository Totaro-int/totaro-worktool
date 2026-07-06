import type { JSX } from 'react'

import { PageHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

import { OfficeScene } from './OfficeScene'

// 에이전트 활동은 수시로 바뀐다 — 항상 최신으로 렌더한다.
export const dynamic = 'force-dynamic'

export const metadata = {
  title: 'AI부서 · 토타로 워크툴',
  description: '토타로의 AI 직원들이 책상에서 근무하는 모습을 한눈에.',
}

type AgentRow = {
  id: string
  slug: string
  name: string
  department: string | null
  role_description: string | null
  model: string | null
  status: string
  created_at: string
}

type ActionRow = {
  agent_id: string | null
  summary: string
  created_at: string
}

export type Desk = {
  slug: string
  name: string
  department: string
  role: string
  model: string
  status: string
  domain: 'marketing' | 'dev' | 'ops'
  workingNow: boolean
  lastSummary: string | null
  lastLabel: string
  actionCount: number
}

/** slug → 화면에 보일 업무 도메인(모니터 화면 내용 결정). */
function domainOf(slug: string): Desk['domain'] {
  if (slug === 'choi-jian') return 'dev'
  if (slug === 'sim-jaehak') return 'ops'
  return 'marketing'
}

/** 서버에서 한 번만 계산하는 한국어 상대시간 — 클라이언트 Date 사용을 피해 hydration 불일치를 막는다. */
function timeAgo(iso: string | null): string {
  if (!iso) return '활동 없음'
  const diff = Date.now() - new Date(iso).getTime()
  const m = Math.floor(diff / 60_000)
  if (m < 1) return '방금'
  if (m < 60) return `${m}분 전`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}시간 전`
  const d = Math.floor(h / 24)
  if (d < 7) return `${d}일 전`
  return `${Math.floor(d / 7)}주 전`
}

// 책상 배치 순서 (마케팅 → 개발 → 운영)
const SLUG_ORDER = ['kim-sahyun', 'choi-jian', 'sim-jaehak']

export default async function AiTeamPage(): Promise<JSX.Element> {
  const supabase = await createClient()
  const [{ data: agentsData }, { data: actionsData }] = await Promise.all([
    supabase.from('agents').select('*'),
    supabase
      .from('agent_actions')
      .select('agent_id, summary, created_at')
      .order('created_at', { ascending: false })
      .limit(120),
  ])

  const agents = (agentsData ?? []) as AgentRow[]
  const actions = (actionsData ?? []) as ActionRow[]
  // 서버 컴포넌트는 요청당 1회 렌더 — 현재 시각 조회는 의도된 동작
  // eslint-disable-next-line react-hooks/purity
  const dayAgo = Date.now() - 24 * 60 * 60 * 1000

  const desks: Desk[] = agents
    .filter((a) => a.status !== 'retired')
    .map((a): Desk => {
      const mine = actions.filter((x) => x.agent_id === a.id)
      const latest = mine[0] ?? null
      const lastAt = latest?.created_at ?? null
      const workingNow = lastAt ? new Date(lastAt).getTime() > dayAgo : false
      return {
        slug: a.slug,
        name: a.name,
        department: a.department ?? '미배정',
        role: a.role_description ?? '',
        model: a.model ?? '—',
        status: a.status,
        domain: domainOf(a.slug),
        workingNow,
        lastSummary: latest?.summary ?? null,
        lastLabel: timeAgo(lastAt),
        actionCount: mine.length,
      }
    })
    .sort((x, y) => {
      const ix = SLUG_ORDER.indexOf(x.slug)
      const iy = SLUG_ORDER.indexOf(y.slug)
      return (ix < 0 ? 99 : ix) - (iy < 0 ? 99 : iy)
    })

  const workingCount = desks.filter((d) => d.workingNow).length

  return (
    <div className="min-h-screen bg-[#0c1830]">
      <PageHeader
        title="AI부서"
        description="토타로의 AI 직원들이 책상을 지키며 24시간 근무합니다. 책상을 누르면 그 직원의 업무를 자세히 볼 수 있어요."
      >
        <div className="rounded-xl bg-[#101f38] px-4 py-2 text-right ring-1 ring-[#1c3556]">
          <p className="text-2xl leading-none font-bold text-[#dbe7f4] tabular-nums">
            {workingCount}
            <span className="text-base font-medium text-[#6b7c96]">/{desks.length}</span>
          </p>
          <p className="mt-1 text-[11px] font-medium tracking-wide text-[#6b7c96]">근무 중</p>
        </div>
      </PageHeader>

      <main className="mx-auto max-w-6xl px-6 py-10">
        <OfficeScene desks={desks} />
      </main>
    </div>
  )
}
