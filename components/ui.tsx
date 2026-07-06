import type { JSX } from 'react'

import type { WorkArea } from '@/lib/types'

// CHIPSET 다크 — 전 페이지 공통 프리미티브. 배경/네비는 app 레이아웃(다크)이 제공.
export const inputClass =
  'w-full rounded-lg border border-[#24405f] bg-[#0c1830] px-3 py-2 text-sm text-[#dbe7f4] outline-none transition-colors placeholder:text-[#5a6c86] focus:border-[#35e0ff] focus:ring-1 focus:ring-[#35e0ff]'

export const labelClass = 'mb-1 block text-xs font-medium text-[#8ea0b8]'

export const primaryButtonClass =
  'rounded-lg bg-[#35e0ff] px-4 py-2 text-sm font-semibold text-[#06222b] shadow-[0_0_16px_rgba(53,224,255,.35)] transition-all hover:bg-[#5fe9ff]'

export function PageHeader({
  title,
  description,
  children,
}: {
  title: string
  description?: string
  children?: React.ReactNode
}): JSX.Element {
  return (
    <header
      className="border-b border-[#1c3556] px-6 py-5 md:px-8"
      style={{ background: 'rgba(8,17,32,.45)' }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-[#dbe7f4]">{title}</h1>
          {description && <p className="mt-1 text-sm text-[#7e8ca0]">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}

export function WorkAreaBadge({ area }: { area?: WorkArea }): JSX.Element {
  if (!area) {
    return (
      <span className="inline-flex items-center rounded-full bg-[#14263f] px-2 py-0.5 text-xs font-medium text-[#8ea0b8]">
        영역 미지정
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${area.color}26`, color: area.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
      {area.name}
    </span>
  )
}

export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-[#24405f] bg-[#0c1830]/40 px-6 py-16 text-center text-sm text-[#6b7c96]">
      {message}
    </div>
  )
}
