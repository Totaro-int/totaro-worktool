/**
 * /design — CHIPSET 디자인 시스템 갤러리 (A0 승인 게이트).
 *
 * 비인증 공개: 실데이터가 전혀 없는 컴포넌트 쇼케이스라 안전하다.
 * 여기서 룩을 확정(사장 승인)한 뒤에만 A1(앱 셸)부터 실제 화면에 확산한다.
 */
import type { JSX } from 'react'

import {
  ChipBadge,
  ChipPanel,
  ChipsetTheme,
  DataReadout,
  GlowButton,
  MonoLabel,
  StatusLED,
  TraceDivider,
} from '@/components/chipset'

import type { Metadata } from 'next'

export const metadata: Metadata = { title: 'CHIPSET — 디자인 시스템 · Totaro' }

const SWATCHES: { name: string; varName: string }[] = [
  { name: 'Substrate', varName: '--chip-bg' },
  { name: 'Panel', varName: '--chip-panel' },
  { name: 'Panel Hi', varName: '--chip-panel-hi' },
  { name: 'Line', varName: '--chip-line' },
  { name: 'Metal', varName: '--chip-metal' },
  { name: 'Cyan', varName: '--chip-cyan' },
  { name: 'Amber', varName: '--chip-amber' },
  { name: 'Emerald', varName: '--chip-emerald' },
  { name: 'Rose', varName: '--chip-rose' },
  { name: 'Violet', varName: '--chip-violet' },
]

export default function DesignGalleryPage(): JSX.Element {
  return (
    <ChipsetTheme className="chip-scanlines min-h-screen">
      <main className="mx-auto max-w-5xl px-6 py-14">
        {/* 헤더 */}
        <header className="mb-10">
          <div className="flex items-center gap-3">
            <StatusLED tone="accent" pulse />
            <MonoLabel tone="accent">TOTARO WORKTOOL · DESIGN SYSTEM v2</MonoLabel>
          </div>
          <h1 className="mt-3 font-mono text-4xl font-bold tracking-tight">
            CHIPSET<span style={{ color: 'var(--chip-cyan)' }}>_</span>
          </h1>
          <p className="mt-3 max-w-xl text-sm leading-relaxed" style={{ color: 'var(--chip-dim)' }}>
            신시대 반도체 모듈 테마 — 다크 기판 위에 칩 패널·네온 회로·상태광으로 팀의 시스템을
            표현한다. 이 갤러리에서 룩이 승인되면 허브부터 전 화면에 적용된다.
          </p>
        </header>

        <TraceDivider className="mb-10" />

        {/* 컬러 토큰 */}
        <ChipPanel label="COLOR / TOKENS" tone="accent" notch className="mb-6">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            {SWATCHES.map((s) => (
              <div key={s.varName}>
                <div
                  className="h-14 rounded-md border"
                  style={{ background: `var(${s.varName})`, borderColor: 'var(--chip-line)' }}
                />
                <p className="mt-1.5 font-mono text-[10px]" style={{ color: 'var(--chip-dim)' }}>
                  {s.name}
                </p>
              </div>
            ))}
          </div>
        </ChipPanel>

        {/* 상태 시스템 + 리드아웃 */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <ChipPanel label="STATUS / LED" className="h-full">
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <StatusLED tone="idle" /> <span className="text-sm">할 일 (idle)</span>
                <ChipBadge className="ml-auto">TODO</ChipBadge>
              </div>
              <div className="flex items-center gap-3">
                <StatusLED tone="busy" pulse /> <span className="text-sm">진행 중 (busy)</span>
                <ChipBadge tone="busy" className="ml-auto">
                  DOING
                </ChipBadge>
              </div>
              <div className="flex items-center gap-3">
                <StatusLED tone="ok" /> <span className="text-sm">완료 (ok)</span>
                <ChipBadge tone="ok" className="ml-auto">
                  DONE
                </ChipBadge>
              </div>
              <div className="flex items-center gap-3">
                <StatusLED tone="err" pulse /> <span className="text-sm">오류 (err)</span>
                <ChipBadge tone="err" className="ml-auto">
                  ALERT
                </ChipBadge>
              </div>
            </div>
          </ChipPanel>

          <ChipPanel label="DATA / READOUT" tone="ok" className="h-full">
            <div className="grid grid-cols-2 gap-6">
              <DataReadout label="오늘 할일" value="12" unit="건" />
              <DataReadout label="진행 중" value="04" unit="건" tone="busy" />
              <DataReadout label="가용 현금" value="82.4" unit="M₩" tone="ok" />
              <DataReadout label="미확인 알림" value="03" unit="건" tone="err" />
            </div>
          </ChipPanel>
        </div>

        {/* 버튼·뱃지 */}
        <ChipPanel label="CONTROL / ACTIONS" className="mb-6">
          <div className="flex flex-wrap items-center gap-3">
            <GlowButton>실행</GlowButton>
            <GlowButton tone="ok">저장</GlowButton>
            <GlowButton tone="busy">일시정지</GlowButton>
            <GlowButton ghost>취소</GlowButton>
            <span className="mx-2 h-5 w-px" style={{ background: 'var(--chip-line)' }} />
            <ChipBadge tone="accent">MARKETING</ChipBadge>
            <ChipBadge tone="ok">SYNCED</ChipBadge>
            <ChipBadge tone="busy">PENDING</ChipBadge>
          </div>
        </ChipPanel>

        {/* 실전 목업 — 할일 카드 / AI 직원 모듈 */}
        <div className="mb-6 grid gap-6 sm:grid-cols-2">
          <ChipPanel label="MOCK / TASK CARD" tilt notch>
            <div className="space-y-3">
              <div className="flex items-start justify-between gap-3">
                <p className="text-sm font-medium">협탁 상세페이지 카피 마감</p>
                <ChipBadge tone="busy">D-1</ChipBadge>
              </div>
              <p className="text-xs leading-relaxed" style={{ color: 'var(--chip-dim)' }}>
                철학+증거 구조로 재작성 — 인터뷰 인용 2건, 스펙 표, FAQ 5.
              </p>
              <div className="flex items-center gap-2.5">
                <StatusLED tone="busy" pulse />
                <MonoLabel tone="busy">IN PROGRESS</MonoLabel>
                <span
                  className="ml-auto font-mono text-[10px]"
                  style={{ color: 'var(--chip-faint)' }}
                >
                  담당 · 윤태준
                </span>
              </div>
            </div>
          </ChipPanel>

          <ChipPanel label="MOCK / AI EMPLOYEE" tone="ok" tilt notch>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-md font-mono text-sm font-bold"
                  style={{
                    color: 'var(--chip-cyan)',
                    border: '1px solid var(--chip-line)',
                    background: 'var(--chip-bg-deep)',
                    boxShadow: '0 0 16px rgba(47,224,255,.15) inset',
                  }}
                >
                  KIM
                </div>
                <div>
                  <p className="text-sm font-medium">김사현 — 마케팅 분석가</p>
                  <MonoLabel tone="ok">ONLINE · DAILY 08:00</MonoLabel>
                </div>
              </div>
              <TraceDivider />
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--chip-dim)' }}>
                  오늘 보고서
                </span>
                <ChipBadge tone="ok">도착</ChipBadge>
              </div>
            </div>
          </ChipPanel>
        </div>

        {/* 캘린더 칩 행 목업 */}
        <ChipPanel label="MOCK / CALENDAR STRIP" className="mb-10">
          <div className="grid grid-cols-7 gap-1.5">
            {['06', '07', '08', '09', '10', '11', '12'].map((d, i) => (
              <div
                key={d}
                className="rounded-md border px-2 py-2 text-center"
                style={{
                  borderColor: i === 2 ? 'var(--chip-cyan)' : 'var(--chip-line)',
                  background: i === 2 ? 'rgba(47,224,255,.06)' : 'var(--chip-bg-deep)',
                  boxShadow: i === 2 ? '0 0 12px rgba(47,224,255,.12)' : undefined,
                }}
              >
                <p className="font-mono text-xs font-bold">{d}</p>
                <div className="mt-1.5 flex items-center justify-center gap-1">
                  {i === 1 && <StatusLED tone="idle" className="h-1.5 w-1.5" />}
                  {i === 2 && <StatusLED tone="busy" pulse className="h-1.5 w-1.5" />}
                  {i === 4 && <StatusLED tone="ok" className="h-1.5 w-1.5" />}
                </div>
              </div>
            ))}
          </div>
        </ChipPanel>

        <footer className="flex items-center justify-between">
          <MonoLabel>© TOTARO INTERNATIONAL — INTERNAL DESIGN PREVIEW</MonoLabel>
          <MonoLabel tone="accent">A0 · AWAITING APPROVAL</MonoLabel>
        </footer>
      </main>
    </ChipsetTheme>
  )
}
