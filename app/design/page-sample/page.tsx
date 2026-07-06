/**
 * /design/page-sample — 다크 전환된 "잎 페이지"가 실제로 어떻게 보이는지 검증용 공개 목업.
 * 실제 components/ui.tsx 프리미티브 + 스윕에 쓴 것과 동일한 다크 클래스로 할일 페이지를 재현.
 * 인증 페이지를 로컬에서 못 보므로, 이걸로 대비(contrast) 문제를 배포 전에 잡는다.
 */
import type { JSX } from 'react'

import {
  EmptyState,
  PageHeader,
  WorkAreaBadge,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '@/components/ui'

const sampleArea = { id: '1', name: '마케팅', color: '#ff3d9a' } as unknown as Parameters<
  typeof WorkAreaBadge
>[0]['area']

export default function PageSample(): JSX.Element {
  return (
    <div className="min-h-screen" style={{ background: '#081120', color: '#c9d6e8' }}>
      <PageHeader title="할 일" description="사업영역별 업무를 계획하고 진행 상황을 추적합니다.">
        <button className={primaryButtonClass}>+ 새 할 일</button>
      </PageHeader>
      <div className="p-8">
        <div className="mx-auto max-w-6xl">
          {/* 폼 카드 */}
          <div className="mb-6 rounded-xl bg-[#101f38] p-5 ring-1 ring-[#1c3556]">
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
              <div>
                <label className={labelClass}>할 일</label>
                <input className={inputClass} placeholder="예: 6월 브랜딩 콘텐츠 기획" />
              </div>
              <div>
                <label className={labelClass}>담당자</label>
                <select className={inputClass}>
                  <option>윤태준</option>
                </select>
              </div>
              <div>
                <label className={labelClass}>마감일</label>
                <input type="date" className={inputClass} />
              </div>
            </div>
          </div>

          {/* 상태 컬럼 */}
          <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
            {[
              { label: '할 일', dot: 'bg-slate-400', n: 2 },
              { label: '진행 중', dot: 'bg-amber-400', n: 1 },
              { label: '완료', dot: 'bg-emerald-400', n: 3 },
            ].map((col) => (
              <section key={col.label} className="rounded-xl bg-[#101f38] ring-1 ring-[#1c3556]">
                <div className="flex items-center gap-2 border-b border-[#12233c] px-4 py-3">
                  <span className={`h-2 w-2 rounded-full ${col.dot}`} />
                  <h2 className="text-sm font-semibold text-[#c4d2e4]">{col.label}</h2>
                  <span className="ml-auto text-xs text-[#6b7c96]">{col.n}</span>
                </div>
                <div className="space-y-2 p-3">
                  {col.label === '완료' ? (
                    <EmptyState message="비어 있음" />
                  ) : (
                    <>
                      <div className="rounded-lg bg-[#101f38] p-3 ring-1 ring-[#1c3556]">
                        <div className="flex items-start justify-between gap-2">
                          <p className="text-sm font-medium text-[#dbe7f4]">
                            협탁 상세페이지 카피 마감
                          </p>
                          <button className="shrink-0 text-xs text-[#4a5568] hover:text-red-500">
                            삭제
                          </button>
                        </div>
                        <p className="mt-1 line-clamp-2 text-xs text-[#8ea0b8]">
                          철학+증거 구조로 재작성 — 인터뷰 인용 2건, 스펙 표, FAQ 5.
                        </p>
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1">
                          <WorkAreaBadge area={sampleArea} />
                          <span className="text-xs text-[#6b7c96]">윤태준</span>
                          <span className="text-xs text-[#6b7c96]">마감 2026-07-08</span>
                        </div>
                        <div className="mt-3 flex flex-wrap gap-1.5">
                          <button className="rounded-md bg-[#0c1830] px-2.5 py-1 text-xs font-medium text-[#9fb4d0] hover:bg-[#14263f]">
                            ← 이전
                          </button>
                          <button className="rounded-md bg-[#189ec2] px-2.5 py-1 text-xs font-medium text-white hover:bg-[#35e0ff]">
                            시작 →
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </section>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
