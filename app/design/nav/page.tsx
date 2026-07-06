/**
 * /design/nav — AppNav 시각 검증용 공개 프리뷰 (승인 게이트 안).
 * 실제 마운트(app/(app)/layout.tsx) 전에 데스크탑 상단바 + 모바일 하단탭을 눈으로 본다.
 */
import type { JSX } from 'react'

import { AppNav } from '@/components/AppNav'

async function noop(): Promise<void> {
  'use server'
}

export default function NavPreview(): JSX.Element {
  return (
    <div
      className="min-h-screen"
      style={{
        background: 'radial-gradient(120% 90% at 50% 26%, #12294d, #0b1a33 45%, #081120)',
        color: '#dbe7f4',
      }}
    >
      <AppNav userName="윤태준" logoutAction={noop} />
      <div className="mx-auto max-w-3xl px-6 py-10">
        <p className="font-mono text-sm" style={{ color: '#9fb4d0' }}>
          AppNav 프리뷰 — 위 상단바(데스크탑) / 아래 하단탭(모바일). 잎 페이지 본문은 이 자리에
          들어온다.
        </p>
        <div
          className="mt-6 rounded-xl border p-6"
          style={{ borderColor: 'rgba(53,224,255,.16)', background: 'rgba(255,255,255,.02)' }}
        >
          <p className="text-sm" style={{ color: '#7e8ca0' }}>
            (샘플 콘텐츠 영역)
          </p>
        </div>
      </div>
    </div>
  )
}
