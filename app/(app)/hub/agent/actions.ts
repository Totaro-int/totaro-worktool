'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

const VALID_STATUS = ['active', 'onboarding', 'paused']

export async function createAgent(formData: FormData): Promise<void> {
  const name = String(formData.get('name') ?? '').trim()
  if (!name) return

  const statusRaw = String(formData.get('status') ?? 'active')
  const status = VALID_STATUS.includes(statusRaw) ? statusRaw : 'active'
  const clientName = String(formData.get('client_name') ?? '').trim() || null
  const monthlyFee = Number(formData.get('monthly_fee') ?? 0) || 0
  const note = String(formData.get('note') ?? '').trim() || null

  const supabase = await createClient()
  const { error } = await supabase.from('marketing_agents').insert({
    name,
    status,
    client_name: clientName,
    monthly_fee: Math.max(0, Math.round(monthlyFee)),
    note,
  })
  if (error) throw error

  revalidatePath('/hub/agent')
}
