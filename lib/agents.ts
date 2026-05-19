import { createClient } from '@/lib/supabase/server'

export type AgentStatus = 'active' | 'onboarding' | 'paused'

export type MarketingAgent = {
  id: string
  name: string
  status: AgentStatus
  client_name: string | null
  monthly_fee: number
  note: string | null
  created_at: string
}

export type AgentData = {
  status: 'ok'
  agents: MarketingAgent[]
  activeCount: number
  onboardingCount: number
  monthlyRevenue: number
}

export type AgentResult =
  | AgentData
  | { status: 'needs_migration' }
  | { status: 'error'; message: string }

/** /hub/agent 대시보드용 — 마케팅 에이전트 현황을 Supabase에서 조회한다. */
export async function getAgentData(): Promise<AgentResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('marketing_agents')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) {
    // marketing_agents 테이블이 아직 없으면 마이그레이션 안내 상태로 처리한다.
    const missingTable =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    if (missingTable) return { status: 'needs_migration' }
    return { status: 'error', message: error.message }
  }

  const agents = (data ?? []) as MarketingAgent[]
  const activeAgents = agents.filter((a) => a.status === 'active')
  return {
    status: 'ok',
    agents,
    activeCount: activeAgents.length,
    onboardingCount: agents.filter((a) => a.status === 'onboarding').length,
    monthlyRevenue: activeAgents.reduce((sum, a) => sum + a.monthly_fee, 0),
  }
}
