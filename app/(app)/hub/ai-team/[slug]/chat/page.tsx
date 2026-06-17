import type { JSX } from 'react'

import Link from 'next/link'
import { notFound } from 'next/navigation'

import { createClient } from '@/lib/supabase/server'

import { KimChatClient } from '../../kim-sahyun/KimChatClient'

export const dynamic = 'force-dynamic'

/** AI 직원과 1:1 대화. v1 은 김사현(마케팅 애널리스트)만 지원. */
export default async function AgentChatPage({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<JSX.Element> {
  const { slug } = await params
  // v1: 김사현만 대화창 제공 (나머지는 대시보드로)
  if (slug !== 'kim-sahyun') notFound()

  const supabase = await createClient()
  const { data } = await supabase.from('agents').select('name').eq('slug', slug).maybeSingle()
  const name = (data as { name: string } | null)?.name ?? '김사현'

  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="border-b border-slate-200 bg-white px-6 py-4">
        <Link
          href={`/hub/ai-team/${slug}`}
          className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          <span aria-hidden="true">←</span> {name} 대시보드
        </Link>
        <div className="mt-1 flex items-center gap-2">
          <h1 className="text-lg font-semibold text-slate-900">{name}과 대화</h1>
          <span className="inline-flex items-center rounded-md bg-indigo-50 px-2 py-0.5 text-[11px] font-medium text-indigo-600">
            마케팅 애널리스트
          </span>
        </div>
      </header>
      <KimChatClient />
    </div>
  )
}
