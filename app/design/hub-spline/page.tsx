'use client'

/**
 * /design/hub-spline — 사용자의 Spline 씬(scene.splinecode)을 react-spline 으로 로드.
 * 자체 호스팅(public/scene.splinecode) → 외부의존·워터마크 없음. 유리 재질 그대로 확인용.
 * 다음 단계: 6박스에 라벨·클릭·실데이터 매핑.
 */
import type { JSX } from 'react'

import dynamic from 'next/dynamic'

const Spline = dynamic(() => import('@splinetool/react-spline'), {
  ssr: false,
  loading: () => (
    <div
      style={{
        position: 'absolute',
        inset: 0,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#0a0a0a',
        color: '#7e8ca0',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 12,
      }}
    >
      로딩 중… (3D 씬)
    </div>
  ),
})

export default function HubSplinePreview(): JSX.Element {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a' }}>
      <div style={{ position: 'absolute', inset: 0 }}>
        <Spline scene="/scene.splinecode" />
      </div>
      <div
        style={{
          position: 'absolute',
          top: 16,
          left: 20,
          pointerEvents: 'none',
          fontFamily: 'var(--font-geist-mono, monospace)',
        }}
      >
        <p style={{ color: '#dbe7f4', fontWeight: 700, fontSize: 14 }}>
          TOTARO<span style={{ color: '#35e0ff' }}>·</span>WORKHUB{' '}
          <span style={{ color: '#35e0ff' }}>SPLINE</span>
        </p>
        <p style={{ color: '#7e8ca0', fontSize: 11 }}>
          네 Spline 씬 자체 호스팅 — 유리 룩 확인용 (라벨·클릭은 다음 단계)
        </p>
      </div>
    </div>
  )
}
