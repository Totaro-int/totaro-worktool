import { AreaTaskList } from '@/components/AreaTaskList'
import { ConsolePanel, ConsoleShell, StatPanel } from '@/components/console'
import { PageHeader, inputClass, labelClass, primaryButtonClass } from '@/components/ui'
import { getAgentData } from '@/lib/agents'
import type { AgentData, AgentStatus, MarketingAgent } from '@/lib/agents'

import { createAgent, deleteAgent, updateAgent } from './actions'

const STATUS_META: Record<AgentStatus, { label: string; badge: string }> = {
  active: { label: '운영중', badge: 'bg-emerald-50 text-emerald-700 ring-emerald-200' },
  onboarding: { label: '도입중', badge: 'bg-amber-50 text-amber-700 ring-amber-200' },
  paused: { label: '일시중지', badge: 'bg-slate-100 text-slate-500 ring-slate-200' },
}

export default async function AgentHubPage(): Promise<React.JSX.Element> {
  const data = await getAgentData()

  return (
    <>
      <PageHeader
        title="마케팅 에이전트 · 판매"
        description="AI 마케팅 에이전트 운영과 판매 현황을 관리합니다."
      />
      <ConsoleShell>
        <AreaTaskList workAreaId="ai_agent" />
        {data.status === 'needs_migration' && <MigrationCard />}
        {data.status === 'error' && <ErrorCard message={data.message} />}
        {data.status === 'ok' && <AgentDashboard data={data} />}
      </ConsoleShell>
    </>
  )
}

function AgentRow({ agent }: { agent: MarketingAgent }): React.JSX.Element {
  const meta = STATUS_META[agent.status]
  return (
    <li>
      <details className="group">
        <summary className="flex cursor-pointer list-none items-center gap-3 px-5 py-3.5 hover:bg-slate-50">
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900">{agent.name}</p>
            <p className="mt-0.5 truncate text-xs text-slate-400">
              {agent.client_name ? `고객사 · ${agent.client_name}` : '고객사 미지정'}
              {agent.note ? ` · ${agent.note}` : ''}
            </p>
          </div>
          <span
            className={`shrink-0 rounded-full px-2 py-0.5 text-xs font-medium ring-1 ${meta.badge}`}
          >
            {meta.label}
          </span>
          <span className="w-24 shrink-0 text-right text-sm text-slate-600 tabular-nums">
            {agent.monthly_fee > 0 ? `${agent.monthly_fee.toLocaleString('ko-KR')}원` : '—'}
          </span>
          <span className="shrink-0 font-mono text-[10px] tracking-wide text-slate-300 group-open:text-blue-500">
            수정 ▾
          </span>
        </summary>
        <form
          action={updateAgent}
          className="space-y-3 border-t border-slate-100 bg-slate-50/50 p-5"
        >
          <input type="hidden" name="id" value={agent.id} />
          <div>
            <label className={labelClass} htmlFor={`agent-name-${agent.id}`}>
              에이전트 이름
            </label>
            <input
              id={`agent-name-${agent.id}`}
              name="name"
              required
              defaultValue={agent.name}
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor={`agent-status-${agent.id}`}>
                상태
              </label>
              <select
                id={`agent-status-${agent.id}`}
                name="status"
                defaultValue={agent.status}
                className={inputClass}
              >
                <option value="active">운영중</option>
                <option value="onboarding">도입중</option>
                <option value="paused">일시중지</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor={`agent-client-${agent.id}`}>
                고객사 (선택)
              </label>
              <input
                id={`agent-client-${agent.id}`}
                name="client_name"
                defaultValue={agent.client_name ?? ''}
                className={inputClass}
              />
            </div>
            <div>
              <label className={labelClass} htmlFor={`agent-fee-${agent.id}`}>
                월 매출 (원)
              </label>
              <input
                type="number"
                id={`agent-fee-${agent.id}`}
                name="monthly_fee"
                min={0}
                step={10000}
                defaultValue={agent.monthly_fee}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor={`agent-note-${agent.id}`}>
              메모 (선택)
            </label>
            <input
              id={`agent-note-${agent.id}`}
              name="note"
              defaultValue={agent.note ?? ''}
              className={inputClass}
            />
          </div>
          <div className="flex items-center gap-2">
            <button type="submit" className={primaryButtonClass}>
              저장
            </button>
            <button
              type="submit"
              formAction={deleteAgent}
              className="rounded-md px-3 py-1.5 text-xs font-medium text-red-600 ring-1 ring-red-200 hover:bg-red-50"
            >
              삭제
            </button>
          </div>
        </form>
      </details>
    </li>
  )
}

function AgentDashboard({ data }: { data: AgentData }): React.JSX.Element {
  return (
    <>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatPanel label="운영 중 에이전트" value={`${data.activeCount}개`} accent="emerald" />
        <StatPanel
          label="이번 달 매출"
          value={`${data.monthlyRevenue.toLocaleString('ko-KR')}원`}
          accent="blue"
        />
        <StatPanel label="도입 진행 중" value={`${data.onboardingCount}개`} accent="amber" />
      </div>

      <details className="overflow-hidden rounded-xl bg-white shadow-sm ring-1 ring-slate-200">
        <summary className="cursor-pointer list-none px-5 py-3.5 font-mono text-[11px] font-semibold tracking-[0.14em] text-slate-500">
          + 에이전트 추가
        </summary>
        <form action={createAgent} className="space-y-3 border-t border-slate-100 p-5">
          <div>
            <label className={labelClass} htmlFor="agent-name">
              에이전트 이름
            </label>
            <input
              id="agent-name"
              name="name"
              required
              placeholder="예: 인스타 콘텐츠 에이전트"
              className={inputClass}
            />
          </div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <div>
              <label className={labelClass} htmlFor="agent-status">
                상태
              </label>
              <select id="agent-status" name="status" defaultValue="active" className={inputClass}>
                <option value="active">운영중</option>
                <option value="onboarding">도입중</option>
                <option value="paused">일시중지</option>
              </select>
            </div>
            <div>
              <label className={labelClass} htmlFor="agent-client">
                고객사 (선택)
              </label>
              <input id="agent-client" name="client_name" className={inputClass} />
            </div>
            <div>
              <label className={labelClass} htmlFor="agent-fee">
                월 매출 (원)
              </label>
              <input
                type="number"
                id="agent-fee"
                name="monthly_fee"
                min={0}
                step={10000}
                defaultValue={0}
                className={inputClass}
              />
            </div>
          </div>
          <div>
            <label className={labelClass} htmlFor="agent-note">
              메모 (선택)
            </label>
            <input
              id="agent-note"
              name="note"
              placeholder="예: 릴스 주 3회 자동 생성"
              className={inputClass}
            />
          </div>
          <button type="submit" className={primaryButtonClass}>
            추가하기
          </button>
        </form>
      </details>

      <ConsolePanel title="에이전트 목록" accent="slate" flush>
        {data.agents.length === 0 ? (
          <p className="px-5 py-10 text-center text-sm text-slate-400">
            등록된 에이전트가 없습니다. 위에서 첫 에이전트를 추가하세요.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100">
            {data.agents.map((agent) => (
              <AgentRow key={agent.id} agent={agent} />
            ))}
          </ul>
        )}
      </ConsolePanel>
    </>
  )
}

function MigrationCard(): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">에이전트 테이블 생성이 필요합니다</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        에이전트 데이터는 Supabase에 저장됩니다. 아래 SQL 파일의 내용을 Supabase 프로젝트의 SQL
        Editor에 붙여넣고 실행하세요.
      </p>
      <pre className="mt-3 overflow-x-auto rounded-lg bg-slate-900 px-4 py-3 text-xs leading-relaxed text-slate-200">
        <code>supabase/marketing-agents.sql</code>
      </pre>
      <p className="mt-3 text-xs text-slate-400">
        실행하면 marketing_agents 테이블과 RLS 정책, 샘플 데이터 4건이 생성됩니다.
      </p>
    </div>
  )
}

function ErrorCard({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-red-50 p-5 ring-1 ring-red-200">
      <h2 className="text-sm font-semibold text-red-800">에이전트 데이터를 불러오지 못했습니다</h2>
      <p className="mt-1 text-sm text-red-600">{message}</p>
    </div>
  )
}
