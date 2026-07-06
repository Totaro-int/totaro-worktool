/**
 * /design/hub — 실제 허브를 CHIPSET(반도체 모듈) 스타일로 통째 재현한 목업.
 *
 * 목적: 스와치가 아니라 "진짜 내 허브가 이렇게 바뀐다"를 판단하기 위한 화면.
 * 라이브 /hub 는 안 건드린다. 비인증·목업 데이터라 안전(승인 게이트 안).
 * 실제 허브의 hub-and-spoke(중앙 공통 노드 + 8모듈) → 마더보드(CPU + 주변칩 + 회로).
 * 3D 입체 버전은 A2(R3F). 여기선 2.5D CSS 로 방향을 먼저 보여준다.
 */
import type { JSX } from 'react'

import { ChipsetTheme, MonoLabel } from '@/components/chipset'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CHIPSET · 워크 허브 미리보기 · Totaro' }

type Node = {
  ref: string // 실크스크린 부품 번호
  tag: string // 짧은 영문 태그
  name: string // 한글 이름(실제 허브 그대로)
  sub: string
  value: string
  color: string
  x: number // 보드 좌표 0..100
  y: number
  live?: boolean // LED pulse
}

const CYAN = '#2fe0ff'
const VIOLET = '#a78bfa'
const AMBER = '#ffb454'
const EMERALD = '#3ddc97'
const ROSE = '#ff6b81'

// 중앙 CPU = 공통/이번 주 할 일 (실제 허브의 hero 노드)
const CPU: Node = {
  ref: 'U0',
  tag: 'TASK-CORE',
  name: '공통',
  sub: '이번 주 할 일',
  value: '12',
  color: CYAN,
  x: 50,
  y: 50,
  live: true,
}

// 주변 8개 모듈 (실제 허브 노드 그대로)
const NODES: Node[] = [
  {
    ref: 'U1',
    tag: 'DOCS',
    name: 'AI 직원',
    sub: '근거 문서',
    value: '1,240',
    color: VIOLET,
    x: 50,
    y: 14,
  },
  {
    ref: 'U2',
    tag: 'MAIL',
    name: '우편실',
    sub: '인덱싱 문서',
    value: '1,847',
    color: ROSE,
    x: 18,
    y: 27,
    live: true,
  },
  {
    ref: 'U3',
    tag: 'SALE',
    name: '네이버',
    sub: '오늘 · 주문 6건',
    value: '₩3.2M',
    color: AMBER,
    x: 82,
    y: 27,
  },
  {
    ref: 'U4',
    tag: 'REPO',
    name: 'GitHub',
    sub: '오늘 커밋 · 4 repos',
    value: '7',
    color: CYAN,
    x: 11,
    y: 52,
  },
  {
    ref: 'U5',
    tag: 'AGENT',
    name: '에이전트',
    sub: '운영 2 · 이번 달',
    value: '₩1.1M',
    color: EMERALD,
    x: 89,
    y: 52,
  },
  {
    ref: 'U6',
    tag: 'AI-DEPT',
    name: 'AI부서',
    sub: 'AI 직원',
    value: '3',
    color: VIOLET,
    x: 24,
    y: 80,
    live: true,
  },
  {
    ref: 'U7',
    tag: 'CRM',
    name: '회사 연락처',
    sub: '명함 OCR · 연락처',
    value: '214',
    color: EMERALD,
    x: 50,
    y: 90,
  },
  {
    ref: 'U8',
    tag: 'CASH',
    name: '가용 현금',
    sub: '기준 07-05',
    value: '82.4M',
    color: AMBER,
    x: 76,
    y: 80,
  },
]

const NAV = ['카드레터 스튜디오', '캘린더', '우리의 지표', '팀 작업 기록']

/** 마더보드 칩 하나 — 주변 모듈(작음) / CPU(큼) 공용. */
function Chip({ node, cpu = false }: { node: Node; cpu?: boolean }): JSX.Element {
  const c = node.color
  return (
    <div
      className="chip-panel chip-panel--notch chip-panel--tilt absolute -translate-x-1/2 -translate-y-1/2"
      style={{
        left: `${node.x}%`,
        top: `${node.y}%`,
        width: cpu ? 208 : 150,
        borderColor: `color-mix(in srgb, ${c} 45%, var(--chip-line))`,
        boxShadow: `inset 0 1px 0 rgba(255,255,255,.05), 0 8px 24px rgba(0,0,0,.5), 0 0 ${cpu ? 34 : 18}px color-mix(in srgb, ${c} ${cpu ? 22 : 14}%, transparent)`,
        zIndex: 20,
      }}
    >
      {/* 실크스크린 헤더: 부품번호 + LED */}
      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ borderColor: 'var(--chip-line)' }}
      >
        <span
          className={`chip-led inline-block h-2 w-2 flex-none rounded-full ${node.live ? 'chip-led--pulse' : ''}`}
          style={{ color: c, background: c }}
        />
        <span
          className="font-mono text-[9px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--chip-faint)' }}
        >
          {node.ref} · {node.tag}
        </span>
        <div className="chip-pins ml-auto w-8" aria-hidden="true" />
      </div>
      {/* 본문 */}
      <div className={cpu ? 'p-4' : 'px-3 py-2.5'}>
        <p
          className={`font-medium ${cpu ? 'text-base' : 'text-sm'}`}
          style={{ color: 'var(--chip-text)' }}
        >
          {node.name}
        </p>
        <div className="mt-1 flex items-baseline gap-1.5">
          <span
            className={`font-mono font-bold tabular-nums ${cpu ? 'text-4xl' : 'text-2xl'}`}
            style={{ color: c, textShadow: `0 0 18px color-mix(in srgb, ${c} 50%, transparent)` }}
          >
            {node.value}
          </span>
        </div>
        <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--chip-dim)' }}>
          {node.sub}
        </p>
        {cpu ? (
          <div className="mt-3 flex items-center gap-2">
            <span
              className="chip-led h-1.5 w-1.5 rounded-full"
              style={{ color: CYAN, background: CYAN }}
            />
            <MonoLabel tone="accent">CENTRAL · WORK CORE</MonoLabel>
          </div>
        ) : null}
      </div>
    </div>
  )
}

export default function HubPreviewPage(): JSX.Element {
  return (
    <ChipsetTheme className="chip-scanlines flex min-h-screen flex-col">
      {/* 시스템 바 (실제 허브 헤더 미러) */}
      <header
        className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1 border-b px-4 py-3 md:px-8"
        style={{ borderColor: 'var(--chip-line)', background: 'var(--chip-bg-deep)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-9 w-9 items-center justify-center rounded-md font-mono text-sm font-bold"
            style={{
              color: '#06222b',
              background: `linear-gradient(180deg, ${CYAN}, color-mix(in srgb, ${CYAN} 70%, #000))`,
              boxShadow: `0 0 16px color-mix(in srgb, ${CYAN} 40%, transparent)`,
            }}
          >
            T
          </div>
          <div>
            <p
              className="font-mono text-sm font-bold tracking-tight"
              style={{ color: 'var(--chip-text)' }}
            >
              TOTARO<span style={{ color: CYAN }}>·</span>WORKHUB
            </p>
            <MonoLabel>팀 업무 거점을 한눈에</MonoLabel>
          </div>
        </div>
        <div className="flex items-center gap-4">
          {NAV.map((n, i) => (
            <span
              key={n}
              className="font-mono text-[11px] tracking-wide transition-colors"
              style={{ color: i === 0 ? CYAN : 'var(--chip-dim)' }}
            >
              {n}
            </span>
          ))}
          <span className="font-mono text-[11px]" style={{ color: 'var(--chip-faint)' }}>
            윤태준
          </span>
          <span
            className="rounded-md border px-3 py-1.5 font-mono text-[11px]"
            style={{ borderColor: 'var(--chip-line)', color: 'var(--chip-dim)' }}
          >
            로그아웃
          </span>
        </div>
      </header>

      {/* 리드아웃 티커 (미션 배너 미러) */}
      <div
        className="flex items-center gap-3 overflow-hidden border-b px-4 py-2 md:px-8"
        style={{ borderColor: 'var(--chip-line)', background: 'rgba(47,224,255,.03)' }}
      >
        <span
          className="chip-led chip-led--pulse h-2 w-2 flex-none rounded-full"
          style={{ color: EMERALD, background: EMERALD }}
        />
        <MonoLabel tone="ok">SYSTEM ONLINE</MonoLabel>
        <span className="font-mono text-[11px]" style={{ color: 'var(--chip-dim)' }}>
          김사현 데일리 08:00 KST · 이번 주 할 일 12건 · 가용 현금 82.4M₩ · 오늘 커밋 7
        </span>
      </div>

      {/* ── 데스크탑: 마더보드 ── */}
      <div className="relative hidden flex-1 md:block" style={{ minHeight: 620 }}>
        {/* 회로 트레이스 (CPU → 각 모듈) */}
        <svg
          className="absolute inset-0 h-full w-full"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          {NODES.map((n) => (
            <g key={n.ref}>
              <line
                x1={CPU.x}
                y1={CPU.y}
                x2={n.x}
                y2={n.y}
                stroke={n.color}
                strokeOpacity="0.32"
                strokeWidth="1.1"
                vectorEffect="non-scaling-stroke"
                className="chip-trace"
              />
              <circle cx={n.x} cy={n.y} r="0.5" fill={n.color} vectorEffect="non-scaling-stroke" />
            </g>
          ))}
          <circle cx={CPU.x} cy={CPU.y} r="0.8" fill={CYAN} vectorEffect="non-scaling-stroke" />
        </svg>

        {/* 보드 실크스크린 코너 마킹 */}
        <div className="pointer-events-none absolute top-3 left-4">
          <MonoLabel>TOTARO-WORKHUB · REV.2 · CHIPSET</MonoLabel>
        </div>
        <div className="pointer-events-none absolute right-4 bottom-3">
          <MonoLabel tone="accent">A0 PREVIEW · 실제 데이터·3D 는 적용 단계에서</MonoLabel>
        </div>

        {/* 칩들 */}
        {NODES.map((n) => (
          <Chip key={n.ref} node={n} />
        ))}
        <Chip node={CPU} cpu />
      </div>

      {/* ── 모바일: 칩 카드 그리드 (실제 허브 모바일 폴백 미러) ── */}
      <div className="grid grid-cols-2 gap-3 p-4 md:hidden">
        <div className="col-span-2">
          <Chip2 node={CPU} cpu />
        </div>
        {NODES.map((n) => (
          <Chip2 key={n.ref} node={n} />
        ))}
      </div>
    </ChipsetTheme>
  )
}

/** 모바일용 정적 칩 카드 (절대배치 대신 흐름). */
function Chip2({ node, cpu = false }: { node: Node; cpu?: boolean }): JSX.Element {
  const c = node.color
  return (
    <div
      className="chip-panel chip-panel--notch"
      style={{
        borderColor: `color-mix(in srgb, ${c} 40%, var(--chip-line))`,
        boxShadow: `0 6px 18px rgba(0,0,0,.4), 0 0 16px color-mix(in srgb, ${c} 12%, transparent)`,
      }}
    >
      <div
        className="flex items-center gap-2 border-b px-3 py-1.5"
        style={{ borderColor: 'var(--chip-line)' }}
      >
        <span
          className={`chip-led h-2 w-2 rounded-full ${node.live ? 'chip-led--pulse' : ''}`}
          style={{ color: c, background: c }}
        />
        <span
          className="font-mono text-[9px] tracking-[0.18em] uppercase"
          style={{ color: 'var(--chip-faint)' }}
        >
          {node.ref} · {node.tag}
        </span>
      </div>
      <div className="px-3 py-2.5">
        <p
          className={`font-medium ${cpu ? 'text-base' : 'text-sm'}`}
          style={{ color: 'var(--chip-text)' }}
        >
          {node.name}
        </p>
        <span
          className={`font-mono font-bold tabular-nums ${cpu ? 'text-3xl' : 'text-2xl'}`}
          style={{ color: c, textShadow: `0 0 16px color-mix(in srgb, ${c} 50%, transparent)` }}
        >
          {node.value}
        </span>
        <p className="mt-0.5 font-mono text-[10px]" style={{ color: 'var(--chip-dim)' }}>
          {node.sub}
        </p>
      </div>
    </div>
  )
}
