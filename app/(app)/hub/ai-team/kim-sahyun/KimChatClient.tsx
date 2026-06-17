'use client'

import { useEffect, useRef, useState } from 'react'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

import type { ChatTurn } from '@/lib/assistant/answer'
import type { AssistantSource } from '@/lib/assistant/context'

/**
 * 김사현(마케팅 애널리스트)과 1:1 대화 — /assistant/stream 을 persona='kim-sahyun' 으로 호출.
 * 회사 우편실 자료(특히 마케팅 분석 보고서)를 근거로 답한다. 세션 한정(새로고침 시 초기화).
 */
type Msg = {
  role: 'user' | 'assistant'
  content: string
  sources?: AssistantSource[]
  streaming?: boolean
  error?: boolean
}

const EXAMPLES = [
  '오늘 시장에서 우리가 주목할 트렌드 뭐야?',
  '모네하우스 전환 올리려면 콘텐츠 뭘 밀어야 해?',
  '경쟁 리빙·가구 브랜드 중 잘하는 데 어디야?',
  '이번 주 마케팅 분석 요약해줘',
]

function patchLast(list: Msg[], patch: Partial<Msg>): Msg[] {
  if (!list.length) return list
  const c = list.slice()
  c[c.length - 1] = { ...c[c.length - 1], ...patch }
  return c
}

export function KimChatClient(): React.JSX.Element {
  const [messages, setMessages] = useState<Msg[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const scrollRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' })
  }, [messages, loading])

  async function send(text: string): Promise<void> {
    const q = text.trim()
    if (!q || loading) return
    setInput('')
    const history: ChatTurn[] = messages.map((m) => ({ role: m.role, content: m.content }))
    setMessages((p) => [
      ...p,
      { role: 'user', content: q },
      { role: 'assistant', content: '', streaming: true },
    ])
    setLoading(true)
    try {
      await stream(q, history)
    } catch {
      setMessages((p) =>
        patchLast(p, {
          content: '지금 답을 못 만들었어요. 잠시 후 다시 물어봐 주세요.',
          error: true,
          streaming: false,
        })
      )
    } finally {
      setMessages((p) => patchLast(p, { streaming: false }))
      setLoading(false)
    }
  }

  async function stream(q: string, history: ChatTurn[]): Promise<void> {
    const res = await fetch('/assistant/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q, history, persona: 'kim-sahyun' }),
    })
    if (!res.ok || !res.body) throw new Error('stream failed')

    const reader = res.body.getReader()
    const dec = new TextDecoder()
    let buf = ''
    let acc = ''
    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += dec.decode(value, { stream: true })
      let nl: number
      while ((nl = buf.indexOf('\n')) !== -1) {
        const line = buf.slice(0, nl).trim()
        buf = buf.slice(nl + 1)
        if (!line) continue
        const ev = JSON.parse(line) as
          | { type: 'delta'; text: string }
          | { type: 'sources'; sources: AssistantSource[] }
          | { type: 'degraded'; sources: AssistantSource[] }
          | { type: 'error'; error: string }
          | { type: 'done' }
        if (ev.type === 'delta') {
          acc += ev.text
          setMessages((p) => patchLast(p, { content: acc, streaming: true }))
        } else if (ev.type === 'sources') {
          setMessages((p) => patchLast(p, { sources: ev.sources }))
        } else if (ev.type === 'degraded') {
          setMessages((p) =>
            patchLast(p, {
              content: acc || '관련 우편실 자료를 찾아왔어요:',
              sources: ev.sources,
              streaming: false,
            })
          )
        } else if (ev.type === 'error') {
          setMessages((p) => patchLast(p, { content: ev.error, error: true, streaming: false }))
        }
      }
    }
    if (!acc) throw new Error('empty stream')
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto flex h-[calc(100vh-11rem)] w-full max-w-2xl flex-col px-4">
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
              사
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">
              김사현 · 마케팅 애널리스트
            </h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              매일 마케팅 분석을 하는 AI 직원이에요. 시장·경쟁사·콘텐츠·전환 뭐든 물어보세요.
            </p>
            <div className="mt-6 grid w-full max-w-lg grid-cols-1 gap-2 sm:grid-cols-2">
              {EXAMPLES.map((ex) => (
                <button
                  key={ex}
                  type="button"
                  onClick={() => void send(ex)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-left text-sm text-slate-600 transition-colors hover:border-indigo-300 hover:bg-indigo-50/50 hover:text-slate-900"
                >
                  {ex}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-col gap-5">
            {messages.map((m, i) =>
              m.role === 'assistant' && m.streaming && !m.content ? (
                <Thinking key={i} />
              ) : (
                <Bubble key={i} m={m} />
              )
            )}
          </div>
        )}
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault()
          void send(input)
        }}
        className="border-t border-slate-200 bg-white/80 py-4 backdrop-blur"
      >
        <div className="flex items-end gap-2">
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
            placeholder="김사현에게 물어보세요… (Shift+Enter 줄바꿈)"
            className="max-h-40 flex-1 resize-none rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 transition-colors outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500"
            disabled={loading}
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="rounded-xl bg-indigo-600 px-5 py-3 text-sm font-medium text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
          >
            보내기
          </button>
        </div>
      </form>
    </div>
  )
}

function Bubble({ m }: { m: Msg }): React.JSX.Element {
  if (m.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
          {m.content}
        </div>
      </div>
    )
  }
  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm ${
            m.error
              ? 'bg-rose-50 text-rose-700'
              : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
          }`}
        >
          <div className="markdown-body text-sm leading-relaxed break-words">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                h1: (p) => <h1 className="mt-2 mb-2 text-base font-bold text-slate-900" {...p} />,
                h2: (p) => <h2 className="mt-3 mb-2 text-base font-bold text-slate-900" {...p} />,
                h3: (p) => <h3 className="mt-3 mb-1.5 text-sm font-bold text-slate-900" {...p} />,
                p: (p) => <p className="mb-2 last:mb-0" {...p} />,
                strong: (p) => <strong className="font-semibold text-slate-900" {...p} />,
                ul: (p) => <ul className="my-2 ml-5 list-disc space-y-1" {...p} />,
                ol: (p) => <ol className="my-2 ml-5 list-decimal space-y-1" {...p} />,
                li: (p) => <li className="leading-snug" {...p} />,
                a: ({ children, href, ...rest }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noreferrer"
                    className="text-indigo-600 underline underline-offset-2 hover:text-indigo-800"
                    {...rest}
                  >
                    {children}
                  </a>
                ),
                table: (p) => (
                  <div className="my-2 overflow-x-auto">
                    <table className="w-full border-collapse text-xs" {...p} />
                  </div>
                ),
                th: (p) => (
                  <th
                    className="border border-slate-200 bg-slate-100 px-2 py-1.5 font-semibold"
                    {...p}
                  />
                ),
                td: (p) => <td className="border border-slate-200 px-2 py-1.5 align-top" {...p} />,
              }}
            >
              {m.content}
            </ReactMarkdown>
          </div>
          {m.streaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-slate-400 align-middle" />
          )}
        </div>
        {m.sources && m.sources.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {m.sources.map((s) => (
              <a
                key={s.id}
                href={s.link ?? undefined}
                target={s.link ? '_blank' : undefined}
                rel="noreferrer"
                className={`flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs ${
                  s.link ? 'transition-colors hover:border-indigo-300 hover:bg-indigo-50/40' : ''
                }`}
              >
                <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-semibold text-indigo-700">
                  {s.n}
                </span>
                <div className="min-w-0">
                  <p className="truncate font-medium text-slate-700">{s.filename}</p>
                  {s.summary && <p className="line-clamp-2 text-slate-500">{s.summary}</p>}
                </div>
                {s.link && <span className="ml-auto shrink-0 self-center text-indigo-400">↗</span>}
              </a>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function Thinking(): React.JSX.Element {
  return (
    <div className="flex justify-start">
      <div className="flex items-center gap-1 rounded-2xl rounded-tl-sm bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.3s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300 [animation-delay:-0.15s]" />
        <span className="h-2 w-2 animate-bounce rounded-full bg-slate-300" />
        <span className="ml-2 text-xs text-slate-400">자료 뒤져보는 중…</span>
      </div>
    </div>
  )
}
