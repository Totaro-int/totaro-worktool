'use client'

import { useEffect, useRef, useState } from 'react'

import type { ChatTurn } from '@/lib/assistant/answer'

import { askAssistant, clearAssistantHistory, saveAssistantMessage } from './actions'

import type { AssistantSource, StoredMessage } from './actions'

type Message = {
  role: 'user' | 'assistant'
  content: string
  sources?: AssistantSource[]
  degraded?: boolean
  error?: boolean
  /** 토큰을 받는 중 — 커서 깜빡임 + 빈 상태면 '생각 중' 표시. */
  streaming?: boolean
}

/** send() 한 턴의 최종 결과 — kind 가 'answer' 일 때만 DB 에 저장한다. */
type FinalMsg = {
  content: string
  sources?: AssistantSource[]
  kind: 'answer' | 'degraded' | 'error'
}

function hydrate(stored: StoredMessage[]): Message[] {
  return stored.map((m) => ({
    role: m.role,
    content: m.content,
    sources: m.sources ?? undefined,
  }))
}

const DEGRADED_MSG =
  '지금은 AI 답변을 바로 만들지 못해서, 대신 질문과 관련된 우편실 자료를 찾아왔어요:'

const EXAMPLES = [
  '최근에 들어온 계약서 뭐 있어?',
  '지원사업 관련 자료 정리해줘',
  '바이어 쪽에서 온 메일 중에 챙겨야 할 거 있어?',
  '이번에 받은 견적서 요약해줘',
]

/** 마지막 메시지(스트리밍 중인 어시스턴트 말풍선)에 patch 를 적용한다. */
function patchLast(list: Message[], patch: Partial<Message>): Message[] {
  if (list.length === 0) return list
  const copy = list.slice()
  copy[copy.length - 1] = { ...copy[copy.length - 1], ...patch }
  return copy
}

export function AssistantClient({
  indexedCount,
  initialMessages,
}: {
  indexedCount: number
  initialMessages: StoredMessage[]
}): React.JSX.Element {
  const [messages, setMessages] = useState<Message[]>(() => hydrate(initialMessages))
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
    // 사용자 말풍선 + 비어 있는 어시스턴트 말풍선(스트리밍 placeholder) 추가
    setMessages((prev) => [
      ...prev,
      { role: 'user', content: q },
      { role: 'assistant', content: '', streaming: true },
    ])
    setLoading(true)
    // 사용자 질문은 즉시 저장(파이어앤포겟)
    void saveAssistantMessage('user', q)

    let final: FinalMsg | null = null
    try {
      final = await streamInto(q, history)
    } catch {
      // 스트리밍 실패 → 비스트리밍 서버 액션으로 폴백
      final = await fallbackInto(q, history)
    } finally {
      setMessages((prev) => patchLast(prev, { streaming: false }))
      setLoading(false)
    }

    // 정상 답변일 때만 DB 에 저장 (degraded/error 는 저장 안 함)
    if (final && final.kind === 'answer' && final.content) {
      void saveAssistantMessage('assistant', final.content, final.sources)
    }
  }

  /** "새 대화" — 화면을 비우고 본인 기록을 삭제한다. */
  async function handleNewChat(): Promise<void> {
    if (loading) return
    setMessages([])
    setInput('')
    await clearAssistantHistory()
  }

  /** /assistant/stream 에서 NDJSON 을 읽어 말풍선을 점진적으로 채운다. */
  async function streamInto(q: string, history: ChatTurn[]): Promise<FinalMsg> {
    const res = await fetch('/assistant/stream', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question: q, history }),
    })
    if (!res.ok || !res.body) throw new Error(`stream ${res.status}`)

    const reader = res.body.getReader()
    const decoder = new TextDecoder()
    let buf = ''
    let acc = ''
    let sources: AssistantSource[] | undefined
    let final: FinalMsg | null = null

    for (;;) {
      const { value, done } = await reader.read()
      if (done) break
      buf += decoder.decode(value, { stream: true })
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
          setMessages((prev) => patchLast(prev, { content: acc, streaming: true }))
        } else if (ev.type === 'sources') {
          sources = ev.sources
          setMessages((prev) => patchLast(prev, { sources: ev.sources }))
        } else if (ev.type === 'degraded') {
          final = { content: DEGRADED_MSG, sources: ev.sources, kind: 'degraded' }
          setMessages((prev) =>
            patchLast(prev, {
              content: DEGRADED_MSG,
              sources: ev.sources,
              degraded: true,
              streaming: false,
            })
          )
        } else if (ev.type === 'error') {
          final = { content: ev.error, kind: 'error' }
          setMessages((prev) =>
            patchLast(prev, { content: ev.error, error: true, streaming: false })
          )
        }
      }
    }

    // degraded/error 가 확정됐으면 그걸 반환
    if (final) return final
    // 토큰이 한 번도 안 왔는데 정상 종료 → 폴백 유도
    if (!acc) throw new Error('empty stream')
    return { content: acc, sources, kind: 'answer' }
  }

  /** 스트리밍이 안 될 때 기존 서버 액션으로 한 번에 답변을 받는다. */
  async function fallbackInto(q: string, history: ChatTurn[]): Promise<FinalMsg> {
    try {
      const res = await askAssistant(q, history)
      if (!res.ok) {
        const content = res.error ?? '문제가 생겼어요.'
        setMessages((prev) => patchLast(prev, { content, error: true }))
        return { content, kind: 'error' }
      }
      if (res.degraded) {
        setMessages((prev) =>
          patchLast(prev, { content: DEGRADED_MSG, sources: res.sources, degraded: true })
        )
        return { content: DEGRADED_MSG, sources: res.sources, kind: 'degraded' }
      }
      setMessages((prev) => patchLast(prev, { content: res.answer, sources: res.sources }))
      return { content: res.answer, sources: res.sources, kind: 'answer' }
    } catch (e) {
      const content = e instanceof Error ? e.message : '답변을 가져오지 못했어요.'
      setMessages((prev) => patchLast(prev, { content, error: true }))
      return { content, kind: 'error' }
    }
  }

  const empty = messages.length === 0

  return (
    <div className="mx-auto flex h-[calc(100vh-8.5rem)] w-full max-w-3xl flex-col px-4">
      {!empty && (
        <div className="flex justify-end border-b border-slate-100 py-2">
          <button
            type="button"
            onClick={() => void handleNewChat()}
            disabled={loading}
            className="rounded-lg px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
          >
            + 새 대화
          </button>
        </div>
      )}
      <div ref={scrollRef} className="flex-1 overflow-y-auto py-6">
        {empty ? (
          <div className="flex h-full flex-col items-center justify-center text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-indigo-600 text-xl font-bold text-white">
              T
            </div>
            <h2 className="mt-4 text-lg font-semibold text-slate-900">토타로 AI 직원</h2>
            <p className="mt-1 max-w-md text-sm text-slate-500">
              우편실에 쌓인 회사 자료 {indexedCount.toLocaleString()}건을 바탕으로 답해드려요.
              <br />
              계약·메일·지원사업·견적 뭐든 물어보세요.
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
                <ThinkingBubble key={i} />
              ) : (
                <MessageBubble key={i} message={m} />
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
            placeholder="회사 자료에 대해 물어보세요… (Shift+Enter 줄바꿈)"
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

function MessageBubble({ message }: { message: Message }): React.JSX.Element {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-tr-sm bg-indigo-600 px-4 py-2.5 text-sm whitespace-pre-wrap text-white">
          {message.content}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[88%]">
        <div
          className={`rounded-2xl rounded-tl-sm px-4 py-3 text-sm whitespace-pre-wrap ${
            message.error
              ? 'bg-rose-50 text-rose-700'
              : message.degraded
                ? 'bg-amber-50 text-amber-800'
                : 'bg-white text-slate-800 shadow-sm ring-1 ring-slate-200'
          }`}
        >
          {message.content}
          {message.streaming && (
            <span className="ml-0.5 inline-block h-3.5 w-1.5 translate-y-0.5 animate-pulse rounded-sm bg-slate-400 align-middle" />
          )}
        </div>
        {message.sources && message.sources.length > 0 && (
          <div className="mt-2 flex flex-col gap-1.5">
            {message.sources.map((s) => (
              <SourceCard key={s.id} source={s} />
            ))}
          </div>
        )}
      </div>
    </div>
  )
}

function SourceCard({ source }: { source: AssistantSource }): React.JSX.Element {
  const inner = (
    <div className="flex items-start gap-2 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs transition-colors hover:border-indigo-300 hover:bg-indigo-50/40">
      <span className="mt-0.5 inline-flex h-4 w-4 shrink-0 items-center justify-center rounded bg-indigo-100 text-[10px] font-semibold text-indigo-700">
        {source.n}
      </span>
      <div className="min-w-0">
        <p className="truncate font-medium text-slate-700">{source.filename}</p>
        <p className="truncate text-slate-400">
          {[source.docType, source.folderPath].filter(Boolean).join(' · ') || '우편실 자료'}
        </p>
        {source.summary && <p className="mt-0.5 line-clamp-2 text-slate-500">{source.summary}</p>}
      </div>
      {source.link && <span className="ml-auto shrink-0 self-center text-indigo-400">↗</span>}
    </div>
  )
  return source.link ? (
    <a href={source.link} target="_blank" rel="noopener noreferrer" className="block">
      {inner}
    </a>
  ) : (
    inner
  )
}

function ThinkingBubble(): React.JSX.Element {
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
