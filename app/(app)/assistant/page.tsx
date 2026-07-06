import type { JSX } from 'react'

import Link from 'next/link'

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
    <div className="flex min-h-screen flex-col bg-[#0c1830]">
      <PageHeader title="AI 직원" description="우편실 자료를 근거로 답하는 토타로 AI 동료">
        <div className="mt-3 flex gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-lg bg-slate-900 px-3 py-1.5 text-xs font-medium text-white">
            💬 채팅
          </span>
          <Link
            href="/assistant/files"
            className="inline-flex items-center gap-1.5 rounded-lg bg-[#101f38] px-3 py-1.5 text-xs font-medium text-[#c4d2e4] ring-1 ring-[#1c3556] hover:bg-[#14263f]"
          >
            📁 파일 브라우저
          </Link>
        </div>
      </PageHeader>
      <AssistantClient indexedCount={countRes.count ?? 0} initialMessages={history} />
    </div>
  )
}
