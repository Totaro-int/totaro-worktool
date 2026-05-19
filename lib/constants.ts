import type { ActivitySource, TaskStatus } from '@/lib/types'

export const TASK_STATUSES: TaskStatus[] = ['todo', 'doing', 'done']

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  todo: '할 일',
  doing: '진행 중',
  done: '완료',
}

export const TASK_STATUS_DOT: Record<TaskStatus, string> = {
  todo: 'bg-slate-400',
  doing: 'bg-amber-500',
  done: 'bg-emerald-500',
}

export const ACTIVITY_SOURCES: ActivitySource[] = ['manual', 'task', 'document', 'github', 'naver']

export const ACTIVITY_SOURCE_META: Record<ActivitySource, { label: string; badge: string }> = {
  manual: { label: '직접 기록', badge: 'bg-slate-100 text-slate-600' },
  task: { label: '완료한 일', badge: 'bg-indigo-100 text-indigo-700' },
  document: { label: '문서', badge: 'bg-amber-100 text-amber-800' },
  github: { label: 'GitHub', badge: 'bg-zinc-900 text-white' },
  naver: { label: '네이버', badge: 'bg-green-100 text-green-700' },
}
