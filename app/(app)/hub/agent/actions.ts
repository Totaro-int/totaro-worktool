'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import type { SupabaseClient } from '@supabase/supabase-js'

const VALID_STATUS = ['active', 'onboarding', 'paused']

type AgentFields = {
  name: string
  status: string
  client_name: string | null
  monthly_fee: number
  note: string | null
}

/** 인증된 Supabase 클라이언트를 돌려준다. 미인증이면 로그인 화면으로 보낸다. */
async function authed(): Promise<SupabaseClient> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) redirect('/login?error=auth')
  return supabase
}

/** formData 에서 에이전트 입력값을 정규화해 읽는다. */
function readAgentFields(formData: FormData): AgentFields {
  const statusRaw = String(formData.get('status') ?? 'active')
  const status = VALID_STATUS.includes(statusRaw) ? statusRaw : 'active'
  return {
    name: String(formData.get('name') ?? '').trim(),
    status,
    client_name: String(formData.get('client_name') ?? '').trim() || null,
    monthly_fee: Math.max(0, Math.round(Number(formData.get('monthly_fee') ?? 0) || 0)),
    note: String(formData.get('note') ?? '').trim() || null,
  }
}

/** 마케팅 에이전트를 새로 만든다. */
export async function createAgent(formData: FormData): Promise<void> {
  const supabase = await authed()
  const fields = readAgentFields(formData)
  if (!fields.name) return

  const { error } = await supabase.from('marketing_agents').insert(fields)
  if (error) throw new Error(`에이전트 추가 실패: ${error.message}`)

  revalidatePath('/hub/agent')
  revalidatePath('/dashboard')
}

/** 기존 마케팅 에이전트 내용을 수정한다. */
export async function updateAgent(formData: FormData): Promise<void> {
  const supabase = await authed()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const fields = readAgentFields(formData)
  if (!fields.name) return

  const { error } = await supabase.from('marketing_agents').update(fields).eq('id', id)
  if (error) throw new Error(`에이전트 수정 실패: ${error.message}`)

  revalidatePath('/hub/agent')
  revalidatePath('/dashboard')
}

/** 마케팅 에이전트를 삭제한다. */
export async function deleteAgent(formData: FormData): Promise<void> {
  const supabase = await authed()
  const id = String(formData.get('id') ?? '')
  if (!id) return

  const { error } = await supabase.from('marketing_agents').delete().eq('id', id)
  if (error) throw new Error(`에이전트 삭제 실패: ${error.message}`)

  revalidatePath('/hub/agent')
  revalidatePath('/dashboard')
}
