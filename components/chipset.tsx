/**
 * CHIPSET — SF 반도체 모듈 디자인 시스템 코어 컴포넌트.
 *
 * 반드시 `<ChipsetTheme>`(또는 .chipset 클래스) 안에서 사용 — 토큰이 그 스코프에 산다.
 * A0: /design 갤러리 전용 → 디자인 승인 후 A1에서 앱 셸에 확산.
 * 전부 서버 컴포넌트(인터랙션은 CSS만) — 가볍고 어디서든 렌더 가능.
 */
import type { JSX, ReactNode } from 'react'

/* 상태 톤 — 워크툴 상태 의미(todo/doing/done/오류)와 1:1 매핑 */
export type ChipTone = 'idle' | 'busy' | 'ok' | 'err' | 'accent'

const TONE_COLOR: Record<ChipTone, string> = {
  idle: 'var(--chip-dim)',
  busy: 'var(--chip-amber)',
  ok: 'var(--chip-emerald)',
  err: 'var(--chip-rose)',
  accent: 'var(--chip-cyan)',
}

/** 테마 래퍼 — 다크 기판 배경 + 토큰 스코프. */
export function ChipsetTheme({
  children,
  className = '',
}: {
  children: ReactNode
  className?: string
}): JSX.Element {
  return <div className={`chipset ${className}`}>{children}</div>
}

/** 마이크로 라벨 — 대문자·자간 넓은 모노 라벨 (칩 실크스크린 마킹 느낌). */
export function MonoLabel({
  children,
  tone = 'idle',
  className = '',
}: {
  children: ReactNode
  tone?: ChipTone
  className?: string
}): JSX.Element {
  return (
    <span
      className={`font-mono text-[10px] tracking-[0.22em] uppercase ${className}`}
      style={{ color: TONE_COLOR[tone] }}
    >
      {children}
    </span>
  )
}

/** 상태 LED — 발광 점. pulse 는 진행 중 상태에. */
export function StatusLED({
  tone = 'idle',
  pulse = false,
  className = '',
}: {
  tone?: ChipTone
  pulse?: boolean
  className?: string
}): JSX.Element {
  return (
    <span
      aria-hidden="true"
      className={`chip-led ${pulse ? 'chip-led--pulse' : ''} inline-block h-2 w-2 flex-none rounded-full ${className}`}
      style={{ color: TONE_COLOR[tone], background: 'currentColor' }}
    />
  )
}

/**
 * 칩 패널 — 컨텐츠 컨테이너. label 주면 실크스크린 헤더(라벨+LED+핀 마킹)가 붙는다.
 * notch: 우상단 칩 노치 컷. tilt: 호버 2.5D 틸트+네온 에지.
 */
export function ChipPanel({
  label,
  tone = 'idle',
  pulse = false,
  notch = false,
  tilt = false,
  className = '',
  children,
}: {
  label?: string
  tone?: ChipTone
  pulse?: boolean
  notch?: boolean
  tilt?: boolean
  className?: string
  children: ReactNode
}): JSX.Element {
  return (
    <section
      className={`chip-panel ${notch ? 'chip-panel--notch' : ''} ${tilt ? 'chip-panel--tilt' : ''} ${className}`}
    >
      {label ? (
        <header
          className="flex items-center gap-2.5 border-b px-4 py-2.5"
          style={{ borderColor: 'var(--chip-line)' }}
        >
          <StatusLED tone={tone} pulse={pulse} />
          <MonoLabel tone={tone === 'idle' ? 'idle' : tone}>{label}</MonoLabel>
          <div className="chip-pins ml-auto w-16" aria-hidden="true" />
        </header>
      ) : null}
      <div className="p-4">{children}</div>
    </section>
  )
}

/** 글로우 버튼 — 주 액션(cyan) / 보조(ghost). */
export function GlowButton({
  children,
  tone = 'accent',
  ghost = false,
  className = '',
  ...rest
}: {
  children: ReactNode
  tone?: ChipTone
  ghost?: boolean
  className?: string
} & React.ButtonHTMLAttributes<HTMLButtonElement>): JSX.Element {
  const c = TONE_COLOR[tone]
  return (
    <button
      type="button"
      {...rest}
      className={`rounded-md px-3.5 py-2 font-mono text-xs tracking-[0.08em] uppercase transition-all ${className}`}
      style={
        ghost
          ? {
              color: 'var(--chip-dim)',
              border: '1px solid var(--chip-line)',
              background: 'transparent',
            }
          : {
              color: '#06222b',
              background: `linear-gradient(180deg, ${c}, color-mix(in srgb, ${c} 78%, #000))`,
              border: `1px solid color-mix(in srgb, ${c} 60%, #000)`,
              boxShadow: `0 0 14px color-mix(in srgb, ${c} 35%, transparent), inset 0 1px 0 rgba(255,255,255,.25)`,
              fontWeight: 700,
            }
      }
    >
      {children}
    </button>
  )
}

/** 칩 뱃지 — 작은 태그(라벨·카테고리). */
export function ChipBadge({
  children,
  tone = 'idle',
  className = '',
}: {
  children: ReactNode
  tone?: ChipTone
  className?: string
}): JSX.Element {
  const c = TONE_COLOR[tone]
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded px-2 py-0.5 font-mono text-[10px] tracking-[0.12em] uppercase ${className}`}
      style={{
        color: c,
        border: `1px solid color-mix(in srgb, ${c} 35%, transparent)`,
        background: `color-mix(in srgb, ${c} 8%, transparent)`,
      }}
    >
      {children}
    </span>
  )
}

/** 회로 트레이스 구분선 — 흐르는 점선 + 비아(단자) 점. */
export function TraceDivider({ className = '' }: { className?: string }): JSX.Element {
  return (
    <svg
      className={`h-3 w-full ${className}`}
      aria-hidden="true"
      preserveAspectRatio="none"
      viewBox="0 0 400 12"
    >
      <circle cx="4" cy="6" r="2.4" fill="var(--chip-metal)" />
      <line
        x1="10"
        y1="6"
        x2="390"
        y2="6"
        stroke="var(--chip-cyan)"
        strokeOpacity="0.5"
        strokeWidth="1.2"
        className="chip-trace"
      />
      <circle cx="396" cy="6" r="2.4" fill="var(--chip-metal)" />
    </svg>
  )
}

/** 데이터 리드아웃 — 계기판 숫자 표시. */
export function DataReadout({
  label,
  value,
  unit,
  tone = 'accent',
  className = '',
}: {
  label: string
  value: string
  unit?: string
  tone?: ChipTone
  className?: string
}): JSX.Element {
  const c = TONE_COLOR[tone]
  return (
    <div className={className}>
      <MonoLabel>{label}</MonoLabel>
      <div className="mt-1 flex items-baseline gap-1.5">
        <span
          className="font-mono text-3xl leading-none font-bold tabular-nums"
          style={{ color: c, textShadow: `0 0 18px color-mix(in srgb, ${c} 45%, transparent)` }}
        >
          {value}
        </span>
        {unit ? (
          <span className="font-mono text-xs" style={{ color: 'var(--chip-dim)' }}>
            {unit}
          </span>
        ) : null}
      </div>
    </div>
  )
}
