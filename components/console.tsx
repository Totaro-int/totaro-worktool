import type { ReactNode } from 'react'

type Accent = 'blue' | 'amber' | 'slate' | 'emerald'

const ACCENT_BAR: Record<Accent, string> = {
  blue: 'bg-blue-500',
  amber: 'bg-amber-400',
  slate: 'bg-slate-300',
  emerald: 'bg-emerald-500',
}

/** SF 실험실 톤 배경(아이소 그리드) + 가운데 정렬 컨테이너. 허브 하위 페이지 공용. */
export function ConsoleShell({ children }: { children: ReactNode }): React.JSX.Element {
  return (
    <div
      className="min-h-screen p-8"
      style={{
        backgroundColor: '#f1f4f9',
        backgroundImage:
          'repeating-linear-gradient(30deg, #e4e8f0 0 1.3px, transparent 1.3px 70px), repeating-linear-gradient(-30deg, #e4e8f0 0 1.3px, transparent 1.3px 70px)',
      }}
    >
      <div className="mx-auto max-w-5xl space-y-5">{children}</div>
    </div>
  )
}

/** 단일 지표 계기판. */
export function StatPanel({
  label,
  value,
  sub,
  accent = 'slate',
  note,
}: {
  label: string
  value: string
  sub?: string
  accent?: Accent
  note?: string
}): React.JSX.Element {
  return (
    <div className="relative overflow-hidden rounded-xl bg-[#101f38] p-4 shadow-sm ring-1 ring-[#1c3556]">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${ACCENT_BAR[accent]}`} />
      <p className="font-mono text-[10px] tracking-[0.14em] text-[#6b7c96]">{label}</p>
      <p className="mt-2 text-2xl font-bold text-[#dbe7f4] tabular-nums">{value}</p>
      {sub && <p className="mt-0.5 text-[11px] text-[#6b7c96]">{sub}</p>}
      {note && <p className="mt-1.5 text-[11px] font-medium text-amber-600">{note}</p>}
    </div>
  )
}

/** 콘솔 섹션 패널 — 모노 제목 + 상단 액센트 라인 + 내용. */
export function ConsolePanel({
  title,
  meta,
  accent = 'slate',
  flush,
  children,
}: {
  title: string
  meta?: string
  accent?: Accent
  flush?: boolean
  children: ReactNode
}): React.JSX.Element {
  return (
    <section className="relative overflow-hidden rounded-xl bg-[#101f38] shadow-sm ring-1 ring-[#1c3556]">
      <div className={`absolute inset-x-0 top-0 h-[3px] ${ACCENT_BAR[accent]}`} />
      <div className="flex items-center justify-between border-b border-[#12233c] px-5 py-3">
        <h2 className="font-mono text-[11px] font-semibold tracking-[0.14em] text-[#8ea0b8]">
          {title}
        </h2>
        {meta && <span className="font-mono text-[10px] text-[#6b7c96]">{meta}</span>}
      </div>
      <div className={flush ? '' : 'p-5'}>{children}</div>
    </section>
  )
}
