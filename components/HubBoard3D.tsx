'use client'

/**
 * HubBoard3D — 인터랙티브 3D 마더보드 래퍼. 실제 Canvas 는 ssr:false 로 동적 임포트.
 * (WebGL 은 서버 렌더 불가라 next/dynamic ssr:false 로 감싼다.)
 * 설계 근거: memory ui-chipset-direction (아이소 CHIPSET) + Spline식 인터랙티브 3D.
 */
import type { JSX } from 'react'

import dynamic from 'next/dynamic'

export type Hub3DNode = {
  href: string
  name: string
  value: string
  kind: 'cpu' | 'tower' | 'towers3' | 'gauge' | 'bars' | 'slab' | 'round'
  color: string
  x: number
  z: number
}

const Canvas3D = dynamic(() => import('./HubBoard3DCanvas'), {
  ssr: false,
  loading: () => <div style={{ height: '100%', width: '100%', background: '#081120' }} />,
})

export function HubBoard3D({
  nodes,
  onSelect,
}: {
  nodes: Hub3DNode[]
  onSelect?: (href: string) => void
}): JSX.Element {
  const handle = (href: string): void => {
    if (onSelect) onSelect(href)
    else window.location.href = href
  }
  return <Canvas3D nodes={nodes} onSelect={handle} />
}
