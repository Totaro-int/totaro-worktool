'use client'

import type { JSX } from 'react'

import dynamic from 'next/dynamic'

import type { Desk } from './page'

// 3D 캔버스는 클라이언트 전용 — SSR 끄고 로드한다.
const Scene3D = dynamic(() => import('./Scene3D'), { ssr: false, loading: () => null })

export function OfficeScene({ desks }: { desks: Desk[] }): JSX.Element {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
      {/* 빈 방 렌더(배경) + 그 위에 투명 3D 캔버스(직원) */}
      <div className="relative w-full" style={{ aspectRatio: '1624 / 969' }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/ai-office-bg.png"
          alt="AI부서 사무실"
          className="absolute inset-0 h-full w-full object-cover"
        />
        <div className="absolute inset-0">
          <Scene3D desks={desks} />
        </div>
      </div>
      <p className="border-t border-slate-100 px-5 py-2.5 text-center text-xs text-slate-400">
        책상을 누르면 그 직원의 업무 대시보드로 이동합니다
      </p>
    </div>
  )
}
