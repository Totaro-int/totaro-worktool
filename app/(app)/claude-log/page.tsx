import { PageHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

type ClaudeLog = {
  id: string
  member: string
  summary: string
  project: string | null
  turn_count: number
  occurred_at: string
}

function fmtDay(iso: string): string {
  return new Date(iso).toLocaleDateString('ko-KR', {
    timeZone: 'Asia/Seoul',
    month: 'long',
    day: 'numeric',
    weekday: 'short',
  })
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('ko-KR', {
    timeZone: 'Asia/Seoul',
    hour: '2-digit',
    minute: '2-digit',
  })
}

export default async function ClaudeLogPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('claude_logs')
    .select('*')
    .order('occurred_at', { ascending: false })
    .limit(200)

  const logs = (data ?? []) as ClaudeLog[]
  const missingTable =
    error != null &&
    (error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache'))

  const groups = new Map<string, ClaudeLog[]>()
  for (const log of logs) {
    const day = fmtDay(log.occurred_at)
    const arr = groups.get(day) ?? []
    arr.push(log)
    groups.set(day, arr)
  }

  return (
    <>
      <PageHeader
        title="Claude 작업 기록"
        description="팀원이 Claude Code로 한 작업이 세션 종료 시 자동으로 기록됩니다."
      />
      <div className="p-8">
        <div className="mx-auto max-w-3xl space-y-6">
          <PlanCard />
          {missingTable && <SetupCard />}
          {!missingTable && error && <ErrorCard message={error.message} />}
          {!missingTable && !error && logs.length === 0 && (
            <p className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center text-sm text-slate-400">
              아직 기록이 없습니다. 훅이 설정되면 세션 종료 시 자동으로 쌓입니다.
            </p>
          )}
          {!missingTable &&
            !error &&
            [...groups.entries()].map(([day, items]) => (
              <section key={day}>
                <h2 className="mb-2 text-xs font-semibold tracking-wide text-slate-400">{day}</h2>
                <ul className="space-y-2">
                  {items.map((log) => (
                    <li key={log.id} className="rounded-xl bg-white p-4 ring-1 ring-slate-200">
                      <div className="flex items-start gap-3">
                        <span className="mt-0.5 shrink-0 rounded-md bg-indigo-50 px-2 py-1 text-xs font-semibold text-indigo-700">
                          {log.member}
                        </span>
                        <div className="min-w-0 flex-1">
                          <LogSummary text={log.summary} />
                          <div className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-slate-400">
                            {log.project && (
                              <>
                                <span>{log.project}</span>
                                <span>·</span>
                              </>
                            )}
                            <span>작업 {log.turn_count}건</span>
                            <span>·</span>
                            <span>{fmtTime(log.occurred_at)}</span>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
        </div>
      </div>
    </>
  )
}

/** 로그 요약 — 첫 줄은 헤드라인, 나머지 줄은 "지시 전체 보기"로 펼친다. */
function LogSummary({ text }: { text: string }): React.JSX.Element {
  const [headline, ...rest] = text.split('\n')
  return (
    <div>
      <p className="text-sm text-slate-800">{headline}</p>
      {rest.length > 0 && (
        <details className="mt-1.5">
          <summary className="cursor-pointer list-none text-xs font-medium text-indigo-500 hover:text-indigo-600">
            상세 보기
          </summary>
          <ul className="mt-1.5 space-y-1 border-l-2 border-slate-100 pl-3">
            {rest.map((line, i) => (
              <li key={i} className="text-xs text-slate-500">
                {line.replace(/^·\s*/, '')}
              </li>
            ))}
          </ul>
        </details>
      )}
    </div>
  )
}

function PlanCard(): React.JSX.Element {
  return (
    <div className="rounded-xl bg-indigo-50 p-5 ring-1 ring-indigo-100">
      <h2 className="text-sm font-semibold text-indigo-900">오늘 업무 계획 세우기</h2>
      <p className="mt-1.5 text-sm leading-relaxed text-indigo-700/80">
        아래 기록으로 어제 한 일을 확인한 뒤, Claude Code에서{' '}
        <code className="rounded bg-white px-1.5 py-0.5 font-mono text-xs text-indigo-700">
          /계획
        </code>{' '}
        을 입력하세요. 어제 기록을 토대로 오늘 할 일을 정리해 각 영역(소싱 AI · e커머스 · 마케팅
        에이전트)에 자동 등록됩니다.
      </p>
    </div>
  )
}

function SetupCard(): React.JSX.Element {
  return (
    <div className="rounded-xl bg-white p-6 ring-1 ring-slate-200">
      <h2 className="text-base font-semibold text-slate-900">기록 테이블 생성이 필요합니다</h2>
      <p className="mt-1.5 text-sm text-slate-500">
        Supabase SQL Editor에서{' '}
        <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
          supabase/claude-logs.sql
        </code>{' '}
        을 실행하세요. 실행하면 claude_logs 테이블과 RLS 정책이 생성됩니다.
      </p>
    </div>
  )
}

function ErrorCard({ message }: { message: string }): React.JSX.Element {
  return (
    <div className="rounded-xl bg-red-50 p-5 ring-1 ring-red-200">
      <h2 className="text-sm font-semibold text-red-800">기록을 불러오지 못했습니다</h2>
      <p className="mt-1 text-sm text-red-600">{message}</p>
    </div>
  )
}
