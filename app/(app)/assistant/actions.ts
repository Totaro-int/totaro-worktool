'use server'

import { generateAnswer } from '@/lib/assistant/answer'
import type { ChatTurn } from '@/lib/assistant/answer'
import { citedSources, retrieveContext, toSource } from '@/lib/assistant/context'
import type { AssistantSource } from '@/lib/assistant/context'
import { createClient } from '@/lib/supabase/server'

export type { AssistantSource }

export type AskResult = {
  ok: boolean
  answer: string
  sources: AssistantSource[]
  /** 답변 생성 못 함 — 자료만 보여주는 모드. */
  degraded: boolean
  error?: string
}

/**
 * 비스트리밍 답변 (서버 액션).
 * 평소엔 클라이언트가 /assistant/stream 으로 스트리밍을 받지만,
 * 스트림이 실패하면 이 액션으로 폴백한다.
 */
export async function askAssistant(question: string, history: ChatTurn[]): Promise<AskResult> {
  const q = (question ?? '').trim()
  if (!q)
    return { ok: false, answer: '', sources: [], degraded: false, error: '질문이 비어 있습니다.' }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, answer: '', sources: [], degraded: false, error: '인증 필요' }

  // 관련 자료(발췌 포함) + 멤버 맥락
  const { docs, members } = await retrieveContext(q)

  // Claude(API 또는 CLI)로 자연어 답변
  const ans = await generateAnswer({ question: q, history: history ?? [], docs, members })

  // 답변 생성 불가 → 자료 카드로 폴백 (상위 6건)
  if (!ans.available) {
    return {
      ok: true,
      answer: '',
      sources: docs.slice(0, 6).map((d, i) => toSource(d, i + 1)),
      degraded: true,
    }
  }

  // 답변이 인용한 [n] 만 출처 카드로
  return { ok: true, answer: ans.text, sources: citedSources(ans.text, docs), degraded: false }
}

// ============================================================
// 대화 기록 영속화 (assistant_messages) — 새로고침해도 유지
// ============================================================

/** 저장/복원용 메시지 형태(직렬화 가능). */
export type StoredMessage = {
  role: 'user' | 'assistant'
  content: string
  sources: AssistantSource[] | null
}

/** 로그인한 사용자의 대화 기록을 시간순으로 불러온다. */
export async function loadAssistantHistory(): Promise<StoredMessage[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data } = await supabase
    .from('assistant_messages')
    .select('role, content, sources')
    .eq('user_id', user.id)
    .order('created_at', { ascending: true })
    .limit(200)

  return (data ?? []).map((r) => ({
    role: r.role === 'assistant' ? 'assistant' : 'user',
    content: r.content ?? '',
    sources: (r.sources as AssistantSource[] | null) ?? null,
  }))
}

/** 메시지 한 건 저장(파이어앤포겟). 인증 안 됐으면 조용히 무시. */
export async function saveAssistantMessage(
  role: 'user' | 'assistant',
  content: string,
  sources?: AssistantSource[]
): Promise<void> {
  const text = (content ?? '').trim()
  if (!text) return

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('assistant_messages').insert({
    user_id: user.id,
    role,
    content: text,
    sources: sources && sources.length ? sources : null,
  })
}

/** 본인 대화 기록 전체 삭제("새 대화"). */
export async function clearAssistantHistory(): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return

  await supabase.from('assistant_messages').delete().eq('user_id', user.id)
}
