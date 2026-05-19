'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

/** 네이버 마케팅 KPI(목표 ROAS, %)를 저장한다. */
export async function saveKpi(formData: FormData): Promise<void> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) throw new Error('로그인이 필요합니다.')

  const targetRoas = Number(formData.get('target_roas'))
  if (!Number.isFinite(targetRoas) || targetRoas <= 0) return

  await supabase.from('naver_kpi').upsert({
    id: 1,
    target_roas: targetRoas,
    updated_by: user.id,
    updated_at: new Date().toISOString(),
  })

  revalidatePath('/hub/naver')
}
