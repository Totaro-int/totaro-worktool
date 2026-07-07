import { GlassHub, type GlassHubModule } from '@/components/GlassHub'
import { HubBoard, type HubNode } from '@/components/HubBoard'
import { getAgentData } from '@/lib/agents'
import { getGithubData } from '@/lib/github'
import { getMailroomData } from '@/lib/mailroom/stats'
import { getCommerceData } from '@/lib/naver/commerce'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

import { CalendarToday } from './CalendarToday'
import { MissionBanner } from './MissionBanner'

/** 원화 압축 표기 — ₩3.2억 / ₩1,240만 / ₩820. (기존 표기 유지) */
function wonCompact(n: number): string {
  if (n >= 1e8) {
    const v = n / 1e8
    return `₩${Number(v.toFixed(v >= 10 ? 1 : 2))}억`
  }
  if (n >= 1e4) {
    const v = n / 1e4
    return `₩${(v >= 100 ? Math.round(v) : Number(v.toFixed(1))).toLocaleString('ko-KR')}만`
  }
  return `₩${Math.round(n).toLocaleString('ko-KR')}`
}

export default async function HubPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  // 인증·할 일·각 거점 데이터를 한 번에 병렬 호출 — 허브 첫 화면에 실데이터를 채운다.
  const [
    { data: userRes },
    { data: taskData },
    githubResult,
    commerceResult,
    agentResult,
    mailroomResult,
    { count: assistantCount },
    { count: aiTeamCount },
  ] = await Promise.all([
    supabase.auth.getUser(),
    supabase.from('tasks').select('status'),
    getGithubData(),
    getCommerceData(),
    getAgentData(),
    getMailroomData(),
    supabase
      .from('inbox_documents')
      .select('id', { count: 'exact', head: true })
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)'),
    supabase.from('agents').select('id', { count: 'exact', head: true }).neq('status', 'retired'),
  ])

  const { data: cashRow } = await supabase
    .from('cash_snapshots')
    .select('balance_krw, as_of_date')
    .order('as_of_date', { ascending: false })
    .limit(1)
    .maybeSingle<{ balance_krw: number; as_of_date: string }>()
  const user = userRes.user

  const tasks = (taskData ?? []) as Pick<Task, 'status'>[]
  const openCount = tasks.filter((t) => t.status !== 'done').length

  const gh = githubResult.status === 'ok' ? githubResult : null
  const com = commerceResult.status === 'ok' ? commerceResult : null
  const ag = agentResult.status === 'ok' ? agentResult : null
  const mr = mailroomResult.status === 'ok' ? mailroomResult : null

  // 허브 9거점 (실데이터). 배치·모양은 HubBoard 가 href 로 결정.
  const nodes: HubNode[] = [
    {
      href: '/tasks',
      name: '공통',
      subText: '이번 주 할 일',
      value: String(openCount),
    },
    {
      href: '/assistant',
      name: 'AI 직원',
      subText: '근거 문서',
      value: typeof assistantCount === 'number' ? assistantCount.toLocaleString('ko-KR') : '—',
    },
    {
      href: '/inbox',
      name: '우편실',
      subText: mr ? `문서 ${mr.total}건` : '인덱싱 문서',
      value: mr ? String(mr.total) : '—',
    },
    {
      href: '/hub/naver',
      name: '네이버',
      subText: com ? `오늘 · 주문 ${com.orderCount}건` : '판매 · 마케팅',
      value: com ? wonCompact(com.paidRevenue) : '—',
    },
    {
      href: '/hub/ai-team',
      name: 'AI부서',
      subText: 'AI 직원',
      value: typeof aiTeamCount === 'number' ? String(aiTeamCount) : '3',
    },
    {
      href: '/hub/github',
      name: 'GitHub',
      subText: gh ? `오늘 커밋 · ${gh.repoCount} repos` : '개발 · README',
      value: gh ? `${gh.commitsToday}` : '—',
    },
    {
      href: '/hub/agent',
      name: '에이전트',
      subText: ag ? `운영 ${ag.activeCount} · 이번 달` : '관리 · 판매',
      value: ag ? wonCompact(ag.monthlyRevenue) : '—',
    },
    {
      href: '/contacts',
      name: '회사 연락처',
      subText: '명함 OCR · 연락처',
      value: '—',
    },
    {
      href: '/cash',
      name: '가용 현금',
      subText: cashRow ? `기준 ${cashRow.as_of_date}` : '잔고 일지',
      value: cashRow ? wonCompact(cashRow.balance_krw) : '—',
    },
  ]

  // 유리박스 모듈 9개 — 3×3 그리드 배치 (중앙 = 할 일)
  const byHref = new Map(nodes.map((n) => [n.href, n]))
  const gm = (href: string, icon: string, x: number, z: number): GlassHubModule => {
    const n = byHref.get(href)!
    return { href, name: n.name, value: n.value, sub: n.subText, icon, x, z }
  }
  const S = 2.85
  const glassModules: GlassHubModule[] = [
    // 뒷줄
    gm('/assistant', 'assistant', -S, -S),
    gm('/hub/ai-team', 'ai-team', 0, -S),
    gm('/hub/github', 'github', S, -S),
    // 가운데줄
    gm('/inbox', 'inbox', -S, 0),
    gm('/tasks', 'tasks', 0, 0),
    gm('/hub/naver', 'naver', S, 0),
    // 앞줄
    gm('/contacts', 'contacts', -S, S),
    gm('/cash', 'cash', 0, S),
    gm('/hub/agent', 'agent', S, S),
  ]

  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: 'radial-gradient(120% 90% at 50% 26%, #12294d 0%, #0b1a33 45%, #081120 100%)',
        color: '#dbe7f4',
      }}
    >
      <MissionBanner />

      {/* 리드아웃 티커 */}
      <div
        className="flex items-center gap-3 border-b px-4 py-2 font-mono text-[11px] md:px-8"
        style={{ borderColor: 'rgba(53,224,255,.1)' }}
      >
        <span
          className="inline-block h-2 w-2 flex-none rounded-full"
          style={{ background: '#3ddc97', boxShadow: '0 0 8px #3ddc97' }}
        />
        <span style={{ color: '#3ddc97', letterSpacing: 2 }}>SYSTEM ONLINE</span>
        <span className="truncate" style={{ color: '#7e8ca0' }}>
          이번 주 할 일 {openCount}건 · 가용 현금 {cashRow ? wonCompact(cashRow.balance_krw) : '—'}{' '}
          · 오늘 커밋 {gh ? gh.commitsToday : '—'}
        </span>
      </div>

      {/* 데스크탑: Spline 유리박스 3D 허브 / 모바일: 칩 카드 그리드 */}
      <div className="relative flex flex-1 flex-col">
        <div className="relative hidden flex-1 md:block">
          <GlassHub modules={glassModules} />
        </div>
        <HubBoard nodes={nodes} mobileOnly />
        {user ? (
          <div className="absolute right-4 bottom-4 z-10 hidden md:block">
            <CalendarToday userId={user.id} />
          </div>
        ) : null}
      </div>
    </div>
  )
}
