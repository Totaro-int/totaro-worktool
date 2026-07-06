'use client'

/**
 * /design/hub-3d — 인터랙티브 3D 허브(R3F) 프로토타입 (공개, 목업 데이터).
 * 마우스로 회전·줌, 칩 호버 발광, 둥둥, 클릭 → (프로토타입은 alert). 실허브 연결 전 느낌 확인용.
 */
import type { JSX } from 'react'

import { HubBoard3D, type Hub3DNode } from '@/components/HubBoard3D'

const CYAN = '#35e0ff'
const MAG = '#ff3d9a'

const NODES: Hub3DNode[] = [
  { href: '/tasks', name: '공통', value: '109', kind: 'cpu', color: CYAN, x: 0, z: 0 },
  {
    href: '/assistant',
    name: 'AI 직원',
    value: '1,240',
    kind: 'tower',
    color: CYAN,
    x: -1.2,
    z: -4.2,
  },
  {
    href: '/hub/ai-team',
    name: 'AI부서',
    value: '3',
    kind: 'towers3',
    color: MAG,
    x: 2.6,
    z: -3.4,
  },
  {
    href: '/hub/naver',
    name: '네이버',
    value: '₩466만',
    kind: 'bars',
    color: CYAN,
    x: 4.4,
    z: -0.6,
  },
  {
    href: '/hub/agent',
    name: '에이전트',
    value: '₩1,597만',
    kind: 'gauge',
    color: MAG,
    x: 4.9,
    z: 3.1,
  },
  { href: '/cash', name: '가용 현금', value: '₩466만', kind: 'gauge', color: CYAN, x: 1.6, z: 4.2 },
  {
    href: '/contacts',
    name: '회사 연락처',
    value: '214',
    kind: 'round',
    color: CYAN,
    x: -1.8,
    z: 4.2,
  },
  { href: '/inbox', name: '우편실', value: '726', kind: 'slab', color: MAG, x: -4.4, z: 1.8 },
  { href: '/hub/github', name: 'GitHub', value: '5', kind: 'tower', color: CYAN, x: -4.4, z: -1.4 },
]

export default function Hub3DPreview(): JSX.Element {
  return (
    <div
      className="relative h-screen w-full overflow-hidden"
      style={{
        background: 'radial-gradient(120% 90% at 50% 30%, #12294d, #0b1a33 45%, #060d1a 100%)',
      }}
    >
      <div className="pointer-events-none absolute top-4 left-5 z-10">
        <p className="font-mono text-sm font-bold" style={{ color: '#dbe7f4' }}>
          TOTARO<span style={{ color: CYAN }}>·</span>WORKHUB{' '}
          <span style={{ color: CYAN }}>3D</span>
        </p>
        <p className="font-mono text-[11px]" style={{ color: '#7e8ca0' }}>
          드래그로 회전 · 스크롤 줌 · 칩 호버/클릭 · (프로토타입)
        </p>
      </div>
      <HubBoard3D nodes={NODES} onSelect={(href) => window.alert(`이동: ${href}`)} />
    </div>
  )
}
