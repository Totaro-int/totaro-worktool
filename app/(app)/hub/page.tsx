import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { getAgentData } from '@/lib/agents'
import { getGithubData } from '@/lib/github'
import { getMailroomData } from '@/lib/mailroom/stats'
import { getCommerceData } from '@/lib/naver/commerce'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

type IconName = 'tasks' | 'github' | 'naver' | 'agent' | 'mailroom' | 'assistant'

type Accent = 'blue' | 'amber' | 'emerald' | 'indigo' | 'rose' | 'violet'

/** 노드 큐브의 재질(면별 그라데이션)·조명·라벨 색을 한 묶음으로 정의한다. */
type CubePalette = {
  top: [string, string]
  left: [string, string]
  right: [string, string]
  emblem: string
  iconColor: string
  header: string
  pool: string
  poolOpacity: number
}

/** 톤다운 파스텔 팔레트 — 채도를 낮춰 쨍하지 않게. */
const PALETTE: Record<Accent, CubePalette> = {
  blue: {
    top: ['#ffffff', '#eef2f8'],
    left: ['#d6dfea', '#c2cddd'],
    right: ['#bfcadd', '#aab8cd'],
    emblem: 'rgba(37, 99, 235, 0.1)',
    iconColor: '#2f63cc',
    header: '#3b6fd4',
    pool: '#2563eb',
    poolOpacity: 0.28,
  },
  amber: {
    top: ['#fffdf9', '#f6efe2'],
    left: ['#ece1cd', '#ddceb2'],
    right: ['#dccfb1', '#cabf9c'],
    emblem: 'rgba(180, 83, 9, 0.1)',
    iconColor: '#b06f1d',
    header: '#e0a23f',
    pool: '#f0b24a',
    poolOpacity: 0.24,
  },
  emerald: {
    top: ['#f8fffc', '#e6f3ec'],
    left: ['#c8e0d4', '#aed0bf'],
    right: ['#b0d2c2', '#97c2ac'],
    emblem: 'rgba(4, 120, 87, 0.1)',
    iconColor: '#0f8a66',
    header: '#2fa982',
    pool: '#10b981',
    poolOpacity: 0.22,
  },
  indigo: {
    top: ['#ecf2ff', '#d8e6ff'],
    left: ['#7ea2dd', '#6a8ace'],
    right: ['#4d6ea6', '#3f5b8a'],
    emblem: 'rgba(255, 255, 255, 0.55)',
    iconColor: '#26407f',
    header: '#6d70e0',
    pool: '#6366f1',
    poolOpacity: 0.34,
  },
  rose: {
    top: ['#fff8f9', '#f6e7ea'],
    left: ['#ecccd2', '#ddb0b9'],
    right: ['#dcb3bb', '#c9a0a9'],
    emblem: 'rgba(190, 24, 60, 0.1)',
    iconColor: '#c14a5e',
    header: '#e06a80',
    pool: '#f43f5e',
    poolOpacity: 0.22,
  },
  violet: {
    top: ['#f5f0ff', '#e7dbff'],
    left: ['#c4a9ec', '#b092e0'],
    right: ['#9d77d4', '#8961c0'],
    emblem: 'rgba(124, 58, 237, 0.12)',
    iconColor: '#6b21c8',
    header: '#8b5cf6',
    pool: '#8b5cf6',
    poolOpacity: 0.26,
  },
}

type NodeSpec = {
  href: string
  name: string
  icon: IconName
  subText: string
  value: string
  position: string
  accent: Accent
  hero?: boolean
}

/** 노드용 단색 라인 아이콘. */
function NodeIcon({
  name,
  size,
  color,
}: {
  name: IconName
  size: number
  color: string
}): React.JSX.Element {
  const props = {
    width: size,
    height: size,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: color,
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
  }
  if (name === 'github') {
    return (
      <svg {...props}>
        <polyline points="9 7 4 12 9 17" />
        <polyline points="15 7 20 12 15 17" />
      </svg>
    )
  }
  if (name === 'naver') {
    return (
      <svg {...props}>
        <polyline points="7 18 7 6 17 18 17 6" />
      </svg>
    )
  }
  if (name === 'agent') {
    return (
      <svg {...props}>
        <rect x="4" y="9" width="16" height="11" rx="3" />
        <line x1="12" y1="4.6" x2="12" y2="9" />
        <circle cx="12" cy="4" r="1.5" fill={color} stroke="none" />
        <circle cx="9.4" cy="14.6" r="1.3" fill={color} stroke="none" />
        <circle cx="14.6" cy="14.6" r="1.3" fill={color} stroke="none" />
      </svg>
    )
  }
  if (name === 'mailroom') {
    return (
      <svg {...props}>
        <rect x="3" y="5" width="18" height="14" rx="2.5" />
        <path d="M3.6 7.5 L12 13 L20.4 7.5" />
      </svg>
    )
  }
  if (name === 'assistant') {
    return (
      <svg {...props}>
        <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
        <circle cx="8.5" cy="12" r="1" fill={color} stroke="none" />
        <circle cx="12" cy="12" r="1" fill={color} stroke="none" />
        <circle cx="15.5" cy="12" r="1" fill={color} stroke="none" />
      </svg>
    )
  }
  return (
    <svg {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  )
}

/** 3면(윗면·좌측면·우측면) clip-path 폴리곤으로 아이소메트릭 큐브를 그린다.
 *  각 면은 그라데이션 + 앞쪽 세로 모서리 하이라이트로 '렌더된' 입체감을 낸다. */
function IsoCube({
  w,
  h,
  palette,
  icon,
}: {
  w: number
  h: number
  palette: CubePalette
  icon: IconName
}): React.JSX.Element {
  const bw = 2 * w
  const bh = w + h
  const half = w / 2
  const topPoly = `polygon(${w}px 0px, ${bw}px ${half}px, ${w}px ${w}px, 0px ${half}px)`
  const leftPoly = `polygon(0px ${half}px, ${w}px ${w}px, ${w}px ${bh}px, 0px ${half + h}px)`
  const rightPoly = `polygon(${w}px ${w}px, ${bw}px ${half}px, ${bw}px ${half + h}px, ${w}px ${bh}px)`
  const emblem = w * 0.66

  return (
    <div
      className="relative"
      style={{
        width: `${bw}px`,
        height: `${bh}px`,
        filter: 'drop-shadow(0 24px 18px rgba(15, 23, 42, 0.24))',
      }}
    >
      <div
        className="absolute inset-0"
        style={{
          clipPath: rightPoly,
          background: `linear-gradient(180deg, ${palette.right[0]}, ${palette.right[1]})`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          clipPath: leftPoly,
          background: `linear-gradient(180deg, ${palette.left[0]}, ${palette.left[1]})`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          clipPath: topPoly,
          background: `linear-gradient(135deg, ${palette.top[0]}, ${palette.top[1]})`,
        }}
      />
      {/* 앞쪽 세로 모서리 하이라이트 */}
      <div
        className="absolute"
        style={{
          left: `${w - 1}px`,
          top: `${w}px`,
          width: '2px',
          height: `${h}px`,
          background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.6), rgba(255, 255, 255, 0))',
        }}
        aria-hidden="true"
      />
      <div
        className="absolute flex items-center justify-center"
        style={{ left: `${w}px`, top: `${half}px`, transform: 'translate(-50%, -50%)' }}
      >
        <div
          className="absolute rounded-lg"
          style={{
            width: `${emblem}px`,
            height: `${emblem}px`,
            transform: 'rotate(45deg) scaleY(0.5)',
            background: palette.emblem,
          }}
          aria-hidden="true"
        />
        <span className="relative">
          <NodeIcon name={icon} size={w * 0.5} color={palette.iconColor} />
        </span>
      </div>
    </div>
  )
}

/** 노드 위에 떠 있는 라벨 카드 (파란 헤더 + 값 + 아래 화살표). */
function FloatingLabel({
  name,
  subText,
  value,
  hero,
  headerColor,
}: {
  name: string
  subText: string
  value: string
  hero?: boolean
  headerColor: string
}): React.JSX.Element {
  return (
    <div className={`relative ${hero ? 'w-48' : 'w-40'}`}>
      <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
        <div
          className="flex items-center justify-center gap-1.5 py-1.5 text-center text-xs font-bold tracking-wide text-white"
          style={{ background: headerColor }}
        >
          <span className="h-1.5 w-1.5 rounded-full bg-white/85" />
          {name}
        </div>
        <div className="px-3 py-2 text-center">
          <p className="text-[10px] font-semibold tracking-[0.12em] text-slate-400">{subText}</p>
          <p className="text-3xl leading-tight font-extrabold text-slate-800 tabular-nums">
            {value}
          </p>
        </div>
      </div>
      <div
        className="absolute top-full left-1/2 -translate-x-1/2"
        style={{
          width: 0,
          height: 0,
          borderLeft: '8px solid transparent',
          borderRight: '8px solid transparent',
          borderTop: '9px solid #ffffff',
        }}
        aria-hidden="true"
      />
    </div>
  )
}

function IsoNode({ node }: { node: NodeSpec }): React.JSX.Element {
  const w = node.hero ? 165 : 130
  const h = node.hero ? 118 : 92
  const p = PALETTE[node.accent]
  const poolW = node.hero ? 380 : 300
  const poolH = node.hero ? 150 : 118

  return (
    <Link
      href={node.href}
      className={`group absolute ${node.position} -translate-x-1/2 -translate-y-1/2`}
    >
      <div className="flex flex-col items-center">
        <FloatingLabel
          name={node.name}
          subText={node.subText}
          value={node.value}
          hero={node.hero}
          headerColor={p.header}
        />
        <div className="relative mt-6">
          {/* 색 조명 풀 — 노드가 바닥에 색광을 드리운다 */}
          <div
            className="pointer-events-none absolute bottom-[-4px] left-1/2 -translate-x-1/2 rounded-[50%]"
            style={{
              width: `${poolW}px`,
              height: `${poolH}px`,
              background: p.pool,
              opacity: p.poolOpacity,
              filter: 'blur(30px)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />
          {/* 바닥 접지 그림자 */}
          <div
            className="pointer-events-none absolute bottom-1.5 left-1/2 -translate-x-1/2 rounded-[50%]"
            style={{
              width: `${node.hero ? 240 : 190}px`,
              height: '42px',
              background: 'rgba(15, 23, 42, 0.18)',
              filter: 'blur(13px)',
              zIndex: 0,
            }}
            aria-hidden="true"
          />
          <div
            className="relative transition-transform duration-200 group-hover:-translate-y-2.5"
            style={{ zIndex: 1 }}
          >
            <IsoCube w={w} h={h} palette={p} icon={node.icon} />
          </div>
        </div>
      </div>
    </Link>
  )
}

/** 노드 라벨용 압축 원화 표기 — 좁은 카드에 들어가도록 만/억 단위로 줄인다 (₩48.2만 · ₩297만 · ₩1.2억). */
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
  ])
  const user = userRes.user

  const tasks = (taskData ?? []) as Pick<Task, 'status'>[]
  const openCount = tasks.filter((t) => t.status !== 'done').length

  // 각 거점은 데이터를 못 받으면 '—' 로 우아하게 폴백한다.
  const gh = githubResult.status === 'ok' ? githubResult : null
  const com = commerceResult.status === 'ok' ? commerceResult : null
  const ag = agentResult.status === 'ok' ? agentResult : null
  const mr = mailroomResult.status === 'ok' ? mailroomResult : null

  let displayName = user?.email?.split('@')[0] ?? '멤버'
  if (user) {
    const { data: memberRow } = await supabase
      .from('members')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()
    if (memberRow?.name) displayName = memberRow.name
  }

  // 배열 순서 = 페인트 순서(뒤→앞). 화면 위쪽(top% 작은) 노드를 먼저 그려야
  // 전면의 공통(hero)이 맨 위에 깔린다. 가운데 공통을 중심으로 모듈이 스포크로 붙는 구성.
  const nodes: NodeSpec[] = [
    {
      href: '/assistant',
      name: 'AI 직원',
      icon: 'assistant',
      subText: '근거 문서',
      value: typeof assistantCount === 'number' ? assistantCount.toLocaleString('ko-KR') : '—',
      position: 'left-[50%] top-[24%]',
      accent: 'violet',
    },
    {
      href: '/inbox',
      name: '우편실',
      icon: 'mailroom',
      subText: mr
        ? mr.pendingReview > 0
          ? `검토 대기 ${mr.pendingReview}건`
          : `오늘 ${mr.todayCount} · Gmail ${mr.gmailCount}`
        : 'Gmail · 자동분류',
      value: mr ? String(mr.total) : '—',
      position: 'left-[22%] top-[28%]',
      accent: 'rose',
    },
    {
      href: '/hub/naver',
      name: '네이버',
      icon: 'naver',
      subText: com ? `오늘 · 주문 ${com.orderCount}건` : '판매 · 마케팅',
      value: com ? wonCompact(com.paidRevenue) : '—',
      position: 'left-[78%] top-[28%]',
      accent: 'amber',
    },
    {
      href: '/hub/github',
      name: 'GitHub',
      icon: 'github',
      subText: gh ? `오늘 커밋 · ${gh.repoCount} repos` : '개발 · README',
      value: gh ? `${gh.commitsToday}` : '—',
      position: 'left-[12%] top-[46%]',
      accent: 'blue',
    },
    {
      href: '/hub/agent',
      name: '에이전트',
      icon: 'agent',
      subText: ag ? `운영 ${ag.activeCount} · 이번 달` : '관리 · 판매',
      value: ag ? wonCompact(ag.monthlyRevenue) : '—',
      position: 'left-[88%] top-[46%]',
      accent: 'emerald',
    },
    {
      href: '/tasks',
      name: '공통',
      icon: 'tasks',
      subText: '이번 주 할 일',
      value: String(openCount),
      position: 'left-[50%] top-[60%]',
      accent: 'indigo',
      hero: true,
    },
  ]

  return (
    <div className="flex min-h-screen flex-col bg-white">
      <header className="flex items-center justify-between border-b border-slate-200 px-8 py-4">
        <div className="flex items-center gap-2.5">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-600 text-sm font-bold text-white">
            T
          </div>
          <div>
            <p className="text-sm font-semibold text-slate-900">Totaro 워크 허브</p>
            <p className="text-[11px] text-slate-400">팀 업무 거점을 한눈에</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Link
            href="/claude-log"
            className="text-xs font-medium text-slate-500 transition-colors hover:text-blue-600"
          >
            팀 작업 기록
          </Link>
          <span className="text-xs text-slate-500">{displayName}</span>
          <form action={signOut}>
            <button
              type="submit"
              className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-700"
            >
              로그아웃
            </button>
          </form>
        </div>
      </header>

      <div
        className="relative flex-1 overflow-hidden"
        style={{
          backgroundColor: '#eef2f8',
          backgroundImage:
            'radial-gradient(60% 55% at 42% 78%, rgba(99, 102, 241, 0.07), transparent 70%), repeating-linear-gradient(30deg, #e3e8f0 0 1.3px, transparent 1.3px 70px), repeating-linear-gradient(-30deg, #e3e8f0 0 1.3px, transparent 1.3px 70px)',
        }}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <defs>
            <linearGradient id="hub-line" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#8b8ef0" />
              <stop offset="1" stopColor="#5b8af0" />
            </linearGradient>
            <filter id="hub-glow" x="-40%" y="-40%" width="180%" height="180%">
              <feGaussianBlur stdDeviation="2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>
          {/* 공통(중앙 허브) 큐브에서 4개 모듈로 뻗는 스포크 — 점선이 허브 쪽으로 흐른다. */}
          <g filter="url(#hub-glow)" opacity="0.85">
            <line
              x1="50%"
              y1="64%"
              x2="22%"
              y2="37%"
              stroke="url(#hub-line)"
              strokeWidth="2.5"
              strokeDasharray="2 8"
              strokeLinecap="round"
              className="hub-flow-line"
            />
            <line
              x1="50%"
              y1="64%"
              x2="78%"
              y2="37%"
              stroke="url(#hub-line)"
              strokeWidth="2.5"
              strokeDasharray="2 8"
              strokeLinecap="round"
              className="hub-flow-line"
            />
            <line
              x1="50%"
              y1="64%"
              x2="12%"
              y2="53%"
              stroke="url(#hub-line)"
              strokeWidth="2.5"
              strokeDasharray="2 8"
              strokeLinecap="round"
              className="hub-flow-line"
            />
            <line
              x1="50%"
              y1="64%"
              x2="88%"
              y2="53%"
              stroke="url(#hub-line)"
              strokeWidth="2.5"
              strokeDasharray="2 8"
              strokeLinecap="round"
              className="hub-flow-line"
            />
          </g>
        </svg>

        {nodes.map((node) => (
          <IsoNode key={node.href} node={node} />
        ))}

        <p className="pointer-events-none absolute bottom-5 left-6 text-[11px] text-slate-400">
          노드를 눌러 각 업무 영역으로 이동하세요
        </p>
      </div>
    </div>
  )
}
