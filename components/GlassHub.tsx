'use client'

/**
 * GlassHub — 유리박스 모듈 허브 래퍼. 실제 Canvas 는 ssr:false 동적 임포트.
 * 박스 = 모듈(9개 전부, 코드 복제라 개수 제약 없음). 클릭 시 그 박스만 발광·상승 후 이동.
 */
import type { JSX } from 'react'

import dynamic from 'next/dynamic'

export type GlassHubModule = {
  href: string
  name: string
  value: string
  sub?: string
  /** 상판 임보싱 아이콘 종류 */
  icon: string
  /** 바닥 좌표 (그리드 배치) */
  x: number
  z: number
}

const Canvas3D = dynamic(() => import('./GlassHubCanvas'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        color: '#7e8ca0',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 12,
      }}
    >
      3D 로딩 중…
    </div>
  ),
})

export function GlassHub({
  modules,
  onNavigate,
}: {
  modules: GlassHubModule[]
  onNavigate?: (href: string) => void
}): JSX.Element {
  const handle = (href: string): void => {
    if (onNavigate) onNavigate(href)
    else window.location.href = href
  }
  return (
    <div style={{ position: 'absolute', inset: 0 }}>
      <Canvas3D modules={modules} onSelect={handle} />
    </div>
  )
}
