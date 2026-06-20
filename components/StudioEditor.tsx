'use client'

import { type Dispatch, type SetStateAction, useCallback, useEffect, useRef, useState } from 'react'

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
  const [w, setW] = useState(440) // 카드 실측 폭(px) — cqw 대신 px 폰트(내보내기 안정)
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const card = cards[cur]
  const hasPhoto = Boolean(card.photo)

  // 카드 폭을 실측해 px 폰트 계산 (container-query 단위는 html-to-image 클론에서 불안정)
  useEffect(() => {
    const el = cardRef.current
    if (!el) return
    const ro = new ResizeObserver(() => setW(el.offsetWidth || 440))
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

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

  /** 서버에서 1080² PNG 합성(sharp) — 브라우저 캡처(html-to-image) 대체. 안 깨짐. */
  async function exportOne(i: number): Promise<void> {
    const c = cards[i]
    const res = await fetch('/api/content/render-card', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({
        card: { kicker: c.kicker, headline: c.headline, sub: c.sub, photo: c.photo },
      }),
    })
    if (!res.ok) throw new Error('render failed')
    const blob = await res.blob()
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `card-${String(i + 1).padStart(2, '0')}.png`
    a.click()
    URL.revokeObjectURL(url)
  }

  async function exportCurrent(): Promise<void> {
    setBusy(true)
    setNote('저장 중…')
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
      for (let i = 0; i < cards.length; i += 1) await exportOne(i)
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
  /** 카드 폭 비율(%) → px. cqw 를 대체 — 내보내기에서 안정적으로 렌더된다. */
  const px = (ratio: number): string => `${(ratio / 100) * w}px`

  return (
    <div className="flex flex-col gap-4">
      {/* 캔버스 */}
      <div
        ref={cardRef}
        className="relative mx-auto w-full max-w-[440px] overflow-hidden rounded-xl ring-1 ring-slate-200"
        style={{ height: `${w}px`, background: hasPhoto ? TAUPE : LINEN, fontFamily: FONT }}
      >
        {hasPhoto ? (
          <>
            {/* background-image 가 아니라 실제 img — html-to-image 가 안정적으로 캡처함 */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={card.photo ?? ''}
              alt=""
              className="absolute inset-0 h-full w-full"
              style={{ objectFit: 'cover' }}
            />
            <div className="absolute inset-0" style={{ background: 'rgba(28,26,22,0.32)' }} />
          </>
        ) : null}
        {/* flex 대신 절대위치 — html-to-image 클론에서 flex 분배가 깨져 글자가 쏠리는 것 방지 */}
        <div
          style={{
            position: 'absolute',
            top: px(8),
            left: px(8),
            fontSize: px(3.4),
            letterSpacing: '0.3em',
            color: kColor,
          }}
        >
          {card.kicker}
        </div>
        <div style={{ position: 'absolute', left: px(8), right: px(8), bottom: px(8) }}>
          <div
            style={{
              fontSize: px(7.6),
              fontWeight: 700,
              lineHeight: 1.24,
              whiteSpace: 'pre-line',
              color: hColor,
            }}
          >
            {card.headline}
          </div>
          <div style={{ marginTop: px(2.5), fontSize: px(3.8), color: sColor }}>{card.sub}</div>
          <div
            style={{ marginTop: px(3.5), fontSize: px(3), letterSpacing: '0.4em', color: kColor }}
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
