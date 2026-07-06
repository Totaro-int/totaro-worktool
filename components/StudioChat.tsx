'use client'

import { useEffect, useRef, useState } from 'react'

import type { Card } from '@/lib/studio/cards'

type Msg = { role: 'user' | 'assistant'; text: string }
type ChatCard = { kicker: string; headline: string; sub: string }

const EXAMPLES = [
  '신혼 침대프레임으로 8장 다시 짜줘',
  '3번 카드 더 짧고 따뜻하게',
  '전체 톤 더 차분하게',
]

/** 캔버스를 아는 사현이 챗 — 대화로 답하고, 카드 지시면 8장에 즉시 반영(onCards). */
export function StudioChat({
  cards,
  onCards,
}: {
  cards: Card[]
  onCards: (cards: ChatCard[]) => void
}): React.JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [busy, setBusy] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = scrollRef.current
    if (el) el.scrollTop = el.scrollHeight
  }, [messages, busy])

  async function send(text: string): Promise<void> {
    const q = text.trim()
    if (!q || busy) return
    setInput('')
    setBusy(true)
    const history = messages.slice(-6)
    setMessages((m) => [...m, { role: 'user', text: q }])
    try {
      const res = await fetch('/api/content/cardchat', {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({
          message: q,
          cards: cards.map((c) => ({ kicker: c.kicker, headline: c.headline, sub: c.sub })),
          history,
        }),
      })
      const data = (await res.json()) as {
        ok?: boolean
        reply?: string
        cards?: ChatCard[] | null
        error?: string
      }
      if (data.ok) {
        setMessages((m) => [...m, { role: 'assistant', text: data.reply || '…' }])
        if (Array.isArray(data.cards) && data.cards.length > 0) onCards(data.cards)
      } else {
        setMessages((m) => [
          ...m,
          { role: 'assistant', text: data.error || '응답 실패 — 다시 시도해줘.' },
        ])
      }
    } catch {
      setMessages((m) => [...m, { role: 'assistant', text: '연결 실패 — 다시.' }])
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="flex h-[460px] flex-col overflow-hidden rounded-xl bg-[#101f38] ring-1 ring-[#1c3556]">
      <div className="flex items-center gap-2 border-b border-[#12233c] px-3 py-2.5">
        <span className="flex h-6 w-6 items-center justify-center rounded-full bg-[#189ec2] text-[11px] font-bold text-white">
          사
        </span>
        <span className="text-sm font-semibold text-[#dbe7f4]">사현이</span>
        <span className="text-[11px] text-[#6b7c96]">· 말하면 카드에 반영</span>
      </div>

      <div ref={scrollRef} className="flex-1 space-y-2.5 overflow-y-auto p-3">
        {messages.length === 0 ? (
          <div className="mt-3 space-y-1.5 text-xs">
            <p className="mb-2 text-center text-[#6b7c96]">카드를 말로 고쳐봐 👇</p>
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => void send(ex)}
                className="block w-full rounded-lg bg-[#0c1830] px-3 py-2 text-left text-[#8ea0b8] ring-1 ring-[#1c3556] hover:bg-[#14263f]"
              >
                {ex}
              </button>
            ))}
          </div>
        ) : (
          messages.map((m, i) => (
            <div
              key={i}
              className={`max-w-[88%] rounded-xl px-3 py-2 text-sm whitespace-pre-line ${
                m.role === 'user'
                  ? 'ml-auto bg-[#189ec2] text-white'
                  : 'bg-[#0c1830] text-[#c4d2e4]'
              }`}
            >
              {m.text}
            </div>
          ))
        )}
        {busy ? (
          <div className="inline-block rounded-xl bg-[#0c1830] px-3 py-2 text-sm text-[#6b7c96]">
            사현이가 카드 손보는 중…
          </div>
        ) : null}
      </div>

      <div className="flex items-end gap-2 border-t border-[#12233c] p-2.5">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send(input)
            }
          }}
          rows={1}
          placeholder="사현이에게… (예: 3번 더 짧게)"
          className="flex-1 resize-none rounded-lg border border-[#1c3556] px-3 py-2 text-sm focus:border-slate-400 focus:outline-none"
        />
        <button
          type="button"
          onClick={() => void send(input)}
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white hover:bg-slate-800 disabled:opacity-50"
        >
          보내기
        </button>
      </div>
    </div>
  )
}
