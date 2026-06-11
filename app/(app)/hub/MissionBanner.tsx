'use client'

/**
 * 미션 배너 — /hub 진입 시 자동 표시 → 5초 뒤 자연스럽게 사라짐.
 * 회사 지표(누구를 위한 회사인가) + 7월 30일까지 영역별 KPI 한 묶음.
 * 한 번 보이고 자동 닫힘. 매 페이지 진입마다 다시 뜸. (sessionStorage 미사용 — 매번 떠야 한다는 요구.)
 */
import { useEffect, useState } from 'react'

type Phase = 'enter' | 'visible' | 'leave' | 'gone'

export function MissionBanner(): React.JSX.Element | null {
  const [phase, setPhase] = useState<Phase>('enter')

  useEffect(() => {
    const t1 = setTimeout(() => setPhase('visible'), 50) // fade-in 시작
    const t2 = setTimeout(() => setPhase('leave'), 5000) // 5초 후 fade-out 시작
    const t3 = setTimeout(() => setPhase('gone'), 5600) // DOM 에서 제거
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
        transform: `translate(-50%, ${visible ? '0px' : '-12px'})`,
        transition: 'opacity 500ms ease-out, transform 500ms ease-out',
      }}
      aria-hidden={!visible}
    >
      <div className="max-w-2xl rounded-2xl bg-white px-7 py-6 shadow-2xl ring-1 ring-slate-200">
        <div className="mb-3">
          <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600">우리의 지표</p>
        </div>
        <ul className="space-y-1.5 text-[13px] leading-relaxed text-slate-800">
          <li>· 우리는 세 명이 60명처럼 움직이고</li>
          <li>· 우리는 각 사업영역에 AI를 가장 잘 활용할 수 있는 사람이 되는 것</li>
          <li>· 즉 기업의 강점을 AI 전문가로써 최대치로 끌어낼 수 있는 기업이 토타로인 것</li>
        </ul>

        <div className="mt-5 border-t border-slate-100 pt-4">
          <p className="text-[10px] font-bold tracking-[0.2em] text-amber-600">
            영역별 KPI · 7월 30일까지
          </p>
        </div>
        <ul className="mt-2 space-y-1.5 text-[13px] leading-relaxed text-slate-700">
          <li>
            · <span className="font-semibold text-slate-900">e-커머스</span> 매출 800 달성
          </li>
          <li>
            · <span className="font-semibold text-slate-900">WEB-taro POC</span> 1차 건강식품 제품
            바이어 연결 3건
          </li>
          <li>
            · <span className="font-semibold text-slate-900">에이전트 판매</span> 매출 900
          </li>
        </ul>
      </div>
    </div>
  )
}
