'use client'

import { useState } from 'react'

import { StudioChat } from '@/components/StudioChat'
import { StudioEditor } from '@/components/StudioEditor'
import { StudioReportPanel } from '@/components/StudioReportPanel'
import { SEED, type Card } from '@/lib/studio/cards'

type ChatCard = { kicker: string; headline: string; sub: string }

/** 스튜디오 작업대 — 카드 상태를 소유하고 에디터·챗이 공유한다. 챗이 카드를 바꾸면 캔버스가 즉시 갱신. */
export function StudioWorkspace(): React.JSX.Element {
  const [cards, setCards] = useState<Card[]>(SEED)
  const [cur, setCur] = useState(0)

  /** 사현이 챗이 돌려준 카드 텍스트를 캔버스에 반영(배경 사진은 유지). */
  function applyChatCards(cc: ChatCard[]): void {
    setCards((prev) =>
      cc.slice(0, 8).map((c, i) => ({
        kicker: c.kicker || `0${i + 1} / 08`,
        headline: c.headline || '',
        sub: c.sub || '',
        photo: prev[i]?.photo ?? null,
      }))
    )
    setCur(0)
  }

  return (
    <div className="flex flex-1 flex-col gap-5 p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
      <div className="w-full lg:flex-1">
        <StudioEditor cards={cards} setCards={setCards} cur={cur} setCur={setCur} />
      </div>
      <div className="w-full lg:w-[400px]">
        <StudioReportPanel />
        <StudioChat cards={cards} onCards={applyChatCards} />
      </div>
    </div>
  )
}
