export type WorkAreaId = 'ai_branding' | 'b2b_sourcing' | 'ai_agent'
export type TaskStatus = 'todo' | 'doing' | 'done'
export type ActivitySource = 'manual' | 'github' | 'naver' | 'document' | 'task'

export type Member = {
  id: string
  email: string
  name: string
  avatar_url: string | null
  created_at: string
}

export type WorkArea = {
  id: WorkAreaId
  name: string
  color: string
  sort_order: number
}

export type Task = {
  id: string
  title: string
  description: string | null
  work_area_id: WorkAreaId | null
  assignee_id: string | null
  status: TaskStatus
  start_date: string | null
  due_date: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

export type Activity = {
  id: string
  member_id: string | null
  work_area_id: WorkAreaId | null
  source: ActivitySource
  title: string
  description: string | null
  url: string | null
  metadata: Record<string, unknown>
  occurred_at: string
  created_at: string
}

export type DocumentRow = {
  id: string
  name: string
  storage_path: string
  work_area_id: WorkAreaId | null
  description: string | null
  file_size: number | null
  mime_type: string | null
  uploaded_by: string | null
  created_at: string
}
