'use client'

import { useCallback, useRef, useState } from 'react'

import { toPng } from 'html-to-image'

/** 카드 한 장. photo = data URL(업로드) 또는 null(단색 Warm Linen). */
type Card = { kicker: string; headline: string; sub: string; photo: string | null }

const FONT = "'Pretendard','Apple SD Gothic Neo','Noto Sans KR','Malgun Gothic',sans-serif"
const LINEN = '#F0E8DD'
const TAUPE = '#C9B8A3'
const OBSIDIAN = '#222222'

const SEED: Card[] = [
  {
    kicker: '01 / 08',
    headline: '머리맡의 하루를\n조용히 정리합니다',
    sub: '오래 곁에 둘 협탁 한 점',
    photo: null,
  },
  {
    kicker: '02 / 08',
    headline: '늦은 밤,\n손이 닿는 곳에',
    sub: '1인 가구의 머리맡',
    photo: null,
  },
  {
    kicker: '03 / 08',
    headline: '책 한 권, 안경,\n물 한 잔',
    sub: '필요한 것만 가까이',
    photo: null,
  },
  {
    kicker: '04 / 08',
    headline: '흔들림 없는\n원목 상판',
    sub: '오래 쓰도록 만든 두께',
    photo: null,
  },
  { kicker: '05 / 08', headline: '서랍은\n소리 없이 닫힙니다', sub: '조용한 마감', photo: null },
  { kicker: '06 / 08', headline: '좁은 방에도\n넉넉하게', sub: '폭 420mm', photo: null },
  {
    kicker: '07 / 08',
    headline: '오래 곁에 둘\n한 점',
    sub: '유행 대신 곁에 두는 것',
    photo: null,
  },
  { kicker: '08 / 08', headline: 'MONÉ HOUSE', sub: '협탁 둘러보기 →', photo: null },
]

type BoardResp = {
  ok?: boolean
  error?: string
  board?: { title?: string; cards?: { kicker?: string; headline?: string; sub?: string }[] }
}

export function StudioEditor(): React.JSX.Element {
  const [cards, setCards] = useState<Card[]>(SEED)
  const [cur, setCur] = useState(0)
  const [topic, setTopic] = useState('')
  const [busy, setBusy] = useState(false)
  const [note, setNote] = useState('')
  const cardRef = useRef<HTMLDivElement>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const card = cards[cur]
  const hasPhoto = Boolean(card.photo)

  const patch = useCallback((i: number, p: Partial<Card>): void => {
    setCards((cs) => cs.map((c, idx) => (idx === i ? { ...c, ...p } : c)))
  }, [])

  async function draft(): Promise<void> {
    if (!topic.trim() || busy) return
    setBusy(true)
    setNote('사현이가 레퍼런스 보고 8장 초안 만드는 중…')
    try {
      const res = await fetch('/api/content/cardnews', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ topic: topic.trim() }),
      })
      const data = (await res.json()) as BoardResp
      const fresh = data.board?.cards
      if (data.ok && fresh && fresh.length > 0) {
        setCards((prev) =>
          fresh.slice(0, 8).map((c, i) => ({
            kicker: c.kicker || `0${i + 1} / 08`,
            headline: c.headline || '',
            sub: c.sub || '',
            photo: prev[i]?.photo ?? null,
          }))
        )
        setCur(0)
        setNote(`"${data.board?.title ?? topic}" — 8장 초안 완성. 카드 눌러 다듬고 사진 얹어.`)
      } else {
        setNote(data.error || '초안 생성 실패 — 다시 시도해줘.')
      }
    } catch {
      setNote('초안 생성 실패 — 네트워크 확인.')
    } finally {
      setBusy(false)
    }
  }

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
            사진 올리기
          </button>
          {hasPhoto ? (
            <button
              type="button"
              onClick={() => patch(cur, { photo: null })}
              className="rounded-lg px-3 py-2 text-xs font-medium text-slate-500 ring-1 ring-slate-200 hover:bg-slate-50"
            >
              사진 빼기
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
      </div>

      {/* 사현이 초안 */}
      <div className="flex flex-col gap-2 rounded-xl bg-white p-3 ring-1 ring-slate-200">
        <p className="text-xs font-semibold text-slate-500">🧑‍💼 사현이에게 8장 초안 시키기</p>
        <div className="flex gap-2">
          <input
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') void draft()
            }}
            placeholder="예: 1인가구 협탁, 신혼 침대프레임…"
            className="flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
          />
          <button
            type="button"
            onClick={() => void draft()}
            disabled={busy || !topic.trim()}
            className="rounded-lg bg-indigo-600 px-3 py-2 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            초안 만들기
          </button>
        </div>
        {note ? <p className="text-xs text-slate-500">{note}</p> : null}
      </div>
    </div>
  )
}
