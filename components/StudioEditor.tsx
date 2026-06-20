'use client'

import { type Dispatch, type SetStateAction, useCallback, useRef, useState } from 'react'

import { toPng } from 'html-to-image'

import type { Card } from '@/lib/studio/cards'

const FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif"
const LINEN = '#F0E8DD'
const TAUPE = '#C9B8A3'
const OBSIDIAN = '#222222'

type Props = {
  cards: Card[]
  setCards: Dispatch<SetStateAction<Card[]>>
  cur: number
  setCur: Dispatch<SetStateAction<number>>
}

/** 카드 캔버스 에디터 — 상태는 부모(StudioWorkspace)가 소유. 사진/텍스트 편집 + PNG 내보내기. */
export function StudioEditor({ cards, setCards, cur, setCur }: Props): React.JSX.Element {
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const card = cards[cur]
  const hasPhoto = Boolean(card.photo)

  const patch = useCallback(
    (i: number, p: Partial<Card>): void => {
      setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...p } : c)))
    },
    [setCards]
  )

  function onFile(e: React.ChangeEvent<HTMLInputElement>): void {
    const f = e.target.files?.[0]
    if (!f) return
    const r = new FileReader()
    r.onload = (ev) => patch(cur, { photo: String(ev.target?.result ?? '') })
    r.readAsDataURL(f)
    e.target.value = ''
  }

  async function exportOne(i: number): Promise<void> {
    const node = cardRef.current
    if (!node) return
    const scale = node.offsetWidth > 0 ? 1080 / node.offsetWidth : 2
    const url = await toPng(node, { pixelRatio: scale, cacheBust: true })
    const a = document.createElement('a')
    a.href = url
    a.download = `card-${String(i + 1).padStart(2, '0')}.png`
    a.click()
  }

  async function exportCurrent(): Promise<void> {
    setBusy(true)
    try {
      await exportOne(cur)
      setNote('현재 카드 저장 완료.')
    } catch {
      setNote('저장 실패 — 다시.')
    } finally {
      setBusy(false)
    }
  }

  async function exportAll(): Promise<void> {
    setBusy(true)
    setNote('8장 PNG 만드는 중…')
    try {
      for (let i = 0; i < cards.length; i += 1) {
        setCur(i)
        await new Promise((r) => setTimeout(r, 280)) // 카드 전환 렌더 대기
        await exportOne(i)
      }
      setNote('8장 모두 다운로드 완료.')
    } catch {
      setNote('일부 저장 실패 — 다시 시도.')
    } finally {
      setBusy(false)
    }
  }

  const kColor = hasPhoto ? LINEN : '#7F7366'
  const hColor = hasPhoto ? '#F7F1E8' : OBSIDIAN
  const sColor = hasPhoto ? '#EADFCF' : '#7F7366'

  return (
    <div className="flex flex-col gap-4">
      {/* 캔버스 */}
      <div
        ref={cardRef}
        className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-xl ring-1 ring-slate-200"
        style={{
          aspectRatio: '1 / 1',
          background: hasPhoto ? TAUPE : LINEN,
          fontFamily: FONT,
          containerType: 'inline-size',
        }}
      >
        {hasPhoto ? (
          <>
            <div
              className="absolute inset-0"
              style={{
                backgroundImage: `url(${card.photo})`,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
              }}
            />
            <div className="absolute inset-0" style={{ background: 'rgba(28,26,22,0.32)' }} />
          </>
        ) : null}
        <div className="absolute inset-0 flex flex-col" style={{ padding: '8%' }}>
          <div style={{ fontSize: '3.4cqw', letterSpacing: '0.3em', color: kColor }}>
            {card.kicker}
          </div>
          <div className="flex-1" />
          <div
            style={{
              fontSize: '7.6cqw',
              fontWeight: 700,
              lineHeight: 1.24,
              whiteSpace: 'pre-line',
              color: hColor,
            }}
          >
            {card.headline}
          </div>
          <div style={{ marginTop: '2.5cqw', fontSize: '3.8cqw', color: sColor }}>{card.sub}</div>
          <div
            style={{ marginTop: '3.5cqw', fontSize: '3cqw', letterSpacing: '0.4em', color: kColor }}
          >
            MONÉ HOUSE
          </div>
        </div>
      </div>

      {/* 8장 썸네일 */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {cards.map((c, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setCur(i)}
            className={`h-11 w-11 shrink-0 rounded-md text-xs font-semibold transition-colors ${
              i === cur
                ? 'bg-slate-900 text-white'
                : 'bg-white text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50'
            }`}
          >
            {i + 1}
          </button>
        ))}
      </div>

      {/* 현재 카드 편집 */}
      <div className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            className="flex-1 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800"
          >
            배경 사진 올리기
          </button>
          {hasPhoto ? (
            <button
              type="button"
              onClick={() => patch(cur, { photo: null })}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              배경 빼기
            </button>
          ) : null}
        </div>
        <input ref={fileRef} type="file" accept="image/*" onChange={onFile} className="hidden" />
        <textarea
          value={card.headline}
          onChange={(e) => patch(cur, { headline: e.target.value })}
          rows={2}
          placeholder="제목 (줄바꿈 가능)"
          className="resize-none rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <input
          value={card.sub}
          onChange={(e) => patch(cur, { sub: e.target.value })}
          placeholder="소제목"
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => void exportCurrent()}
            disabled={busy}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            이 카드 PNG
          </button>
          <button
            type="button"
            onClick={() => void exportAll()}
            disabled={busy}
            className="flex-1 rounded-lg px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 disabled:opacity-50"
          >
            8장 모두 저장
          </button>
        </div>
        {note ? <p className="text-xs text-slate-500">{note}</p> : null}
      </div>
    </div>
  )
}
