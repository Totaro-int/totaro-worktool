import { updateTaskStatus } from '@/app/(app)/tasks/actions'
import { createClient } from '@/lib/supabase/server'
import type { Task, WorkAreaId } from '@/lib/types'

type MemberLite = { id: string; name: string }

/**
 * 한 사업영역의 할 일 목록 + 완료 체크.
 * 허브 영역 페이지(소싱 AI / e커머스 / 마케팅 에이전트) 상단에 둔다.
 * 할 일은 Claude Code 의 `/계획` 슬래시 커맨드로 등록된다.
 */
export async function AreaTaskList({
  workAreaId,
}: {
  workAreaId: WorkAreaId
}): Promise<React.JSX.Element> {
  const supabase = await createClient()
  const [tasksRes, membersRes] = await Promise.all([
    supabase
      .from('tasks')
      .select('*')
      .eq('work_area_id', workAreaId)
      .order('created_at', { ascending: false }),
    supabase.from('members').select('id, name'),
  ])
  const tasks = (tasksRes.data ?? []) as Task[]
  const members = (membersRes.data ?? []) as MemberLite[]
  const nameOf = (id: string | null): string | undefined =>
    id ? members.find((m) => m.id === id)?.name : undefined

  const open = tasks.filter((t) => t.status !== 'done')
  const done = tasks.filter((t) => t.status === 'done')

  return (
    <section className="rounded-xl bg-white p-5 ring-1 ring-slate-200">
      <div className="flex items-center gap-2">
        <h2 className="text-sm font-semibold text-slate-700">이 영역 할 일</h2>
        <span className="rounded-full bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 tabular-nums">
          {open.length}
        </span>
      </div>

      {tasks.length === 0 ? (
        <p className="mt-3 text-sm text-slate-400">
          등록된 할 일이 없습니다. Claude Code에서{' '}
          <code className="rounded bg-slate-100 px-1 py-0.5 font-mono text-xs text-slate-600">
            /계획
          </code>{' '}
          으로 오늘 할 일을 추가하세요.
        </p>
      ) : (
        <>
          {open.length === 0 ? (
            <p className="mt-3 text-sm text-slate-400">진행 중인 할 일이 없습니다.</p>
          ) : (
            <ul className="mt-3 space-y-0.5">
              {open.map((task) => (
                <TaskRow key={task.id} task={task} assignee={nameOf(task.assignee_id)} />
              ))}
            </ul>
          )}
          {done.length > 0 && (
            <details className="mt-2.5 border-t border-slate-100 pt-2.5">
              <summary className="cursor-pointer list-none text-xs font-medium text-slate-400">
                완료 {done.length}건 보기
              </summary>
              <ul className="mt-1.5 space-y-0.5">
                {done.map((task) => (
                  <TaskRow key={task.id} task={task} assignee={nameOf(task.assignee_id)} done />
                ))}
              </ul>
            </details>
          )}
        </>
      )}
    </section>
  )
}

function TaskRow({
  task,
  assignee,
  done,
}: {
  task: Task
  assignee?: string
  done?: boolean
}): React.JSX.Element {
  return (
    <li className="flex items-start gap-2.5 rounded-lg px-2 py-1.5 transition-colors hover:bg-slate-50">
      <form action={updateTaskStatus} className="shrink-0 pt-0.5">
        <input type="hidden" name="id" value={task.id} />
        <input type="hidden" name="status" value={done ? 'todo' : 'done'} />
        <button
          type="submit"
          aria-label={done ? '완료 취소' : '완료로 표시'}
          className={`flex h-[18px] w-[18px] items-center justify-center rounded-full border text-[11px] leading-none transition-colors ${
            done
              ? 'border-emerald-500 bg-emerald-500 text-white'
              : 'border-slate-300 text-transparent hover:border-emerald-400 hover:text-emerald-400'
          }`}
        >
          ✓
        </button>
      </form>
      <div className="min-w-0 flex-1">
        <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-800'}`}>
          {task.title}
        </p>
        {task.description && !done && (
          <p className="mt-0.5 text-xs text-slate-400">{task.description}</p>
        )}
      </div>
      {task.status === 'doing' && (
        <span className="mt-0.5 shrink-0 rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">
          진행 중
        </span>
      )}
      {assignee && <span className="mt-0.5 shrink-0 text-xs text-slate-400">{assignee}</span>}
    </li>
  )
}
