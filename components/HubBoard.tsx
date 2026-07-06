/**
 * HubBoard — 워크 허브 랜딩의 아이소메트릭 반도체 마더보드 (CHIPSET).
 *
 * 실데이터(hub/page.tsx의 nodes)를 받아 CPU(공통) + 주변 8모듈로 그린다.
 * 각 칩은 실제 클릭 링크(SVG <a href>). 데스크탑=아이소 보드, 모바일=칩 카드 그리드(엄지 탭).
 * 설계 근거: memory ui-chipset-direction (아이소 승인 + "실용 우선").
 */
import type { JSX } from 'react'

import Link from 'next/link'

// ── 아이소 투영 ──────────────────────────────────────────────────
const U = 46
const V = 23
const HU = 40
const OX = 600
const OY = 340
type P = { x: number; y: number }
function iso(gx: number, gy: number, gz = 0): P {
  return { x: OX + (gx - gy) * U, y: OY + (gx + gy) * V - gz * HU }
}
function poly(ps: P[]): string {
  return ps.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ')
}

const CYAN = '#35e0ff'
const MAG = '#ff3d9a'
const RED = '#ff5a4d'
const SIDE_L = '#122641'
const SIDE_R = '#1c3556'
const TOWER_TOP = '#2a3f5f'

type Kind = 'cpu' | 'tower' | 'towers3' | 'gauge' | 'bars' | 'slab' | 'round'

// href → 아이소 배치·모양·색 (허브 9거점 고정 레이아웃)
const LAYOUT: Record<string, { gx: number; gy: number; kind: Kind; color: string }> = {
  '/tasks': { gx: 0, gy: 0, kind: 'cpu', color: CYAN },
  '/assistant': { gx: -1.2, gy: -4.2, kind: 'tower', color: CYAN },
  '/hub/ai-team': { gx: 2.6, gy: -3.4, kind: 'towers3', color: MAG },
  '/hub/naver': { gx: 4.4, gy: -0.6, kind: 'bars', color: CYAN },
  '/hub/agent': { gx: 4.9, gy: 3.1, kind: 'gauge', color: MAG },
  '/cash': { gx: 1.6, gy: 4.2, kind: 'gauge', color: CYAN },
  '/contacts': { gx: -1.8, gy: 4.2, kind: 'round', color: CYAN },
  '/inbox': { gx: -4.4, gy: 1.8, kind: 'slab', color: MAG },
  '/hub/github': { gx: -4.4, gy: -1.4, kind: 'tower', color: CYAN },
}

export type HubNode = {
  href: string
  name: string
  value: string
  subText: string
}

function Box({
  gx,
  gy,
  w,
  d,
  h,
  top,
  left = SIDE_L,
  right = SIDE_R,
}: {
  gx: number
  gy: number
  w: number
  d: number
  h: number
  top: string
  left?: string
  right?: string
}): JSX.Element {
  const A = iso(gx - w / 2, gy - d / 2, h)
  const B = iso(gx + w / 2, gy - d / 2, h)
  const C = iso(gx + w / 2, gy + d / 2, h)
  const D = iso(gx - w / 2, gy + d / 2, h)
  const B0 = iso(gx + w / 2, gy - d / 2, 0)
  const C0 = iso(gx + w / 2, gy + d / 2, 0)
  const D0 = iso(gx - w / 2, gy + d / 2, 0)
  return (
    <g>
      <polygon points={poly([B, C, C0, B0])} fill={right} />
      <polygon points={poly([D, C, C0, D0])} fill={left} />
      <polygon points={poly([A, B, C, D])} fill={top} />
    </g>
  )
}

function ell(c: P, r: number, extra: Record<string, string | number> = {}): JSX.Element {
  return <ellipse cx={c.x} cy={c.y} rx={r * U} ry={r * V} fill="none" {...extra} />
}

function Trace({ gx, gy, color }: { gx: number; gy: number; color: string }): JSX.Element {
  const p0 = iso(0, 0)
  const p1 = iso(gx, 0)
  const p2 = iso(gx, gy)
  const d = `M ${p0.x} ${p0.y} L ${p1.x} ${p1.y} L ${p2.x} ${p2.y}`
  return (
    <g>
      <path
        d={d}
        fill="none"
        stroke={color}
        strokeWidth="4.5"
        strokeOpacity="0.22"
        filter="url(#hbGlow)"
      />
      <path d={d} fill="none" stroke={color} strokeWidth="1.4" strokeLinecap="round" />
      <circle cx={p2.x} cy={p2.y} r="3" fill={color} />
    </g>
  )
}

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

function Shape({
  gx,
  gy,
  kind,
  color,
}: {
  gx: number
  gy: number
  kind: Kind
  color: string
}): JSX.Element {
  if (kind === 'tower') {
    return (
      <g>
        <Box gx={gx} gy={gy} w={0.7} d={0.7} h={1.7} top={TOWER_TOP} />
        {ell(iso(gx, gy, 1.7), 0.42, { stroke: color, strokeWidth: 3, filter: 'url(#hbGlow)' })}
        {ell(iso(gx, gy, 1.7), 0.42, { stroke: color, strokeWidth: 1.5 })}
        <line
          x1={iso(gx - 0.35, gy + 0.35, 0.15).x}
          y1={iso(gx - 0.35, gy + 0.35, 0.15).y}
          x2={iso(gx + 0.35, gy + 0.35, 0.15).x}
          y2={iso(gx + 0.35, gy + 0.35, 0.15).y}
          stroke={RED}
          strokeWidth="2.4"
          filter="url(#hbGlow)"
        />
      </g>
    )
  }
  if (kind === 'towers3') {
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
            {ell(iso(gx + ox, gy + oy, h), 0.32, {
              stroke: color,
              strokeWidth: 2.4,
              filter: 'url(#hbGlow)',
            })}
          </g>
        ))}
      </g>
    )
  }
  if (kind === 'bars') {
    return (
      <g>
        {[0.7, 1.15, 1.6, 1.05].map((h, i) => (
          <g key={i}>
            <Box gx={gx - 0.6 + i * 0.42} gy={gy} w={0.34} d={0.34} h={h} top={TOWER_TOP} />
            {ell(iso(gx - 0.6 + i * 0.42, gy, h), 0.2, {
              stroke: color,
              strokeWidth: 2,
              filter: 'url(#hbGlow)',
            })}
          </g>
        ))}
      </g>
    )
  }
  if (kind === 'gauge') {
    const c0 = iso(gx, gy, 0.02)
    return (
      <g>
        {ell(c0, 0.95, { stroke: '#20344f', strokeWidth: 7 })}
        {ell(c0, 0.95, {
          stroke: color,
          strokeWidth: 7,
          filter: 'url(#hbGlow)',
          'stroke-dasharray': `${2 * Math.PI * 0.95 * U * 0.68} ${2 * Math.PI * 0.95 * U}`,
          'stroke-linecap': 'round',
          transform: `rotate(-30 ${c0.x} ${c0.y})`,
        })}
        {ell(c0, 0.62, { stroke: color, strokeWidth: 2, strokeOpacity: 0.5 })}
      </g>
    )
  }
  if (kind === 'slab') {
    return (
      <g>
        <Box gx={gx} gy={gy} w={1.5} d={2.4} h={0.16} top="#16304f" />
        {[-0.7, -0.2, 0.3, 0.8].map((oy, i) => (
          <line
            key={i}
            x1={iso(gx - 0.5, gy + oy, 0.17).x}
            y1={iso(gx - 0.5, gy + oy, 0.17).y}
            x2={iso(gx + 0.5, gy + oy, 0.17).x}
            y2={iso(gx + 0.5, gy + oy, 0.17).y}
            stroke={i % 2 ? MAG : CYAN}
            strokeWidth="2"
            filter="url(#hbGlow)"
            strokeOpacity="0.85"
          />
        ))}
      </g>
    )
  }
  if (kind === 'round') {
    return (
      <g>
        <Box gx={gx} gy={gy} w={1.1} d={1.1} h={0.32} top="#1a3252" />
        {ell(iso(gx, gy, 0.33), 0.34, { stroke: color, strokeWidth: 3, filter: 'url(#hbGlow)' })}
        {ell(iso(gx, gy, 0.33), 0.18, { fill: color, filter: 'url(#hbGlow)' })}
      </g>
    )
  }
  // cpu
  return (
    <g>
      <Box gx={0} gy={0} w={3} d={3} h={1.1} top="url(#hbMetal)" left="#141f30" right="#22344f" />
      {Array.from({ length: 9 }).map((_, i) => {
        const t = -1.3 + i * 0.32
        const a = iso(-1.4, t, 1.1)
        const b = iso(1.4, t, 1.1)
        return (
          <line
            key={i}
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
      {ell(iso(0, 0, 1.13), 1.0, {
        stroke: CYAN,
        strokeWidth: 8,
        filter: 'url(#hbGlow)',
        'stroke-dasharray': `${2 * Math.PI * 1.0 * U * 0.62} ${2 * Math.PI * 1.0 * U}`,
        'stroke-linecap': 'round',
        transform: `rotate(-40 ${iso(0, 0, 1.13).x} ${iso(0, 0, 1.13).y})`,
      })}
    </g>
  )
}

function Label({ node, color }: { node: HubNode; color: string }): JSX.Element {
  const l = LAYOUT[node.href]!
  const base = iso(l.gx, l.gy, 0)
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
        fill={color}
        filter="url(#hbGlowSoft)"
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

export function HubBoard({ nodes }: { nodes: HubNode[] }): JSX.Element {
  const known = nodes.filter((n) => LAYOUT[n.href])
  const cpu = known.find((n) => LAYOUT[n.href]!.kind === 'cpu')
  const mods = known.filter((n) => LAYOUT[n.href]!.kind !== 'cpu')
  const back = mods.filter((n) => LAYOUT[n.href]!.gx + LAYOUT[n.href]!.gy < 0)
  const front = mods.filter((n) => LAYOUT[n.href]!.gx + LAYOUT[n.href]!.gy >= 0)
  const dies: Array<[number, number]> = [
    [-0.6, -0.6],
    [0.6, -0.6],
    [-0.6, 0.6],
    [0.6, 0.6],
  ]
  const drawMod = (n: HubNode): JSX.Element => {
    const l = LAYOUT[n.href]!
    return (
      <a key={n.href} href={n.href} aria-label={`${n.name} ${n.value}`}>
        <Shape gx={l.gx} gy={l.gy} kind={l.kind} color={l.color} />
        <Label node={n} color={l.color} />
      </a>
    )
  }
  return (
    <>
      {/* 데스크탑: 아이소 마더보드 */}
      <div className="hidden flex-1 items-center justify-center overflow-hidden md:flex">
        <svg
          viewBox="0 60 1200 720"
          className="h-full w-full max-w-6xl"
          style={{ maxHeight: '80vh' }}
          aria-label="워크 허브 마더보드"
        >
          <defs>
            <filter id="hbGlow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="4" />
            </filter>
            <filter id="hbGlowSoft" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="2.2" result="b" />
              <feMerge>
                <feMergeNode in="b" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <linearGradient id="hbMetal" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stopColor="#f2f6fc" />
              <stop offset="0.45" stopColor="#aebcd2" />
              <stop offset="0.75" stopColor="#7d8da7" />
              <stop offset="1" stopColor="#5c6c86" />
            </linearGradient>
            <linearGradient id="hbBoard" x1="0" y1="0" x2="0.6" y2="1">
              <stop offset="0" stopColor="#153059" />
              <stop offset="1" stopColor="#0d1f3b" />
            </linearGradient>
            <radialGradient id="hbSocket" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor={CYAN} stopOpacity="0.55" />
              <stop offset="1" stopColor={CYAN} stopOpacity="0" />
            </radialGradient>
          </defs>

          <polygon
            points={poly([iso(-7, -7), iso(7, -7), iso(7, 7), iso(-7, 7)])}
            fill="url(#hbBoard)"
            stroke="rgba(53,224,255,.12)"
            strokeWidth="1"
          />

          {known.map((n) => {
            const l = LAYOUT[n.href]!
            return l.kind === 'cpu' ? null : (
              <Trace key={`t-${n.href}`} gx={l.gx} gy={l.gy} color={l.color} />
            )
          })}
          {VIAS.map(([gx, gy, mag], i) => {
            const p = iso(gx, gy)
            return (
              <circle key={i} cx={p.x} cy={p.y} r="2.2" fill={mag ? MAG : CYAN} fillOpacity="0.6" />
            )
          })}

          <ellipse
            cx={iso(0, 0, 0.05).x}
            cy={iso(0, 0, 0.05).y}
            rx={3.4 * U}
            ry={3.4 * V}
            fill="url(#hbSocket)"
          />
          {dies.map(([dx, dy], i) => (
            <Box
              key={i}
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

          {back.map(drawMod)}

          {cpu ? (
            <a href={cpu.href} aria-label={`${cpu.name} ${cpu.value}`}>
              <Shape gx={0} gy={0} kind="cpu" color={CYAN} />
              <text
                x={iso(0, 0, 1.13).x}
                y={iso(0, 0, 1.13).y + 6}
                textAnchor="middle"
                fontFamily="var(--font-geist-mono, monospace)"
                fontSize="30"
                fontWeight="800"
                fill="#0b1a33"
              >
                {cpu.value}
              </text>
              <text
                x={iso(0, 0).x}
                y={iso(1.5, 1.5, 0).y + 22}
                textAnchor="middle"
                fontFamily="var(--font-geist-mono, monospace)"
                fontSize="13"
                fontWeight="700"
                fill={CYAN}
                letterSpacing="2"
                filter="url(#hbGlowSoft)"
              >
                {cpu.name} · 할 일
              </text>
            </a>
          ) : null}

          {front.map(drawMod)}
        </svg>
      </div>

      {/* 모바일: 칩 카드 그리드 (엄지 탭) */}
      <div className="grid grid-cols-2 gap-3 p-4 md:hidden">
        {known.map((n) => {
          const l = LAYOUT[n.href]!
          const isCpu = l.kind === 'cpu'
          return (
            <Link
              key={n.href}
              href={n.href}
              className={`rounded-xl border p-4 transition-colors active:brightness-125 ${isCpu ? 'col-span-2' : ''}`}
              style={{
                borderColor: `color-mix(in srgb, ${l.color} 40%, #1c3556)`,
                background: 'linear-gradient(180deg, #10203a, #0c1830)',
                boxShadow: `0 6px 18px rgba(0,0,0,.4), 0 0 16px color-mix(in srgb, ${l.color} 12%, transparent)`,
              }}
            >
              <p className="font-mono text-[10px] tracking-wider" style={{ color: '#7e8ca0' }}>
                {n.subText}
              </p>
              <p className="mt-1 text-sm font-medium" style={{ color: '#dbe7f4' }}>
                {n.name}
              </p>
              <p
                className={`mt-1 font-mono font-bold tabular-nums ${isCpu ? 'text-3xl' : 'text-2xl'}`}
                style={{
                  color: l.color,
                  textShadow: `0 0 14px color-mix(in srgb, ${l.color} 45%, transparent)`,
                }}
              >
                {n.value}
              </p>
            </Link>
          )
        })}
      </div>
    </>
  )
}
