import type { JSX } from 'react'

import { PageHeader } from '@/components/ui'
import { createClient } from '@/lib/supabase/server'

import { loadAssistantHistory } from './actions'
import { AssistantClient } from './AssistantClient'

/** AI 직원 — 우편실(구글 드라이브) 자료를 근거로 자연어 대화. */
export default async function AssistantPage(): Promise<JSX.Element> {
  const supabase = await createClient()
  const [countRes, history] = await Promise.all([
    supabase
      .from('inbox_documents')
      .select('id', { count: 'exact', head: true })
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)'),
    loadAssistantHistory(),
  ])

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <PageHeader title="AI 직원" description="우편실 자료를 근거로 답하는 토타로 AI 동료" />
      <AssistantClient indexedCount={countRes.count ?? 0} initialMessages={history} />
    </div>
  )
}
