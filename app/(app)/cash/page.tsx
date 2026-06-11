/** 현금 잔고 일지 — 수동 입력 단계. 은행 API 연동 전. */
import type { JSX } from 'react'

import { loadSnapshots } from './actions'
import { CashClient } from './CashClient'

export const dynamic = 'force-dynamic'

export default async function CashPage(): Promise<JSX.Element> {
  const snapshots = await loadSnapshots(60)
  return <CashClient initial={snapshots} />
}
