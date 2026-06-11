'use client'

/**
 * /hub 진입 시 자동 표시 → 5초 후 fade-out. 절제된 모노톤 카드.
 * 회사 지표 + 7월 30일까지 영역별 KPI.
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
      <div className="w-[440px] overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 px-6 pt-5 pb-4">
          <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
            우리의 지표
          </p>
          <ul className="mt-3 space-y-1.5 text-[13px] leading-relaxed text-slate-700">
            <li>세 명이 60명처럼 움직인다</li>
            <li>각 사업영역에서 AI를 가장 잘 활용하는 사람이 된다</li>
            <li>기업의 강점을 AI 전문가로서 최대치로 끌어내는 회사</li>
          </ul>
        </div>
        <div className="px-6 pt-4 pb-5">
          <div className="flex items-baseline justify-between">
            <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
              영역별 KPI
            </p>
            <p className="text-[10px] font-medium tracking-[0.18em] text-slate-400 uppercase">
              ~ 07.30
            </p>
          </div>
          <ul className="mt-3 space-y-2 text-[13px] leading-snug">
            <KpiRow label="e-커머스" target="매출 800" />
            <KpiRow label="WEB-taro POC" target="건강식품 바이어 연결 3건" />
            <KpiRow label="에이전트 판매" target="매출 900" />
          </ul>
        </div>
      </div>
    </div>
  )
}

function KpiRow({ label, target }: { label: string; target: string }): React.JSX.Element {
  return (
    <li className="flex items-baseline justify-between gap-4">
      <span className="font-medium text-slate-900">{label}</span>
      <span className="text-slate-500">{target}</span>
    </li>
  )
}
