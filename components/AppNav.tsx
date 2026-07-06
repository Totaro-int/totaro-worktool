'use client'

/**
 * AppNav — 전역 네비게이션 셸 (CHIPSET 다크 크롬).
 *  - 데스크탑: 상단 바 (로고 + 주요 목적지 + 더보기 + 로그아웃)
 *  - 모바일: 하단 고정 탭 바 (엄지 도달) + '더보기' 시트
 * 추가형(오버레이) — 페이지 본문 레이아웃을 바꾸지 않는다. 콘텐츠 하단 여백은 layout 이 준다.
 * 설계 근거: memory ui-chipset-direction (실용 우선, 폰 우선).
 */
import { useState, type JSX } from 'react'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const CYAN = '#35e0ff'

type Dest = { href: string; label: string; icon: JSX.Element }

function Icon({ d, fill }: { d: string; fill?: boolean }): JSX.Element {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill={fill ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth="1.8"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={d} />
    </svg>
  )
}

// 하단 탭(모바일) 주요 4 + 더보기
const PRIMARY: Dest[] = [
  { href: '/hub', label: '허브', icon: <Icon d="M3 10.5 12 3l9 7.5M5 9v11h14V9" /> },
  { href: '/tasks', label: '할일', icon: <Icon d="M4 6h16M4 12h16M4 18h10" /> },
  { href: '/calendar', label: '캘린더', icon: <Icon d="M4 5h16v16H4zM4 9h16M8 3v4M16 3v4" /> },
  { href: '/inbox', label: '우편함', icon: <Icon d="M3 5h18v14H3zM3 7l9 6 9-6" /> },
]

// 더보기 / 데스크탑 보조 목적지
const SECONDARY: Dest[] = [
  {
    href: '/hub/ai-team',
    label: 'AI부서',
    icon: (
      <Icon d="M12 3a4 4 0 0 1 4 4v1a4 4 0 0 1-8 0V7a4 4 0 0 1 4-4zM5 21v-1a7 7 0 0 1 14 0v1" />
    ),
  },
  { href: '/studio', label: '카드레터 스튜디오', icon: <Icon d="M4 4h16v12H4zM8 20h8M12 16v4" /> },
  { href: '/metrics', label: '우리의 지표', icon: <Icon d="M4 20V10M10 20V4M16 20v-8M22 20H2" /> },
  {
    href: '/cash',
    label: '가용 현금',
    icon: <Icon d="M3 7h18v10H3zM12 12h.01M6 12h.01M18 12h.01" />,
  },
  {
    href: '/contacts',
    label: '회사 연락처',
    icon: (
      <Icon d="M4 5h16v14H4zM9 11a2 2 0 1 0 0-4 2 2 0 0 0 0 4zM6 17c0-2 1.5-3.5 3-3.5s3 1.5 3 3.5M15 9h3M15 13h3" />
    ),
  },
  {
    href: '/claude-log',
    label: '팀 작업 기록',
    icon: <Icon d="M6 3h9l3 3v15H6zM9 8h6M9 12h6M9 16h4" />,
  },
  { href: '/hub/naver', label: '네이버', icon: <Icon d="M7 18V6l10 12V6" /> },
  { href: '/hub/github', label: 'GitHub', icon: <Icon d="M9 7 4 12l5 5M15 7l5 5-5 5" /> },
  {
    href: '/hub/agent',
    label: '에이전트',
    icon: <Icon d="M5 9h14v11H5zM12 4.5V9M9.5 14.5h.01M14.5 14.5h.01" />,
  },
]

function isActive(pathname: string, href: string): boolean {
  if (href === '/hub') return pathname === '/hub'
  return pathname === href || pathname.startsWith(`${href}/`)
}

// 데스크탑 상단 바에 노출할 주요 링크
const DESKTOP_MAIN: Dest[] = [
  ...PRIMARY,
  SECONDARY[0]!, // AI부서
  SECONDARY[1]!, // 스튜디오
  SECONDARY[2]!, // 지표
]

export function AppNav({
  userName,
  logoutAction,
}: {
  userName: string
  logoutAction: () => void
}): JSX.Element {
  const pathname = usePathname() ?? ''
  const [moreOpen, setMoreOpen] = useState(false)

  const barBg = 'rgba(8,17,32,.86)'
  const border = 'rgba(53,224,255,.16)'

  return (
    <>
      {/* ── 데스크탑 상단 바 ── */}
      <nav
        className="sticky top-0 z-40 hidden items-center gap-1 border-b px-4 py-2 backdrop-blur md:flex"
        style={{ background: barBg, borderColor: border, color: '#dbe7f4' }}
      >
        <Link href="/hub" className="mr-2 flex items-center gap-2">
          <span
            className="flex h-7 w-7 items-center justify-center rounded-md font-mono text-xs font-bold"
            style={{
              color: '#06222b',
              background: `linear-gradient(180deg, ${CYAN}, #189ec2)`,
              boxShadow: `0 0 12px ${CYAN}55`,
            }}
          >
            T
          </span>
          <span className="font-mono text-sm font-bold tracking-tight">
            TOTARO<span style={{ color: CYAN }}>·</span>HUB
          </span>
        </Link>
        <div className="flex items-center gap-0.5">
          {DESKTOP_MAIN.map((d) => {
            const active = isActive(pathname, d.href)
            return (
              <Link
                key={d.href}
                href={d.href}
                className="flex items-center gap-1.5 rounded-md px-2.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors"
                style={{
                  color: active ? '#06222b' : '#9fb4d0',
                  background: active ? CYAN : 'transparent',
                }}
              >
                {d.label}
              </Link>
            )
          })}
          <button
            type="button"
            onClick={() => setMoreOpen((v) => !v)}
            className="rounded-md px-2.5 py-1.5 font-mono text-[11px] tracking-wide transition-colors"
            style={{ color: '#9fb4d0' }}
          >
            더보기 ▾
          </button>
        </div>
        <div className="ml-auto flex items-center gap-3 font-mono text-[11px]">
          <span style={{ color: '#4a5568' }}>{userName}</span>
          <form action={logoutAction}>
            <button
              type="submit"
              className="rounded-md border px-2.5 py-1.5 transition-colors hover:brightness-150"
              style={{ borderColor: border, color: '#8ea0b8' }}
            >
              로그아웃
            </button>
          </form>
        </div>

        {/* 데스크탑 더보기 드롭다운 */}
        {moreOpen ? (
          <div
            className="absolute top-full right-4 mt-1 grid w-64 grid-cols-1 gap-0.5 rounded-lg border p-2 shadow-2xl"
            style={{ background: '#0b1a30', borderColor: border }}
          >
            {SECONDARY.map((d) => (
              <Link
                key={d.href}
                href={d.href}
                onClick={() => setMoreOpen(false)}
                className="flex items-center gap-2.5 rounded-md px-2.5 py-2 font-mono text-xs transition-colors hover:brightness-150"
                style={{ color: isActive(pathname, d.href) ? CYAN : '#9fb4d0' }}
              >
                <span style={{ color: isActive(pathname, d.href) ? CYAN : '#5a6c86' }}>
                  {d.icon}
                </span>
                {d.label}
              </Link>
            ))}
          </div>
        ) : null}
      </nav>

      {/* ── 모바일 하단 탭 바 ── */}
      <nav
        className="fixed inset-x-0 bottom-0 z-40 flex items-stretch border-t backdrop-blur md:hidden"
        style={{
          background: barBg,
          borderColor: border,
          paddingBottom: 'env(safe-area-inset-bottom)',
        }}
      >
        {PRIMARY.map((d) => {
          const active = isActive(pathname, d.href)
          return (
            <Link
              key={d.href}
              href={d.href}
              className="flex flex-1 flex-col items-center gap-0.5 py-2"
              style={{ color: active ? CYAN : '#7e8ca0' }}
            >
              {d.icon}
              <span className="font-mono text-[9px] tracking-wide">{d.label}</span>
            </Link>
          )
        })}
        <button
          type="button"
          onClick={() => setMoreOpen(true)}
          className="flex flex-1 flex-col items-center gap-0.5 py-2"
          style={{ color: '#7e8ca0' }}
        >
          <Icon d="M4 6h16M4 12h16M4 18h16" />
          <span className="font-mono text-[9px] tracking-wide">더보기</span>
        </button>
      </nav>

      {/* ── 모바일 더보기 시트 ── */}
      {moreOpen ? (
        <MobileSheet
          onClose={() => setMoreOpen(false)}
          userName={userName}
          logoutAction={logoutAction}
          pathname={pathname}
        />
      ) : null}
    </>
  )
}

function MobileSheet({
  onClose,
  userName,
  logoutAction,
  pathname,
}: {
  onClose: () => void
  userName: string
  logoutAction: () => void
  pathname: string
}): JSX.Element {
  const border = 'rgba(53,224,255,.16)'
  return (
    <div className="fixed inset-0 z-50 md:hidden" role="dialog" aria-modal="true">
      <button
        type="button"
        aria-label="닫기"
        onClick={onClose}
        className="absolute inset-0"
        style={{ background: 'rgba(4,8,16,.7)' }}
      />
      <div
        className="absolute inset-x-0 bottom-0 rounded-t-2xl border-t p-4 pb-8"
        style={{ background: '#0b1a30', borderColor: border, color: '#dbe7f4' }}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full" style={{ background: '#2a3f5f' }} />
        <p className="mb-2 font-mono text-[10px] tracking-widest" style={{ color: '#5a6c86' }}>
          전체 메뉴 · {userName}
        </p>
        <div className="grid grid-cols-3 gap-2">
          {[...PRIMARY, ...SECONDARY].map((d) => (
            <Link
              key={d.href}
              href={d.href}
              onClick={onClose}
              className="flex flex-col items-center gap-1.5 rounded-xl border py-3"
              style={{
                borderColor: isActive(pathname, d.href) ? CYAN : border,
                color: isActive(pathname, d.href) ? CYAN : '#9fb4d0',
                background: 'linear-gradient(180deg,#10203a,#0c1830)',
              }}
            >
              {d.icon}
              <span className="text-center font-mono text-[10px] leading-tight">{d.label}</span>
            </Link>
          ))}
        </div>
        <form action={logoutAction} className="mt-3">
          <button
            type="submit"
            className="w-full rounded-xl border py-3 font-mono text-xs"
            style={{ borderColor: border, color: '#8ea0b8' }}
          >
            로그아웃
          </button>
        </form>
      </div>
    </div>
  )
}
