'use client'

/**
 * HubSpline — 사용자 Spline 씬(유리 박스 6개)을 허브 모듈로 매핑한 인터랙티브 3D 허브.
 *
 * 씬: public/scene.splinecode (자체 호스팅 — 외부의존·워터마크 없음)
 * ⚠️ 이 씬은 에디터에 마우스 이벤트가 없어서 Spline 런타임 이벤트가 발화하지 않는다(실측).
 *   → 카메라가 고정 오르소이고 리사이즈 시 씬이 캔버스에 비례 축소됨을 실측으로 확인,
 *     각 박스의 위치를 "캔버스 비율 좌표" 핫스팟으로 얹는다 (두 캔버스 크기에서 교차 검증됨).
 * onLoad 에서 template 영어 문구(TEXT, text 1~6)는 숨긴다.
 * 클릭 = 모듈 페이지 이동 · 호버 = 커서 툴팁(이름·값) · 좌하단 범례 = 전체 모듈 실데이터.
 */
import { useCallback, useState, type JSX } from 'react'

import dynamic from 'next/dynamic'

import type { Application } from '@splinetool/runtime'

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

/** 씬 내 각 블록의 화면 비율 좌표 (fx, fy) — 캔버스 크기 무관(비례 축소 실측 검증). */
const BLOCK_POS: Record<string, [number, number]> = {
  'Block 1': [0.12, 0.44], // 좌측 코일
  'Block 2': [0.375, 0.31], // 상단 실드
  'Block 3': [0.46, 0.47], // 중앙 핸드
  'Block 4': [0.411, 0.657], // 하단 아톰
  'Block 5': [0.738, 0.5], // 우측 벨
  'Block 6': [0.716, 0.72], // 우하단 플래그
}

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
  const [hover, setHover] = useState<SplineHubModule | null>(null)
  const [mouse, setMouse] = useState<{ x: number; y: number }>({ x: 0, y: 0 })

  const go = useCallback(
    (href: string): void => {
      if (onNavigate) onNavigate(href)
      else window.location.href = href
    },
    [onNavigate]
  )

  // template 의 영어 마케팅 문구 숨김 (우리 라벨은 툴팁·범례가 담당)
  const handleLoad = useCallback((app: Application): void => {
    for (const o of app.getAllObjects()) {
      if (o.name === 'TEXT' || /^text \d$/.test(o.name)) o.visible = false
    }
  }, [])

  const boxed = modules.filter((m) => m.block && BLOCK_POS[m.block])

  return (
    <div
      style={{ position: 'absolute', inset: 0 }}
      onMouseMove={(ev) => {
        const r = ev.currentTarget.getBoundingClientRect()
        setMouse({ x: ev.clientX - r.left, y: ev.clientY - r.top })
      }}
      onMouseLeave={() => setHover(null)}
    >
      <div style={{ position: 'absolute', inset: 0 }}>
        <Spline scene="/scene.splinecode" onLoad={handleLoad} />
      </div>

      {/* 박스 핫스팟 — 씬 위 투명 버튼 (비율 좌표) */}
      {boxed.map((m) => {
        const [fx, fy] = BLOCK_POS[m.block!]!
        return (
          <button
            key={m.href}
            type="button"
            aria-label={`${m.name} ${m.value}`}
            onClick={() => go(m.href)}
            onMouseEnter={() => setHover(m)}
            onMouseLeave={() => setHover(null)}
            style={{
              position: 'absolute',
              left: `${fx * 100}%`,
              top: `${fy * 100}%`,
              transform: 'translate(-50%, -50%)',
              width: '13%',
              aspectRatio: '1.5 / 1',
              borderRadius: '50%',
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              zIndex: 5,
            }}
          />
        )
      })}

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
