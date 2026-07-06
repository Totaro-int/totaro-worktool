import Link from 'next/link'

import { StudioWorkspace } from '@/components/StudioWorkspace'

export default function StudioPage(): React.JSX.Element {
  return (
    <div className="flex min-h-screen flex-col bg-[#0c1830]">
      <header className="flex items-center gap-2 border-b border-[#1c3556] bg-[#101f38] px-4 py-3 pr-14 md:px-6">
        <Link
          href="/hub"
          className="text-lg text-[#6b7c96] hover:text-[#c4d2e4]"
          aria-label="허브로"
        >
          ←
        </Link>
        <div>
          <p className="text-sm font-semibold text-[#dbe7f4]">카드레터 스튜디오</p>
          <p className="text-[11px] text-[#6b7c96]">사현이랑 같이 인스타 카드뉴스 만들기</p>
        </div>
      </header>
      <StudioWorkspace />
    </div>
  )
}
