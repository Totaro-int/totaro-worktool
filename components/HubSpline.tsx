'use client'

/**
 * HubSpline — 사용자 Spline 씬(유리 박스 6개)을 허브 모듈로 매핑한 인터랙티브 3D 허브.
 *
 * 씬: public/scene.splinecode (자체 호스팅 — 외부의존·워터마크 없음)
 * 구조: "Block 1"~"Block 6" 그룹 + 각 자식 메시. getAllObjects() 평면 리스트가
 * "Block N → 그 자식들 → Block M → …" 순서라, 로드 시 자식→블록 소속표를 만든다.
 * 클릭 = 해당 모듈 페이지 이동 · 호버 = 커서 툴팁(이름·값) · 좌하단 범례 = 9모듈 실데이터(클릭 가능).
 */
import { useCallback, useRef, useState, type JSX } from 'react'

import dynamic from 'next/dynamic'

import type { Application, SplineEvent } from '@splinetool/runtime'

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
        color: '#7e8ca0',
        fontFamily: 'var(--font-geist-mono, monospace)',
        fontSize: 12,
      }}
    >
      3D 씬 로딩 중…
    </div>
  ),
})

const CYAN = '#35e0ff'

export type SplineHubModule = {
  /** 씬의 블록 그룹 이름 — 'Block 1' ~ 'Block 6'. 없으면 범례 전용(박스 없음). */
  block?: string
  href: string
  name: string
  value: string
  sub?: string
}

export function HubSpline({
  modules,
  onNavigate,
}: {
  modules: SplineHubModule[]
  onNavigate?: (href: string) => void
}): JSX.Element {
  const uuidToBlock = useRef<Map<string, string>>(new Map())
  const [hover, setHover] = useState<SplineHubModule | null>(null)
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const byBlock = useCallback(
    (block: string | undefined): SplineHubModule | null =>
      (block && modules.find((m) => m.block === block)) || null,
    [modules]
  )

  const go = useCallback(
    (href: string): void => {
      if (onNavigate) onNavigate(href)
      else window.location.href = href
    },
    [onNavigate]
  )

  const handleLoad = useCallback((app: Application): void => {
    // 평면 리스트를 걸으며 각 오브젝트를 직전에 나온 Block N 에 귀속시킨다.
    const map = new Map<string, string>()
    let current: string | null = null
    for (const o of app.getAllObjects()) {
      if (/^Block \d$/.test(o.name)) current = o.name
      if (current) map.set(o.uuid, current)
    }
    uuidToBlock.current = map
  }, [])

  const resolve = useCallback(
    (e: SplineEvent): SplineHubModule | null => {
      const block = /^Block \d$/.test(e.target.name)
        ? e.target.name
        : uuidToBlock.current.get(e.target.id)
      return byBlock(block)
    },
    [byBlock]
  )

  const handleDown = useCallback(
    (e: SplineEvent): void => {
      const m = resolve(e)
      if (m) go(m.href)
    },
    [resolve, go]
  )

  const handleHover = useCallback(
    (e: SplineEvent): void => {
      setHover(resolve(e))
    },
    [resolve]
  )

  return (
    <div
      style={{ position: 'absolute', inset: 0, cursor: hover ? 'pointer' : 'default' }}
      onMouseMove={(ev) => {
        const r = ev.currentTarget.getBoundingClientRect()
        setMouse({ x: ev.clientX - r.left, y: ev.clientY - r.top })
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Spline
          scene="/scene.splinecode"
          onLoad={handleLoad}
          onSplineMouseDown={handleDown}
          onSplineMouseHover={handleHover}
        />
      </div>

      {/* 호버 툴팁 — 커서 따라다님 */}
      {hover ? (
        <div
          style={{
            position: 'absolute',
            left: mouse.x + 14,
            top: mouse.y + 10,
            pointerEvents: 'none',
            background: 'rgba(8,17,32,.92)',
            border: `1px solid ${CYAN}55`,
            borderRadius: 8,
            padding: '8px 12px',
            fontFamily: 'var(--font-geist-mono, monospace)',
            boxShadow: `0 0 18px ${CYAN}22`,
            zIndex: 20,
            whiteSpace: 'nowrap',
          }}
        >
          <div style={{ color: '#dbe7f4', fontSize: 12, fontWeight: 700 }}>{hover.name}</div>
          <div
            style={{ color: CYAN, fontSize: 16, fontWeight: 800, textShadow: `0 0 10px ${CYAN}` }}
          >
            {hover.value}
          </div>
          {hover.sub ? <div style={{ color: '#7e8ca0', fontSize: 10 }}>{hover.sub}</div> : null}
        </div>
      ) : null}

      {/* 좌하단 범례 — 전 모듈 실데이터, 클릭 가능(박스 없는 모듈 포함) */}
      <div
        style={{
          position: 'absolute',
          left: 16,
          bottom: 16,
          display: 'grid',
          gridTemplateColumns: 'repeat(3, minmax(120px, auto))',
          gap: 6,
          zIndex: 10,
        }}
      >
        {modules.map((m) => (
          <button
            key={m.href}
            type="button"
            onClick={() => go(m.href)}
            onMouseEnter={() => setHover(null)}
            style={{
              textAlign: 'left',
              background: 'rgba(8,17,32,.72)',
              border: '1px solid rgba(53,224,255,.16)',
              borderRadius: 8,
              padding: '6px 10px',
              fontFamily: 'var(--font-geist-mono, monospace)',
              cursor: 'pointer',
            }}
          >
            <span style={{ display: 'block', color: '#7e8ca0', fontSize: 9, letterSpacing: 1 }}>
              {m.name}
              {m.block ? '' : ' ↗'}
            </span>
            <span style={{ color: '#dbe7f4', fontSize: 13, fontWeight: 700 }}>{m.value}</span>
          </button>
        ))}
      </div>
    </div>
  )
}
