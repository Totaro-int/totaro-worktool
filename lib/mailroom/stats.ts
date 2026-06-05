import { createClient } from '@/lib/supabase/server'

export type MailroomData = {
  status: 'ok'
  /** 휴지통·반려를 뺀 '살아있는' 문서 수 (우편실이 정리해 둔 자료의 총량). */
  total: number
  /** 사람 확인 대기 (status='classified') — AI 분류는 끝났고 사람 컨펌만 남은 것. */
  pendingReview: number
  /** 오늘 0시 이후 유입된 문서 수. */
  todayCount: number
  /** Gmail 채널로 들어온 문서 수. */
  gmailCount: number
}

export type MailroomResult =
  | MailroomData
  | { status: 'needs_migration' }
  | { status: 'error'; message: string }

/** /hub 우편실 노드용 — inbox_documents 현황을 Supabase에서 집계한다.
 *  marketing_agents 와 같은 폴백 규약: 테이블 없으면 needs_migration. */
export async function getMailroomData(): Promise<MailroomResult> {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('inbox_documents')
    .select('status, source, created_at')

  if (error) {
    const missingTable =
      error.code === '42P01' ||
      error.code === 'PGRST205' ||
      error.message.includes('does not exist') ||
      error.message.includes('schema cache')
    if (missingTable) return { status: 'needs_migration' }
    return { status: 'error', message: error.message }
  }

  const rows = (data ?? []) as { status: string; source: string | null; created_at: string }[]
  // 휴지통(trashed)·반려(rejected)는 '없는 셈' — 되돌릴 수 있는 소프트 삭제라 집계에서만 뺀다.
  const live = rows.filter((r) => r.status !== 'trashed' && r.status !== 'rejected')

  const startOfToday = new Date()
  startOfToday.setHours(0, 0, 0, 0)

  return {
    status: 'ok',
    total: live.length,
    pendingReview: rows.filter((r) => r.status === 'classified').length,
    todayCount: live.filter((r) => new Date(r.created_at) >= startOfToday).length,
    gmailCount: live.filter((r) => r.source === 'gmail').length,
  }
}
