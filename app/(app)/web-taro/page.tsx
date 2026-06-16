import { PageHeader, inputClass, labelClass, primaryButtonClass } from '@/components/ui'
import { TASK_STATUSES, TASK_STATUS_DOT, TASK_STATUS_LABELS } from '@/lib/constants'
import { createClient } from '@/lib/supabase/server'
import type { TaskStatus, WebTaroTask } from '@/lib/types'

import { createWebTaroTask, deleteWebTaroTask, updateWebTaroTaskStatus } from './actions'

/** WEB-taro 의 변하지 않는 목표 — 늘 화면 위쪽에 떠 있는 북극성. */
const GOALS: { label: string; detail: string }[] = [
  {
    label: '식품 중소 제조업체의 DX · AX 혁신',
    detail: '데이터·AI 로 영세 제조 현장의 일하는 방식을 바꾼다',
  },
  {
    label: '제조업체의 매출 증대',
    detail: 'POC 를 실제 바이어 연결·판매로 이어 매출로 증명한다',
  },
]

/** 07.30 까지의 POC 핵심 지표 (MissionBanner 와 동일 기준). */
const POC_KPI = { label: '건강식품 바이어 연결', target: '3건', deadline: '~ 07.30' }

export default async function WebTaroPage(): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('web_taro_tasks')
    .select('*')
    .order('due_date', { ascending: true, nullsFirst: false })
  const tasks = (data ?? []) as WebTaroTask[]

  // 마감 임박도 계산용 — 자정 기준 오늘.
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  return (
    <>
      <PageHeader
        title="WEB-taro"
        description="식품 중소 제조업체 DX·AX 혁신을 위한 목표 보드 — 기한을 정하고 끝까지 추적합니다."
      />

      {/* 북극성: 스크롤해도 늘 보이는 목표 띠 */}
      <div className="sticky top-0 z-10 border-b border-slate-200 bg-white/90 backdrop-blur">
        <div className="mx-auto max-w-6xl px-8 py-5">
          <div className="overflow-hidden rounded-2xl bg-gradient-to-br from-indigo-600 via-indigo-600 to-violet-600 p-[1px] shadow-sm">
            <div className="rounded-2xl bg-slate-950 px-6 py-5">
              <p className="text-[10px] font-semibold tracking-[0.3em] text-indigo-300 uppercase">
                Our North Star · 우리가 이루려는 것
              </p>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                {GOALS.map((g, i) => (
                  <div key={g.label} className="flex gap-3">
                    <span className="mt-0.5 text-lg font-bold text-indigo-400 tabular-nums">
                      0{i + 1}
                    </span>
                    <div>
                      <p className="text-[15px] leading-snug font-bold text-white">{g.label}</p>
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-400">{g.detail}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-3">
                <span className="text-[10px] font-semibold tracking-[0.18em] text-slate-500 uppercase">
                  POC KPI
                </span>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-white">
                  {POC_KPI.label}
                  <span className="font-bold text-indigo-300">{POC_KPI.target}</span>
                </span>
                <span className="ml-auto text-[11px] font-medium tracking-wide text-slate-400">
                  {POC_KPI.deadline}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="p-8">
        <div className="mx-auto max-w-6xl">
          <details className="mb-6 rounded-xl bg-white ring-1 ring-slate-200">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-slate-700">
              + 새 목표 할 일 추가
            </summary>
            <form action={createWebTaroTask} className="space-y-3 border-t border-slate-100 p-5">
              <div>
                <label className={labelClass} htmlFor="wt-title">
                  할 일
                </label>
                <input
                  id="wt-title"
                  name="title"
                  required
                  placeholder="예: 건강식품 제조사 5곳 콜드메일 발송"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="wt-desc">
                  상세 내용 (선택)
                </label>
                <textarea id="wt-desc" name="description" rows={2} className={inputClass} />
              </div>
              <div className="max-w-xs">
                <label className={labelClass} htmlFor="wt-due">
                  기한
                </label>
                <input type="date" id="wt-due" name="due_date" className={inputClass} />
              </div>
              <button type="submit" className={primaryButtonClass}>
                추가하기
              </button>
            </form>
          </details>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TASK_STATUSES.map((status) => {
              const columnTasks = tasks.filter((t) => t.status === status)
              return (
                <section key={status} className="rounded-xl bg-white ring-1 ring-slate-200">
                  <div className="flex items-center gap-2 border-b border-slate-100 px-4 py-3">
                    <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT[status]}`} />
                    <h2 className="text-sm font-semibold text-slate-700">
                      {TASK_STATUS_LABELS[status]}
                    </h2>
                    <span className="ml-auto text-xs text-slate-400">{columnTasks.length}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {columnTasks.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-slate-300">비어 있음</p>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard key={task.id} task={task} today={today} />
                      ))
                    )}
                  </div>
                </section>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}

/** 기한과 상태로 마감 배지의 문구·색을 정한다. 완료된 할 일엔 임박도 표시 안 함. */
function dueMeta(
  dueDate: string | null,
  status: TaskStatus,
  today: Date
): { text: string; className: string } | null {
  if (!dueDate) return null
  const due = new Date(`${dueDate}T00:00:00`)
  if (Number.isNaN(due.getTime())) return null

  const base = `마감 ${dueDate}`
  if (status === 'done') return { text: base, className: 'text-slate-400' }

  const days = Math.round((due.getTime() - today.getTime()) / 86_400_000)
  if (days < 0) return { text: `${base} · ${-days}일 지남`, className: 'text-rose-600 font-medium' }
  if (days === 0) return { text: `${base} · 오늘`, className: 'text-rose-600 font-medium' }
  if (days <= 3) return { text: `${base} · D-${days}`, className: 'text-amber-600 font-medium' }
  return { text: base, className: 'text-slate-400' }
}

function TaskCard({ task, today }: { task: WebTaroTask; today: Date }): React.JSX.Element {
  const due = dueMeta(task.due_date, task.status, today)
  return (
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{task.title}</p>
        <form action={deleteWebTaroTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="shrink-0 text-xs text-slate-300 transition-colors hover:text-red-500"
          >
            삭제
          </button>
        </form>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-slate-500">{task.description}</p>
      )}
      {due && <p className={`mt-2 text-xs ${due.className}`}>{due.text}</p>}
      <div className="mt-3 flex flex-wrap gap-1.5">
        {task.status !== 'todo' && (
          <MoveButton
            id={task.id}
            status={task.status === 'done' ? 'doing' : 'todo'}
            label="← 이전"
          />
        )}
        {task.status !== 'done' && (
          <MoveButton
            id={task.id}
            status={task.status === 'todo' ? 'doing' : 'done'}
            label={task.status === 'todo' ? '시작 →' : '완료 →'}
            primary
          />
        )}
      </div>
    </div>
  )
}

function MoveButton({
  id,
  status,
  label,
  primary,
}: {
  id: string
  status: TaskStatus
  label: string
  primary?: boolean
}): React.JSX.Element {
  return (
    <form action={updateWebTaroTaskStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          primary
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {label}
      </button>
    </form>
  )
}
