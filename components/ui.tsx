import type { JSX } from 'react'

import Link from 'next/link'

import type { WorkArea } from '@/lib/types'

export const inputClass =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition-colors focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500'

export const labelClass = 'mb-1 block text-xs font-medium text-slate-600'

export const primaryButtonClass =
  'rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-700'

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
    <header className="border-b border-slate-200 bg-white px-8 py-5">
      <Link
        href="/hub"
        className="group inline-flex items-center gap-1.5 text-xs font-medium text-slate-400 transition-colors hover:text-indigo-600"
      >
        <span className="transition-transform group-hover:-translate-x-0.5" aria-hidden="true">
          ←
        </span>
        워크 허브
      </Link>
      <div className="mt-2.5 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-slate-900">{title}</h1>
          {description && <p className="mt-1 text-sm text-slate-500">{description}</p>}
        </div>
        {children}
      </div>
    </header>
  )
}

export function WorkAreaBadge({ area }: { area?: WorkArea }): JSX.Element {
  if (!area) {
    return (
      <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-500">
        영역 미지정
      </span>
    )
  }
  return (
    <span
      className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium"
      style={{ backgroundColor: `${area.color}1a`, color: area.color }}
    >
      <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: area.color }} />
      {area.name}
    </span>
  )
}

export function EmptyState({ message }: { message: string }): JSX.Element {
  return (
    <div className="rounded-xl border border-dashed border-slate-300 bg-white/50 px-6 py-16 text-center text-sm text-slate-400">
      {message}
    </div>
  )
}
