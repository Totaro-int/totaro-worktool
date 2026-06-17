import type { JSX } from 'react'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { EmptyState } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

export const dynamic = 'force-dynamic'

type AgentRow = {
  id: string
  slug: string
  name: string
  department: string | null
  role_description: string | null
  model: string | null
  status: string
  created_at: string
}

type ActionRow = {
  id: string
  action: string
  target_table: string | null
  summary: string
  success: boolean
  created_at: string
}

type MemoryRow = {
  id: string
  scope: string
  kind: string
  content: string
  source_table: string | null
  confidence: number
  created_at: string
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<{ title: string }> {
  const { slug } = await params
  const supabase = await createClient()
  const { data } = await supabase.from('agents').select('name').eq('slug', slug).maybeSingle()
  return { title: `${(data as { name: string } | null)?.name ?? 'AI 직원'} · AI부서` }
}

/** MCP tool 이름 → 사람이 읽는 한국어 라벨. */
function actionLabel(action: string): string {
  const map: Record<string, string> = {
    memory_write: '기억 저장',
    entity_link: '엔티티 연결',
    mailroom_upload: '우편실 업로드',
    label_attach: '라벨 부착',
    tasks_create: '할 일 생성',
    mailroom_search: '우편실 검색',
    memory_search: '기억 검색',
  }
  return map[action] ?? action
}

function kindLabel(kind: string): string {
  const map: Record<string, string> = {
    fact: '사실',
    preference: '선호',
    observation: '관찰',
    procedure: '절차',
    insight: '통찰',
  }
  return map[kind] ?? kind
}

function scopeLabel(scope: string): string {
  if (scope === 'company') return '전사 공유'
  if (scope === 'team') return '부서'
  return '개인'
}

/** UTC timestamptz → KST 표기. */
function fmtKST(iso: string): string {
  return new Date(iso).toLocaleString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function fmtDate(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  })
}

function Stat({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-slate-200 bg-white px-4 py-3">
      <p className="text-2xl font-bold text-slate-900 tabular-nums">{value}</p>
      <p className="mt-0.5 text-xs text-slate-400">{label}</p>
    </div>
  )
}

export default async function AgentDashboardPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<JSX.Element> {
  const { slug } = await params
  const supabase = await createClient()

  const { data: agentData } = await supabase
    .from('agents')
    .select('*')
    .eq('slug', slug)
    .maybeSingle()
  const agent = agentData as AgentRow | null
  if (!agent) notFound()

  const [
    { data: actionsData },
    { data: memoriesData },
    { count: actionTotal },
    { count: successTotal },
    { count: memoryTotal },
  ] = await Promise.all([
    supabase
      .from('agent_actions')
      .select('id, action, target_table, summary, success, created_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(50),
    supabase
      .from('agent_memories')
      .select('id, scope, kind, content, source_table, confidence, created_at')
      .eq('agent_id', agent.id)
      .order('created_at', { ascending: false })
      .limit(30),
    supabase
      .from('agent_actions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id),
    supabase
      .from('agent_actions')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id)
      .eq('success', true),
    supabase
      .from('agent_memories')
      .select('id', { count: 'exact', head: true })
      .eq('agent_id', agent.id),
  ])

  const actions = (actionsData ?? []) as ActionRow[]
  const memories = (memoriesData ?? []) as MemoryRow[]
  const total = actionTotal ?? 0
  const successRate = total > 0 ? Math.round(((successTotal ?? 0) / total) * 100) : null
  const lastAt = actions[0]?.created_at ?? null
  // 서버 컴포넌트는 요청당 1회 렌더 — 현재 시각 조회는 의도된 동작
  // eslint-disable-next-line react-hooks/purity
  const workingNow = lastAt ? Date.now() - new Date(lastAt).getTime() < 24 * 60 * 60 * 1000 : false

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 헤더 — AI부서로 되돌아가기 */}
      <header className="border-b border-slate-200 bg-white px-8 py-5">
        <Link
          href="/hub/ai-team"
          className="group inline-flex items-center gap-1.5 rounded-full bg-slate-50 px-3 py-1.5 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-100 hover:text-slate-900"
        >
          <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true">
            ←
          </span>
          AI부서
        </Link>
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <h1 className="text-xl font-semibold text-slate-900">{agent.name}</h1>
          <span className="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
            {agent.department ?? '미배정'}
          </span>
          {workingNow ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-50 px-2.5 py-1 text-[11px] font-semibold text-indigo-600 ring-1 ring-indigo-200">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-indigo-400 opacity-75" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-indigo-500" />
              </span>
              근무 중
            </span>
          ) : (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-medium text-slate-400 ring-1 ring-slate-200">
              <span className="h-2 w-2 rounded-full bg-slate-300" />
              대기 중
            </span>
          )}
        </div>
        {agent.role_description && (
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-500">
            {agent.role_description}
          </p>
        )}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-400">
          <span>
            모델 <span className="font-medium text-slate-600">{agent.model ?? '—'}</span>
          </span>
          <span>근무 시작 {fmtDate(agent.created_at)}</span>
        </div>
        {slug === 'kim-sahyun' && (
          <div className="mt-4 flex flex-wrap gap-2">
            <Link
              href={`/hub/ai-team/${slug}/chat`}
              className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-indigo-700"
            >
              💬 김사현과 대화하기
            </Link>
            <Link
              href="/inbox"
              className="inline-flex items-center gap-1.5 rounded-lg bg-white px-3.5 py-2 text-xs font-medium text-slate-600 ring-1 ring-slate-200 transition-colors hover:bg-slate-50"
            >
              📋 보고서 보기 (우편실)
            </Link>
          </div>
        )}
      </header>

      <main className="mx-auto max-w-4xl px-6 py-8">
        {/* 통계 */}
        <section className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Stat label="총 활동" value={total.toLocaleString('ko-KR')} />
          <Stat label="저장한 지식" value={(memoryTotal ?? 0).toLocaleString('ko-KR')} />
          <Stat label="성공률" value={successRate === null ? '—' : `${successRate}%`} />
          <Stat
            label="마지막 활동"
            value={
              lastAt
                ? new Date(lastAt).toLocaleDateString('ko-KR', {
                    timeZone: 'Asia/Seoul',
                    month: 'long',
                    day: 'numeric',
                  })
                : '—'
            }
          />
        </section>

        {/* 활동 타임라인 */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">활동 타임라인</h2>
          {actions.length === 0 ? (
            <EmptyState message="아직 기록된 활동이 없습니다. 첫 일과를 기다리는 중입니다." />
          ) : (
            <ol className="overflow-hidden rounded-xl border border-slate-200 bg-white">
              {actions.map((a, i) => (
                <li
                  key={a.id}
                  className={`flex gap-3 px-4 py-3 ${i > 0 ? 'border-t border-slate-100' : ''}`}
                >
                  <div className="mt-0.5 flex flex-col items-center">
                    <span
                      className={`h-2 w-2 rounded-full ${a.success ? 'bg-indigo-400' : 'bg-rose-400'}`}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
                        {actionLabel(a.action)}
                      </span>
                      {a.target_table && (
                        <span className="text-[11px] text-slate-400">{a.target_table}</span>
                      )}
                      {!a.success && (
                        <span className="inline-flex items-center rounded-md bg-rose-50 px-2 py-0.5 text-[11px] font-medium text-rose-600">
                          실패
                        </span>
                      )}
                      <span className="ml-auto text-[11px] whitespace-nowrap text-slate-400">
                        {fmtKST(a.created_at)}
                      </span>
                    </div>
                    <p className="mt-1 text-sm leading-snug text-slate-700">{a.summary}</p>
                  </div>
                </li>
              ))}
            </ol>
          )}
        </section>

        {/* 쌓은 지식 */}
        <section className="mt-8">
          <h2 className="mb-3 text-sm font-semibold text-slate-700">쌓은 지식</h2>
          {memories.length === 0 ? (
            <EmptyState message="아직 저장한 지식이 없습니다." />
          ) : (
            <ul className="grid gap-3 sm:grid-cols-2">
              {memories.map((m) => (
                <li key={m.id} className="rounded-xl border border-slate-200 bg-white px-4 py-3">
                  <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {kindLabel(m.kind)}
                    </span>
                    <span className="inline-flex items-center rounded-md bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-500">
                      {scopeLabel(m.scope)}
                    </span>
                    <span className="text-[10px] text-slate-300">
                      신뢰도 {Math.round(m.confidence * 100)}%
                    </span>
                  </div>
                  <p className="line-clamp-4 text-sm leading-snug text-slate-700">{m.content}</p>
                  <p className="mt-1.5 text-[10px] text-slate-400">{fmtKST(m.created_at)}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </main>
    </div>
  )
}
