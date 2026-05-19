import Link from 'next/link'

import { signOut } from '@/app/auth/actions'
import { createClient } from '@/lib/supabase/server'
import type { Task } from '@/lib/types'

type IconName = 'tasks' | 'github' | 'naver' | 'agent'

type NodeSpec = {
  href: string
  name: string
  icon: IconName
  subText: string
  value: string
  position: string
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
  return (
    <svg {...props}>
      <rect x="3.5" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="3.5" width="7.5" height="7.5" rx="2" />
      <rect x="3.5" y="13" width="7.5" height="7.5" rx="2" />
      <rect x="13" y="13" width="7.5" height="7.5" rx="2" />
    </svg>
  )
}

/** 3면(윗면·좌측면·우측면) clip-path 폴리곤으로 아이소메트릭 큐브를 그린다. */
function IsoCube({
  w,
  h,
  topColor,
  leftColor,
  rightColor,
  icon,
  hero,
}: {
  w: number
  h: number
  topColor: string
  leftColor: string
  rightColor: string
  icon: IconName
  hero?: boolean
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
        filter: 'drop-shadow(0 22px 17px rgba(15, 23, 42, 0.23))',
      }}
    >
      <div className="absolute inset-0" style={{ clipPath: rightPoly, background: rightColor }} />
      <div className="absolute inset-0" style={{ clipPath: leftPoly, background: leftColor }} />
      <div className="absolute inset-0" style={{ clipPath: topPoly, background: topColor }} />
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
            background: hero ? 'rgba(255, 255, 255, 0.6)' : 'rgba(37, 99, 235, 0.1)',
          }}
          aria-hidden="true"
        />
        <span className="relative">
          <NodeIcon name={icon} size={w * 0.5} color={hero ? '#1e3a8a' : '#2563eb'} />
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
}: {
  name: string
  subText: string
  value: string
  hero?: boolean
}): React.JSX.Element {
  return (
    <div className={`relative ${hero ? 'w-48' : 'w-40'}`}>
      <div className="overflow-hidden rounded-xl bg-white shadow-lg ring-1 ring-slate-200">
        <div className="bg-blue-600 py-1.5 text-center text-xs font-bold tracking-wide text-white">
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
        />
        <div className="relative mt-6 transition-transform duration-200 group-hover:-translate-y-2.5">
          {node.hero && (
            <div
              className="pointer-events-none absolute top-1/2 left-1/2 -z-10 -translate-x-1/2 -translate-y-1/2"
              style={{
                width: '540px',
                height: '460px',
                background:
                  'radial-gradient(circle, rgba(37, 99, 235, 0.26), rgba(37, 99, 235, 0) 68%)',
              }}
              aria-hidden="true"
            />
          )}
          <IsoCube
            w={w}
            h={h}
            topColor={node.hero ? '#dce8ff' : '#ffffff'}
            leftColor={node.hero ? '#6f95d8' : '#ccd6e4'}
            rightColor={node.hero ? '#41639f' : '#b1bed2'}
            icon={node.icon}
            hero={node.hero}
          />
        </div>
      </div>
    </Link>
  )
}

export default async function HubPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { data: taskData } = await supabase.from('tasks').select('status')
  const tasks = (taskData ?? []) as Pick<Task, 'status'>[]
  const openCount = tasks.filter((t) => t.status !== 'done').length

  let displayName = user?.email?.split('@')[0] ?? '멤버'
  if (user) {
    const { data: memberRow } = await supabase
      .from('members')
      .select('name')
      .eq('id', user.id)
      .maybeSingle()
    if (memberRow?.name) displayName = memberRow.name
  }

  const nodes: NodeSpec[] = [
    {
      href: '/hub/github',
      name: 'GitHub',
      icon: 'github',
      subText: '개발 · README',
      value: '—',
      position: 'left-[14%] top-[40%]',
    },
    {
      href: '/tasks',
      name: '공통',
      icon: 'tasks',
      subText: '이번 주 할 일',
      value: String(openCount),
      position: 'left-[39%] top-[61%]',
      hero: true,
    },
    {
      href: '/hub/naver',
      name: '네이버',
      icon: 'naver',
      subText: '판매 · 마케팅',
      value: '—',
      position: 'left-[63%] top-[38%]',
    },
    {
      href: '/hub/agent',
      name: '에이전트',
      icon: 'agent',
      subText: '관리 · 판매',
      value: '—',
      position: 'left-[88%] top-[59%]',
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
          backgroundColor: '#f1f4f9',
          backgroundImage:
            'repeating-linear-gradient(30deg, #e4e8f0 0 1.3px, transparent 1.3px 70px), repeating-linear-gradient(-30deg, #e4e8f0 0 1.3px, transparent 1.3px 70px)',
        }}
      >
        <svg className="absolute inset-0 h-full w-full" aria-hidden="true">
          <line
            x1="14%"
            y1="47%"
            x2="39%"
            y2="68%"
            stroke="#aeb9cd"
            strokeWidth="2.5"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
          <line
            x1="39%"
            y1="68%"
            x2="63%"
            y2="45%"
            stroke="#aeb9cd"
            strokeWidth="2.5"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
          <line
            x1="63%"
            y1="45%"
            x2="88%"
            y2="66%"
            stroke="#aeb9cd"
            strokeWidth="2.5"
            strokeDasharray="1 9"
            strokeLinecap="round"
          />
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
