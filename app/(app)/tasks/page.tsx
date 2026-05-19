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

import { createTask, deleteTask, updateTaskStatus } from './actions'

export default async function TasksPage(): Promise<React.JSX.Element> {
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
          <details className="mb-6 rounded-xl bg-white ring-1 ring-slate-200">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-slate-700">
              + 새 할 일 추가
            </summary>
            <form action={createTask} className="space-y-3 border-t border-slate-100 p-5">
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
    <div className="rounded-lg bg-white p-3 ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-slate-900">{task.title}</p>
        <form action={deleteTask}>
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
      <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
        <WorkAreaBadge area={area} />
        {assignee && <span className="text-xs text-slate-400">{assignee.name}</span>}
        {task.due_date && <span className="text-xs text-slate-400">마감 {task.due_date}</span>}
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
            ? 'bg-indigo-600 text-white hover:bg-indigo-700'
            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
        }`}
      >
        {label}
      </button>
    </form>
  )
}
