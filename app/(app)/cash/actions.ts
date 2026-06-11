'use server'

import { revalidatePath } from 'next/cache'

import { createClient } from '@/lib/supabase/server'

export type CashSnapshot = {
  id: string
  as_of_date: string
  balance_krw: number
  bank_name: string | null
  account_alias: string | null
  note: string | null
  source: string
  created_at: string
}

export async function loadSnapshots(limit: number = 60): Promise<CashSnapshot[]> {
  const supabase = await createClient()
  const { data } = await supabase
    .from('cash_snapshots')
    .select('id, as_of_date, balance_krw, bank_name, account_alias, note, source, created_at')
    .order('as_of_date', { ascending: false })
    .limit(limit)
  return (data ?? []) as CashSnapshot[]
}

/** 오늘 자 가용 현금 입력. 같은 날짜 + 별칭이면 덮어씀 (멱등). */
export async function recordBalance(formData: FormData): Promise<{ ok: boolean; error?: string }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '로그인 필요' }

  const balanceRaw = String(formData.get('balance_krw') ?? '').replace(/[^0-9-]/g, '')
  const balance = Number(balanceRaw)
  if (!Number.isFinite(balance)) {
    return { ok: false, error: '잔고 숫자만 입력' }
  }

  const asOf = String(formData.get('as_of_date') ?? '') || new Date().toISOString().slice(0, 10)
  const alias = String(formData.get('account_alias') ?? '').trim() || null
  const bank = String(formData.get('bank_name') ?? '').trim() || '하나은행'
  const note = String(formData.get('note') ?? '').trim() || null

  // 멱등: (as_of_date, account_alias) unique 라 upsert 로 안전 덮어쓰기.
  const { error } = await supabase.from('cash_snapshots').upsert(
    {
      as_of_date: asOf,
      balance_krw: balance,
      bank_name: bank,
      account_alias: alias,
      note,
      source: 'manual',
      recorded_by: user.id,
    },
    { onConflict: 'as_of_date,account_alias' }
  )
  if (error) return { ok: false, error: error.message }

  revalidatePath('/cash')
  revalidatePath('/hub')
  return { ok: true }
}

export async function deleteSnapshot(id: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  await supabase.from('cash_snapshots').delete().eq('id', id)
  revalidatePath('/cash')
  revalidatePath('/hub')
  return { ok: true }
}
