/**
 * /design/hub — 실제 허브를 "아이소메트릭 3D 마더보드"로 재현한 목업 (레퍼런스 분위기).
 *
 * 사용자 레퍼런스(2026-07-06): 메탈릭 CPU + 발광 시안/마젠타 회로 + 입체 칩 모듈.
 * SVG 아이소메트릭으로 그 벡터 일러 느낌을 재현(폰 PWA 가벼움). 라이브 /hub 무영향.
 * 허브 9노드 → CPU(공통) + 주변 8모듈(칩타워·게이지·바차트·폰슬랩·라운드칩).
 */
import type { JSX } from 'react'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CHIPSET · 워크 허브 (아이소) · Totaro' }

// ── 아이소메트릭 투영 ────────────────────────────────────────────
const U = 46 // 가로 반칸
const V = 23 // 세로 반칸 (2:1 iso)
const HU = 40 // z 1단 높이(px)
const OX = 600
const OY = 340

type P = { x: number; y: number }
function iso(gx: number, gy: number, gz = 0): P {
  return { x: OX + (gx - gy) * U, y: OY + (gx + gy) * V - gz * HU }
}
function poly(ps: P[]): string {
  return ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

// ── 색 ───────────────────────────────────────────────────────────
const CYAN = '#35e0ff'
const MAG = '#ff3d9a'
const RED = '#ff5a4d'
const SIDE_L = '#122641' // 좌측면(어두움)
const SIDE_R = '#1c3556' // 우측면(밝음)
const TOWER_TOP = '#2a3f5f'

// ── 입체 박스 (top/left/right 3면) ───────────────────────────────
function Box({
  gx,
  gy,
  w,
  d,
  h,
  z = 0,
  top,
  left = SIDE_L,
  right = SIDE_R,
}: {
  gx: number
  gy: number
  w: number
  d: number
  h: number
  z?: number
  top: string
  left?: string
  right?: string
}): JSX.Element {
  const A = iso(gx - w / 2, gy - d / 2, z + h)
  const B = iso(gx + w / 2, gy - d / 2, z + h)
  const C = iso(gx + w / 2, gy + d / 2, z + h)
  const D = iso(gx - w / 2, gy + d / 2, z + h)
  const B0 = iso(gx + w / 2, gy - d / 2, z)
  const C0 = iso(gx + w / 2, gy + d / 2, z)
  const D0 = iso(gx - w / 2, gy + d / 2, z)
  return (
    <g>
      <polygon points={poly([B, C, C0, B0])} fill={right} />
      <polygon points={poly([D, C, C0, D0])} fill={left} />
      <polygon points={poly([A, B, C, D])} fill={top} />
    </g>
  )
}

// ── 아이소 링/게이지 (바닥 평면 위 타원) ─────────────────────────
function isoEllipse(c: P, r: number, extra: Record<string, string | number> = {}): JSX.Element {
  return <ellipse cx={c.x} cy={c.y} rx={r * U} ry={r * V} fill="none" {...extra} />
}

// ── 회로 트레이스 (CPU → 각 모듈, 아이소 L자 라우팅) ─────────────
function trace(
  from: { gx: number; gy: number },
  to: { gx: number; gy: number },
  color: string
): JSX.Element {
  // 아이소 축 따라 gx 먼저, gy 나중 (직각 회로 느낌)
  const p0 = iso(from.gx, from.gy)
  const p1 = iso(to.gx, from.gy)
  const p2 = iso(to.gx, to.gy)
  const d = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeOpacity="0.22"
        filter="url(#glow)"
      />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={p2.x} cy={p2.y} r="3" fill={color} />
    </g>
  )
}

// ── 노드 정의 (실제 허브 그대로) ─────────────────────────────────
type Kind = 'tower' | 'towers3' | 'gauge' | 'bars' | 'slab' | 'round'
type Node = {
  name: string
  value: string
  sub: string
  color: string
  kind: Kind
  gx: number
  gy: number
}

const NODES: Node[] = [
  {
    name: 'AI 직원',
    value: '1,240',
    sub: '근거 문서',
    color: CYAN,
    kind: 'tower',
    gx: -1.2,
    gy: -4.2,
  },
  { name: 'AI부서', value: '3', sub: 'AI 직원', color: MAG, kind: 'towers3', gx: 2.6, gy: -3.4 },
  {
    name: '네이버',
    value: '₩3.2M',
    sub: '오늘 주문 6',
    color: CYAN,
    kind: 'bars',
    gx: 4.4,
    gy: -0.6,
  },
  { name: '에이전트', value: '₩1.1M', sub: '운영 2', color: MAG, kind: 'gauge', gx: 4.9, gy: 3.1 },
  {
    name: '가용 현금',
    value: '82.4M',
    sub: '기준 07-05',
    color: CYAN,
    kind: 'gauge',
    gx: 1.6,
    gy: 4.2,
  },
  {
    name: '회사 연락처',
    value: '214',
    sub: '명함·연락처',
    color: CYAN,
    kind: 'round',
    gx: -1.8,
    gy: 4.2,
  },
  {
    name: '우편실',
    value: '1,847',
    sub: '인덱싱 문서',
    color: MAG,
    kind: 'slab',
    gx: -4.4,
    gy: 1.8,
  },
  { name: 'GitHub', value: '7', sub: '오늘 커밋', color: CYAN, kind: 'tower', gx: -4.4, gy: -1.4 },
]

// 회로 밀도용 데코 — 비아 점 [gx, gy, magenta?] / 스텁 [ax,ay,bx,by, magenta?]
const VIAS: Array<[number, number, boolean]> = [
  [-5.5, -3.5, false],
  [-3, -5.5, true],
  [2, -5.5, false],
  [5.5, -3.5, true],
  [6, 0, false],
  [5.5, 3.5, false],
  [3, 5.5, true],
  [-2.5, 5.8, false],
  [-5.8, 3, true],
  [-6, -0.5, false],
  [-2.2, -2.4, false],
  [2.4, -2.2, true],
  [2.6, 2.4, false],
  [-2.4, 2.6, true],
  [4.6, -3.2, false],
  [-4, 4.4, false],
]
const STUBS: Array<[number, number, number, number, boolean]> = [
  [-6, -3, -4.6, -1.6, false],
  [6, -2.5, 4.8, -1, true],
  [-2, 6, -0.6, 4.8, false],
  [3.4, 5.6, 5, 4, true],
  [-5.6, 2, -4.4, 3.4, false],
  [5.4, 2.6, 4, 4, false],
]

// 모듈 그리기 (종류별). 반환: 본체 JSX.
function Module({ node }: { node: Node }): JSX.Element {
  const { gx, gy, color } = node
  if (node.kind === 'tower') {
    return (
      <g>
        <Box gx={gx} gy={gy} w={0.7} d={0.7} h={1.7} top={TOWER_TOP} />
        {isoEllipse(iso(gx, gy, 1.7), 0.42, {
          stroke: color,
          strokeWidth: 3,
          filter: 'url(#glow)',
        })}
        {isoEllipse(iso(gx, gy, 1.7), 0.42, { stroke: color, strokeWidth: 1.5 })}
        <line
          {...lineProps(iso(gx - 0.35, gy + 0.35, 0.15), iso(gx + 0.35, gy + 0.35, 0.15))}
          stroke={RED}
          strokeWidth="2.4"
          filter="url(#glow)"
        />
      </g>
    )
  }
  if (node.kind === 'towers3') {
    // 뒤→앞 순서로 3개 분리 배치 (겹침 방지)
    const spots: Array<[number, number, number]> = [
      [-0.7, -0.5, 1.15],
      [0.05, 0.1, 1.5],
      [0.8, 0.7, 1.9],
    ]
    return (
      <g>
        {spots.map(([ox, oy, h], i) => (
          <g key={i}>
            <Box gx={gx + ox} gy={gy + oy} w={0.55} d={0.55} h={h} top={TOWER_TOP} />
            {isoEllipse(iso(gx + ox, gy + oy, h), 0.32, {
              stroke: color,
              strokeWidth: 2.4,
              filter: 'url(#glow)',
            })}
          </g>
        ))}
      </g>
    )
  }
  if (node.kind === 'bars') {
    return (
      <g>
        {[0.7, 1.15, 1.6, 1.05].map((h, i) => (
          <g key={i}>
            <Box gx={gx - 0.6 + i * 0.42} gy={gy} w={0.34} d={0.34} h={h} top={TOWER_TOP} />
            {isoEllipse(iso(gx - 0.6 + i * 0.42, gy, h), 0.2, {
              stroke: color,
              strokeWidth: 2,
              filter: 'url(#glow)',
            })}
          </g>
        ))}
      </g>
    )
  }
  if (node.kind === 'gauge') {
    const c0 = iso(gx, gy, 0.02)
    return (
      <g>
        {isoEllipse(c0, 0.95, { stroke: '#20344f', strokeWidth: 7 })}
        {isoEllipse(c0, 0.95, {
          stroke: color,
          strokeWidth: 7,
          filter: 'url(#glow)',
          'stroke-dasharray': `${2 * Math.PI * 0.95 * U * 0.68} ${2 * Math.PI * 0.95 * U}`,
          'stroke-linecap': 'round',
          transform: `rotate(-30 ${c0.x} ${c0.y})`,
        })}
        {isoEllipse(c0, 0.62, { stroke: color, strokeWidth: 2, strokeOpacity: 0.5 })}
      </g>
    )
  }
  if (node.kind === 'slab') {
    return (
      <g>
        <Box gx={gx} gy={gy} w={1.5} d={2.4} h={0.16} top="#16304f" />
        {/* 화면 데이터 라인 */}
        {[-0.7, -0.2, 0.3, 0.8].map((oy, i) => (
          <line
            key={i}
            {...lineProps(iso(gx - 0.5, gy + oy, 0.17), iso(gx + 0.5, gy + oy, 0.17))}
            stroke={i % 2 ? MAG : CYAN}
            strokeWidth="2"
            filter="url(#glow)"
            strokeOpacity="0.85"
          />
        ))}
      </g>
    )
  }
  // round
  return (
    <g>
      <Box gx={gx} gy={gy} w={1.1} d={1.1} h={0.32} top="#1a3252" />
      {isoEllipse(iso(gx, gy, 0.33), 0.34, { stroke: color, strokeWidth: 3, filter: 'url(#glow)' })}
      {isoEllipse(iso(gx, gy, 0.33), 0.18, { fill: color, filter: 'url(#glow)' })}
    </g>
  )
}

function lineProps(a: P, b: P): { x1: number; y1: number; x2: number; y2: number } {
  return { x1: a.x, y1: a.y, x2: b.x, y2: b.y }
}

// 라벨 (모듈 위 발광 텍스트) — 각 모듈 바닥 기준 화면상 고정 오프셋으로 띄워 겹침 방지
function Label({ node }: { node: Node }): JSX.Element {
  const base = iso(node.gx, node.gy, 0)
  const y = base.y - 80
  return (
    <g>
      <text
        x={base.x}
        y={y}
        textAnchor="middle"
        fontFamily="var(--font-geist-mono, monospace)"
        fontSize="19"
        fontWeight="700"
        fill={node.color}
        filter="url(#glowSoft)"
      >
        {node.value}
      </text>
      <text
        x={base.x}
        y={y + 17}
        textAnchor="middle"
        fontFamily="var(--font-geist-mono, monospace)"
        fontSize="11"
        fill="#9fb4d0"
        letterSpacing="1"
      >
        {node.name}
      </text>
    </g>
  )
}

// 정렬: 뒤(작은 gx+gy) → 앞. CPU(0)는 중간.
const backNodes = NODES.filter((n) => n.gx + n.gy < 0).sort((a, b) => a.gx + a.gy - (b.gx + b.gy))
const frontNodes = NODES.filter((n) => n.gx + n.gy >= 0).sort((a, b) => a.gx + a.gy - (b.gx + b.gy))

export default function HubIsoPreview(): JSX.Element {
  const NAV = ['카드레터 스튜디오', '캘린더', '우리의 지표', '팀 작업 기록']
  // CPU 소켓 다이(작은 사각) 위치
  const dies: Array<[number, number]> = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ]
  return (
    <div
      className="flex min-h-screen flex-col"
      style={{
        background: 'radial-gradient(120% 90% at 50% 30%, #12294d 0%, #0b1a33 45%, #081120 100%)',
        color: '#dbe7f4',
      }}
    >
      {/* 슬림 시스템 바 */}
      <header
        className="flex flex-wrap items-center justify-between gap-2 border-b px-5 py-3 md:px-8"
        style={{ borderColor: 'rgba(53,224,255,.14)', background: 'rgba(8,17,32,.6)' }}
      >
        <div className="flex items-center gap-2.5">
          <div
            className="flex h-8 w-8 items-center justify-center rounded-md font-mono text-sm font-bold"
            style={{
              color: '#06222b',
              background: `linear-gradient(180deg, ${CYAN}, #189ec2)`,
              boxShadow: `0 0 16px ${CYAN}66`,
            }}
          >
            T
          </div>
          <p className="font-mono text-sm font-bold tracking-tight">
            TOTARO<span style={{ color: CYAN }}>·</span>WORKHUB
          </p>
        </div>
        <div className="flex items-center gap-4 font-mono text-[11px]">
          {NAV.map((n, i) => (
            <span key={n} style={{ color: i === 0 ? CYAN : '#7e8ca0' }}>
              {n}
            </span>
          ))}
          <span style={{ color: '#4a5568' }}>윤태준</span>
        </div>
      </header>

      {/* 리드아웃 티커 */}
      <div
        className="flex items-center gap-3 border-b px-5 py-2 font-mono text-[11px] md:px-8"
        style={{ borderColor: 'rgba(53,224,255,.1)' }}
      >
        <span
          className="inline-block h-2 w-2 rounded-full"
          style={{ background: '#3ddc97', boxShadow: '0 0 8px #3ddc97' }}
        />
        <span style={{ color: '#3ddc97', letterSpacing: 2 }}>SYSTEM ONLINE</span>
        <span style={{ color: '#7e8ca0' }}>
          김사현 데일리 08:00 · 이번 주 할 일 12 · 가용 현금 82.4M₩ · 오늘 커밋 7
        </span>
      </div>

      {/* ── 아이소메트릭 마더보드 ── */}
      <div className="flex flex-1 items-center justify-center overflow-hidden">
        <svg
          viewBox="0 60 1200 720"
          className="h-full w-full max-w-6xl"
          style={{ maxHeight: '78vh' }}
          aria-label="워크 허브 마더보드"
        >
          <defs>
            <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="glowSoft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="metalTop" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2f6fc" />
              <stop offset="0.45" stopColor="#aebcd2" />
              <stop offset="0.75" stopColor="#7d8da7" />
              <stop offset="1" stopColor="#5c6c86" />
            </linearGradient>
            <linearGradient id="boardTop" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0" stopColor="#153059" />
              <stop offset="1" stopColor="#0d1f3b" />
            </linearGradient>
            <radialGradient id="socket" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={CYAN} stopOpacity="0.55" />
              <stop offset="1" stopColor={CYAN} stopOpacity="0" />
            </radialGradient>
          </defs>

          {/* 기판 베이스 (아이소 평면) */}
          <polygon
            points={poly([iso(-7, -7), iso(7, -7), iso(7, 7), iso(-7, 7)])}
            fill="url(#boardTop)"
            stroke="rgba(53,224,255,.12)"
            strokeWidth="1"
          />

          {/* 회로 트레이스 (CPU → 각 모듈) */}
          {NODES.map((n) => (
            <g key={`t-${n.name}`}>{trace({ gx: 0, gy: 0 }, { gx: n.gx, gy: n.gy }, n.color)}</g>
          ))}
          {/* 데코 회로 필러 */}
          {[
            [-6, -2, -6, 3],
            [6, -3, 6, 2],
            [-3, 6, 3, 6],
            [-2, -6, 3, -6],
          ].map(([ax, ay, bx, by], i) => {
            const a = iso(ax, ay)
            const b = iso(bx, by)
            return (
              <path
                key={`f-${i}`}
                d={`M ${a.x} ${a.y} L ${b.x} ${b.y}`}
                stroke={i % 2 ? MAG : CYAN}
                strokeWidth="1"
                strokeOpacity="0.35"
              />
            )
          })}

          {/* 회로 밀도 — 비아(단자) 점 + 짧은 스텁 (레퍼런스 느낌) */}
          {VIAS.map(([gx, gy, mag], i) => {
            const p = iso(gx, gy)
            return (
              <circle
                key={`v-${i}`}
                cx={p.x}
                cy={p.y}
                r="2.2"
                fill={mag ? MAG : CYAN}
                fillOpacity="0.6"
              />
            )
          })}
          {STUBS.map(([ax, ay, bx, by, mag], i) => {
            const a = iso(ax, ay)
            const b = iso(bx, ay)
            const c = iso(bx, by)
            return (
              <path
                key={`s-${i}`}
                d={`M ${a.x} ${a.y} L ${b.x} ${b.y} L ${c.x} ${c.y}`}
                fill="none"
                stroke={mag ? MAG : CYAN}
                strokeWidth="1"
                strokeOpacity="0.3"
              />
            )
          })}

          {/* CPU 소켓 글로우 + 다이 */}
          <ellipse
            cx={iso(0, 0, 0.05).x}
            cy={iso(0, 0, 0.05).y}
            rx={3.4 * U}
            ry={3.4 * V}
            fill="url(#socket)"
          />
          {dies.map(([dx, dy], i) => (
            <Box
              key={`die-${i}`}
              gx={dx}
              gy={dy}
              w={0.5}
              d={0.5}
              h={0.2}
              top={CYAN}
              left="#1a6f8c"
              right="#25a3c9"
            />
          ))}

          {/* 뒤쪽 모듈 + 라벨 */}
          {backNodes.map((n) => (
            <g key={`b-${n.name}`}>
              <Module node={n} />
              <Label node={n} />
            </g>
          ))}

          {/* 중앙 CPU (메탈릭) */}
          <g>
            <Box
              gx={0}
              gy={0}
              w={3}
              d={3}
              h={1.1}
              top="url(#metalTop)"
              left="#141f30"
              right="#22344f"
            />
            {/* 브러시드 라인 (top 면 위 아이소 gx축 라인) */}
            {Array.from({ length: 9 }).map((_, i) => {
              const t = -1.3 + i * 0.32
              const a = iso(-1.4, t, 1.1)
              const b = iso(1.4, t, 1.1)
              return (
                <line
                  key={`br-${i}`}
                  x1={a.x}
                  y1={a.y}
                  x2={b.x}
                  y2={b.y}
                  stroke="#ffffff"
                  strokeOpacity="0.12"
                  strokeWidth="1"
                />
              )
            })}
            {/* 발광 시안 아크 (top 위) */}
            {isoEllipse(iso(0, 0, 1.13), 1.0, {
              stroke: CYAN,
              strokeWidth: 8,
              filter: 'url(#glow)',
              'stroke-dasharray': `${2 * Math.PI * 1.0 * U * 0.62} ${2 * Math.PI * 1.0 * U}`,
              'stroke-linecap': 'round',
              transform: `rotate(-40 ${iso(0, 0, 1.13).x} ${iso(0, 0, 1.13).y})`,
            })}
            {/* CPU 값 — 실버 메탈 위라 진한 네이비로(대비) */}
            <text
              x={iso(0, 0, 1.13).x}
              y={iso(0, 0, 1.13).y + 6}
              textAnchor="middle"
              fontFamily="var(--font-geist-mono, monospace)"
              fontSize="30"
              fontWeight="800"
              fill="#0b1a33"
            >
              12
            </text>
          </g>
          {/* CPU 캡션 — 칩 앞쪽 다크 기판 위 */}
          <text
            x={iso(0, 0).x}
            y={iso(1.5, 1.5, 0).y + 22}
            textAnchor="middle"
            fontFamily="var(--font-geist-mono, monospace)"
            fontSize="13"
            fontWeight="700"
            fill={CYAN}
            letterSpacing="2"
            filter="url(#glowSoft)"
          >
            공통 · 할 일
          </text>

          {/* 앞쪽 모듈 + 라벨 */}
          {frontNodes.map((n) => (
            <g key={`fr-${n.name}`}>
              <Module node={n} />
              <Label node={n} />
            </g>
          ))}

          {/* 코너 마킹 */}
          <text
            x="40"
            y="90"
            fontFamily="var(--font-geist-mono, monospace)"
            fontSize="12"
            fill="#5a6c86"
            letterSpacing="2"
          >
            TOTARO-WORKHUB · REV.2 · ISO
          </text>
          <text
            x="1160"
            y="770"
            textAnchor="end"
            fontFamily="var(--font-geist-mono, monospace)"
            fontSize="12"
            fill={CYAN}
            letterSpacing="1"
          >
            A0 PREVIEW · 실동작·인터랙션은 적용 단계
          </text>
        </svg>
      </div>
    </div>
  )
}
