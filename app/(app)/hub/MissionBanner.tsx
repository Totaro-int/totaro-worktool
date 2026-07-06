'use client'

/**
 * /hub 진입 시 자동 표시 → 5초 후 fade-out. 절제된 모노톤 카드.
 * 회사 지표 + 7월 31일까지 영역별 KPI.
 */
import { useEffect, useState } from 'react'

type Phase = 'enter' | 'visible' | 'leave' | 'gone'

export function MissionBanner(): React.JSX.Element | null {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50)
    const t2 = setTimeout(() => setPhase('leave'), 5000)
    const t3 = setTimeout(() => setPhase('gone'), 5600)
    return () => {
      clearTimeout(t1)
      clearTimeout(t2)
      clearTimeout(t3)
    }
  }, [])

  if (phase === 'gone') return null

  const visible = phase === 'visible'

  return (
    <div
      className="pointer-events-none fixed top-20 left-1/2 z-50"
      style={{
        opacity: visible ? 1 : 0,
        transform: `translate(-50%, ${visible ? '0px' : '-8px'})`,
        transition: 'opacity 500ms ease-out, transform 500ms ease-out',
      }}
      aria-hidden={!visible}
    >
      <div className="w-[440px] overflow-hidden rounded-xl border border-[#1c3556] bg-[#101f38] shadow-sm">
        <div className="border-b border-[#12233c] px-6 pt-5 pb-4">
          <p className="text-[10px] font-medium tracking-[0.3em] text-[#6b7c96] uppercase">
            우리의 지표
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-[#c4d2e4]">
            <li>세 명이 60명처럼 움직인다</li>
            <li>AI로 우리 브랜드를 키우고, 증명된 도구만 판다</li>
            <li>기업의 강점을 AI로 가장 잘 알리는 회사</li>
          </ul>
        </div>
        <div className="px-6 pt-4 pb-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium tracking-[0.3em] text-[#6b7c96] uppercase">
              영역별 KPI
            </p>
            <p className="text-[10px] font-medium tracking-[0.18em] text-[#6b7c96] uppercase">
              ~ 07.31
            </p>
          </div>
          <ul className="mt-3 space-y-2 text-[13px] leading-snug">
            <KpiRow label="모네하우스" target="장바구니→결제 45%" />
            <KpiRow label="이커머스" target="매출 500" />
            <KpiRow label="에이전트 판매" target="검증 에이전트 게시" />
          </ul>
        </div>
      </div>
    </div>
  )
}

function KpiRow({ label, target }: { label: string; target: string }): React.JSX.Element {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="font-medium text-[#dbe7f4]">{label}</span>
      <span className="text-[#8ea0b8]">{target}</span>
    </li>
  )
}
