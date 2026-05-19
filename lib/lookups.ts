import { createClient } from '@/lib/supabase/server'
import type { Member, WorkArea } from '@/lib/types'

type Lookups = {
  members: Member[]
  workAreas: WorkArea[]
  memberById: Map<string, Member>
  workAreaById: Map<string, WorkArea>
}

/** 멤버 / 사업영역 같은 작은 참조 테이블을 한 번에 조회한다. */
export async function getLookups(): Promise<Lookups> {
  const supabase = await createClient()
  const [membersRes, areasRes] = await Promise.all([
    supabase.from('members').select('*').order('created_at'),
    supabase.from('work_areas').select('*').order('sort_order'),
  ])

  const members = (membersRes.data ?? []) as Member[]
  const workAreas = (areasRes.data ?? []) as WorkArea[]

  return {
    members,
    workAreas,
    memberById: new Map(members.map((m) => [m.id, m])),
    workAreaById: new Map(workAreas.map((w) => [w.id, w])),
  }
}
