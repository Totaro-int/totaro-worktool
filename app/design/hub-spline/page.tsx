'use client'

/**
 * /design/hub-spline — Spline 유리박스 6개 ↔ 허브 모듈 매핑 검증 (목업 값).
 * 클릭=실제 페이지 이동, 호버=툴팁, 좌하단 범례=9모듈(박스 없는 3개 포함).
 */
import type { JSX } from 'react'

import { HubSpline, type SplineHubModule } from '@/components/HubSpline'

const MODULES: SplineHubModule[] = [
  { block: 'Block 3', href: '/tasks', name: '할 일', value: '109', sub: '이번 주' },
  { block: 'Block 1', href: '/inbox', name: '우편실', value: '726', sub: '인덱싱 문서' },
  { block: 'Block 2', href: '/hub/ai-team', name: 'AI부서', value: '3', sub: '김사현 외' },
  { block: 'Block 5', href: '/hub/naver', name: '네이버', value: '₩466만', sub: '오늘 매출' },
  { block: 'Block 6', href: '/hub/agent', name: '에이전트', value: '₩1,597만', sub: '이번 달' },
  { block: 'Block 4', href: '/cash', name: '가용 현금', value: '₩466만', sub: '기준 07-05' },
  { href: '/assistant', name: 'AI 직원', value: '1,240' },
  { href: '/hub/github', name: 'GitHub', value: '5' },
  { href: '/contacts', name: '연락처', value: '214' },
]

export default function HubSplinePreview(): JSX.Element {
  return (
    <div style={{ position: 'fixed', inset: 0, background: '#0a0a0a' }}>
      <HubSpline modules={MODULES} />
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
          박스 호버=툴팁 · 클릭=이동 · 좌하단 범례=전체 모듈
        </p>
      </div>
    </div>
  )
}
