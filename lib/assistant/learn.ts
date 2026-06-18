/**
 * 김사현 학습 루프 — 대화에서 배운 것을 두뇌(agent_memories)에 쌓고, 다음 대화에 주입한다.
 *
 * cron 보고서가 쌓는 시장 지식과 *같은 두뇌*(service_role)를 공유한다.
 * 그래서 대화로 가르친 선호·정정과 분석으로 쌓은 사실이 한곳에 모이고, 다음 답변에 반영된다.
 */
import { handleMemoryWrite } from '@/lib/mcp/agent-handlers'
import { getServiceSupabase } from '@/lib/oauth/utils'

import { generateGemini } from './gemini'

const RECALL_LIMIT = 20

/** 김사현이 대화·분석에서 쌓은 최근 기억(개인 + 전사 공유). 챗 프롬프트 주입용. 실패 시 빈 배열. */
export async function recallKimMemories(): Promise<string[]> {
  try {
    const sb = getServiceSupabase()
    const { data: agent } = await sb
      .from('agents')
      .select('id')
      .eq('slug', 'kim-sahyun')
      .maybeSingle()
    const agentId = (agent as { id: string } | null)?.id
    if (!agentId) return []

    const { data } = await sb
      .from('agent_memories')
      .select('content, expires_at')
      .or(`agent_id.eq.${agentId},scope.eq.company`)
      .order('created_at', { ascending: false })
      .limit(RECALL_LIMIT)

    const now = Date.now()
    return ((data ?? []) as { content: string; expires_at: string | null }[])
      .filter((m) => !m.expires_at || new Date(m.expires_at).getTime() > now)
      .map((m) => m.content)
      .filter(Boolean)
  } catch {
    return []
  }
}

/**
 * 대화에서 '앞으로 기억할 것'을 추출해 김사현 두뇌에 저장. 기억할 게 없으면 아무것도 안 함.
 * 답변은 이미 사용자에게 전달된 뒤라, 실패해도 조용히 넘어간다.
 */
export async function learnFromChat(question: string, answer: string): Promise<void> {
  try {
    const prompt = `다음은 사장(윤태준)과 마케팅 직원 김사현의 대화다.

[사장] ${question.slice(0, 1500)}
[김사현] ${answer.slice(0, 1500)}

이 대화에서 김사현이 *앞으로 계속 기억해 마케팅·콘텐츠 작업에 반영해야 할* 것이 있나?
- 사장의 선호·지시·정정, 또는 브랜드·전략·시장에 대한 새 사실만.
- 일반 잡담·이미 아는 정보·일회성 질문은 제외.
있으면 그 한 가지를 명령형 한 문장으로(예: "보고서의 네이버 순위는 표로 정리한다"). 없으면 정확히 "없음".`

    const result = await generateGemini(prompt)
    const learning = result.text.trim()
    if (!result.available || !learning || learning === '없음') return
    if (learning.length < 6 || learning.length > 300) return // 추출 실패(빈약/장황) → 저장 안 함

    await handleMemoryWrite({
      agent: 'kim-sahyun',
      content: learning,
      scope: 'agent',
      kind: 'preference',
      source_table: 'chat',
      confidence: 0.8,
    })
  } catch {
    // 학습 실패는 사용자 경험에 영향 없음 — 조용히 무시
  }
}
