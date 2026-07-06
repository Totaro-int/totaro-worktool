import {
  PageHeader,
  WorkAreaBadge,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '@/components/ui'
import { TASK_STATUSES, TASK_STATUS_DOT, TASK_STATUS_LABELS } from '@/lib/constants'
import { getLookups } from '@/lib/lookups'
import { createClient } from '@/lib/supabase/server'
import type { Member, Task, TaskStatus, WorkArea } from '@/lib/types'

import { createTask, deleteTask, syncMyTasksToCalendar, updateTaskStatus } from './actions'

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ cal_synced?: string; cal_total?: string }>
}): Promise<React.JSX.Element> {
  const sp = await searchParams
  const calSynced = sp.cal_synced ? Number(sp.cal_synced) : null
  const calTotal = sp.cal_total ? Number(sp.cal_total) : null
  const { members, workAreas, memberById, workAreaById } = await getLookups()
  const supabase = await createClient()
  const { data } = await supabase
    .from('tasks')
    .select('*')
    .order('created_at', { ascending: false })
  const tasks = (data ?? []) as Task[]

  return (
    <>
      <PageHeader title="할 일" description="사업영역별 업무를 계획하고 진행 상황을 추적합니다." />
      <div className="p-8">
        <div className="mx-auto max-w-6xl">
          <details className="mb-6 rounded-xl bg-[#101f38] ring-1 ring-[#1c3556]">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-[#c4d2e4]">
              + 새 할 일 추가
            </summary>
            <form action={createTask} className="space-y-3 border-t border-[#12233c] p-5">
              <div>
                <label className={labelClass} htmlFor="task-title">
                  할 일
                </label>
                <input
                  id="task-title"
                  name="title"
                  required
                  placeholder="예: 6월 브랜딩 콘텐츠 기획"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="task-desc">
                  상세 내용 (선택)
                </label>
                <textarea id="task-desc" name="description" rows={2} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div>
                  <label className={labelClass} htmlFor="task-area">
                    사업영역
                  </label>
                  <select id="task-area" name="work_area_id" className={inputClass}>
                    <option value="">선택 안 함</option>
                    {workAreas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="task-assignee">
                    담당자
                  </label>
                  <select id="task-assignee" name="assignee_id" className={inputClass}>
                    <option value="">미정</option>
                    {members.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="task-due">
                    마감일
                  </label>
                  <input type="date" id="task-due" name="due_date" className={inputClass} />
                </div>
              </div>
              <button type="submit" className={primaryButtonClass}>
                추가하기
              </button>
            </form>
          </details>

          {/* 구글 캘린더 동기화 — 마감일 있는 내 할일을 한 번에 캘린더로 */}
          <div className="mb-6 flex flex-wrap items-center gap-3">
            <form action={syncMyTasksToCalendar}>
              <button
                type="submit"
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#101f38] px-3.5 py-2 text-sm font-medium text-[#c4d2e4] ring-1 ring-[#1c3556] transition-colors hover:bg-[#14263f]"
              >
                📅 내 할일 구글 캘린더에 동기화
              </button>
            </form>
            {calSynced !== null && (
              <span className="text-sm text-[#8ea0b8]">
                {calSynced > 0
                  ? `✅ ${calSynced}개 캘린더에 등록${
                      calTotal && calTotal > calSynced
                        ? ` · ${calTotal - calSynced}개 실패(Google 연결 확인)`
                        : ''
                    }`
                  : calTotal === 0
                    ? '올릴 새 할일이 없어요 (이미 다 동기화됨).'
                    : '동기화 실패 — /contacts 에서 Google 연결을 확인하세요.'}
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {TASK_STATUSES.map((status) => {
              const columnTasks = tasks.filter((t) => t.status === status)
              return (
                <section key={status} className="rounded-xl bg-[#101f38] ring-1 ring-[#1c3556]">
                  <div className="flex items-center gap-2 border-b border-[#12233c] px-4 py-3">
                    <span className={`h-2 w-2 rounded-full ${TASK_STATUS_DOT[status]}`} />
                    <h2 className="text-sm font-semibold text-[#c4d2e4]">
                      {TASK_STATUS_LABELS[status]}
                    </h2>
                    <span className="ml-auto text-xs text-[#6b7c96]">{columnTasks.length}</span>
                  </div>
                  <div className="space-y-2 p-3">
                    {columnTasks.length === 0 ? (
                      <p className="px-2 py-6 text-center text-xs text-[#4a5568]">비어 있음</p>
                    ) : (
                      columnTasks.map((task) => (
                        <TaskCard
                          key={task.id}
                          task={task}
                          area={task.work_area_id ? workAreaById.get(task.work_area_id) : undefined}
                          assignee={task.assignee_id ? memberById.get(task.assignee_id) : undefined}
                        />
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

function TaskCard({
  task,
  area,
  assignee,
}: {
  task: Task
  area?: WorkArea
  assignee?: Member
}): React.JSX.Element {
  return (
    <div className="rounded-lg bg-[#101f38] p-3 ring-1 ring-[#1c3556]">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-[#dbe7f4]">{task.title}</p>
        <form action={deleteTask}>
          <input type="hidden" name="id" value={task.id} />
          <button
            type="submit"
            className="shrink-0 text-xs text-[#4a5568] transition-colors hover:text-red-500"
          >
            삭제
          </button>
        </form>
      </div>
      {task.description && (
        <p className="mt-1 line-clamp-2 text-xs text-[#8ea0b8]">{task.description}</p>
      )}
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <WorkAreaBadge area={area} />
        {assignee && <span className="text-xs text-[#6b7c96]">{assignee.name}</span>}
        {task.due_date && <span className="text-xs text-[#6b7c96]">마감 {task.due_date}</span>}
      </div>
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
    <form action={updateTaskStatus}>
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="status" value={status} />
      <button
        type="submit"
        className={`rounded-md px-2.5 py-1 text-xs font-medium transition-colors ${
          primary
            ? 'bg-[#189ec2] text-white hover:bg-[#35e0ff]'
            : 'bg-[#0c1830] text-[#9fb4d0] hover:bg-[#1c3556]'
        }`}
      >
        {label}
      </button>
    </form>
  )
}
