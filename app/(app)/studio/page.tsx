import Link from 'next/link'

import { KimChatClient } from '@/app/(app)/hub/ai-team/kim-sahyun/KimChatClient'
import { StudioEditor } from '@/components/StudioEditor'
import { StudioReportPanel } from '@/components/StudioReportPanel'

export default function StudioPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-slate-50">
      <header className="flex items-center gap-2 border-b border-slate-200 bg-white px-4 py-3 pr-14 md:px-6">
        <Link
          href="/hub"
          className="text-lg text-slate-400 hover:text-slate-700"
          aria-label="허브로"
        >
          ←
        </Link>
        <div>
          <p className="text-sm font-semibold text-slate-900">카드레터 스튜디오</p>
          <p className="text-[11px] text-slate-400">사현이랑 같이 인스타 카드뉴스 만들기</p>
        </div>
      </header>
      <div className="flex flex-1 flex-col gap-5 p-4 lg:flex-row lg:items-start lg:gap-6 lg:p-6">
        <div className="w-full lg:flex-1">
          <StudioEditor />
        </div>
        <div className="w-full lg:w-[400px]">
          <StudioReportPanel />
          <KimChatClient />
        </div>
      </div>
    </div>
  )
}
