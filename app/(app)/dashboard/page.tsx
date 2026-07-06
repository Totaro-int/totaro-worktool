import Link from 'next/link'

import {
  EmptyState,
  PageHeader,
  WorkAreaBadge,
  inputClass,
  labelClass,
  primaryButtonClass,
} from '@/components/ui'
import { ACTIVITY_SOURCES, ACTIVITY_SOURCE_META } from '@/lib/constants'
import { timeAgo } from '@/lib/format'
import { getLookups } from '@/lib/lookups'
import { createClient } from '@/lib/supabase/server'
import type { Activity } from '@/lib/types'

import { logActivity } from './actions'

type SearchParams = { area?: string; member?: string; source?: string }

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>
}): Promise<React.JSX.Element> {
  const sp = await searchParams
  const { members, workAreas, memberById, workAreaById } = await getLookups()
  const supabase = await createClient()

  let query = supabase.from('activities').select('*')
  if (sp.area) query = query.eq('work_area_id', sp.area)
  if (sp.member) query = query.eq('member_id', sp.member)
  if (sp.source) query = query.eq('source', sp.source)
  const { data } = await query.order('occurred_at', { ascending: false }).limit(100)
  const activities = (data ?? []) as Activity[]

  const buildHref = (patch: Partial<SearchParams>): string => {
    const merged = { ...sp, ...patch }
    const params = new URLSearchParams()
    if (merged.area) params.set('area', merged.area)
    if (merged.member) params.set('member', merged.member)
    if (merged.source) params.set('source', merged.source)
    const qs = params.toString()
    return qs ? `/dashboard?${qs}` : '/dashboard'
  }

  const hasFilter = Boolean(sp.area || sp.member || sp.source)

  return (
    <>
      <PageHeader title="활동 피드" description="팀이 한 모든 업무가 시간순으로 모입니다." />
      <div className="p-8">
        <div className="mx-auto max-w-3xl">
          <details className="mb-6 rounded-xl bg-[#101f38] ring-1 ring-[#1c3556]">
            <summary className="cursor-pointer list-none px-5 py-3.5 text-sm font-medium text-[#c4d2e4]">
              + 업무 직접 기록하기
            </summary>
            <form action={logActivity} className="space-y-3 border-t border-[#12233c] p-5">
              <div>
                <label className={labelClass} htmlFor="title">
                  무슨 업무를 했나요?
                </label>
                <input
                  id="title"
                  name="title"
                  required
                  placeholder="예: 네이버 스토어 신상품 5개 등록"
                  className={inputClass}
                />
              </div>
              <div>
                <label className={labelClass} htmlFor="description">
                  상세 내용 (선택)
                </label>
                <textarea id="description" name="description" rows={2} className={inputClass} />
              </div>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className={labelClass} htmlFor="work_area_id">
                    사업영역
                  </label>
                  <select id="work_area_id" name="work_area_id" className={inputClass}>
                    <option value="">선택 안 함</option>
                    {workAreas.map((w) => (
                      <option key={w.id} value={w.id}>
                        {w.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className={labelClass} htmlFor="occurred_at">
                    업무 일시 (비우면 지금)
                  </label>
                  <input
                    type="datetime-local"
                    id="occurred_at"
                    name="occurred_at"
                    className={inputClass}
                  />
                </div>
              </div>
              <button type="submit" className={primaryButtonClass}>
                기록하기
              </button>
            </form>
          </details>

          <div className="mb-5 space-y-2">
            <FilterRow label="사업영역">
              <Chip href={buildHref({ area: undefined })} active={!sp.area}>
                전체
              </Chip>
              {workAreas.map((w) => (
                <Chip key={w.id} href={buildHref({ area: w.id })} active={sp.area === w.id}>
                  {w.name}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="멤버">
              <Chip href={buildHref({ member: undefined })} active={!sp.member}>
                전체
              </Chip>
              {members.map((m) => (
                <Chip key={m.id} href={buildHref({ member: m.id })} active={sp.member === m.id}>
                  {m.name}
                </Chip>
              ))}
            </FilterRow>
            <FilterRow label="출처">
              <Chip href={buildHref({ source: undefined })} active={!sp.source}>
                전체
              </Chip>
              {ACTIVITY_SOURCES.map((s) => (
                <Chip key={s} href={buildHref({ source: s })} active={sp.source === s}>
                  {ACTIVITY_SOURCE_META[s].label}
                </Chip>
              ))}
            </FilterRow>
          </div>

          {activities.length === 0 ? (
            <EmptyState
              message={
                hasFilter
                  ? '조건에 맞는 활동이 없습니다.'
                  : '아직 기록된 활동이 없습니다. 위에서 첫 업무를 기록해 보세요.'
              }
            />
          ) : (
            <ul className="space-y-2">
              {activities.map((a) => {
                const member = a.member_id ? memberById.get(a.member_id) : undefined
                const area = a.work_area_id ? workAreaById.get(a.work_area_id) : undefined
                const meta = ACTIVITY_SOURCE_META[a.source]
                return (
                  <li key={a.id} className="rounded-xl bg-[#101f38] p-4 ring-1 ring-[#1c3556]">
                    <div className="flex items-start gap-3">
                      <span
                        className={`mt-0.5 shrink-0 rounded-md px-2 py-1 text-xs font-medium ${meta.badge}`}
                      >
                        {meta.label}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[#dbe7f4]">{a.title}</p>
                        {a.description && (
                          <p className="mt-0.5 text-sm whitespace-pre-wrap text-[#8ea0b8]">
                            {a.description}
                          </p>
                        )}
                        {a.url && (
                          <a
                            href={a.url}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-block text-xs font-medium text-[#35e0ff] hover:underline"
                          >
                            링크 열기 →
                          </a>
                        )}
                        <div className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[#6b7c96]">
                          <span className="font-medium text-[#8ea0b8]">
                            {member?.name ?? '알 수 없음'}
                          </span>
                          <span>·</span>
                          <WorkAreaBadge area={area} />
                          <span>·</span>
                          <span>{timeAgo(a.occurred_at)}</span>
                        </div>
                      </div>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </div>
    </>
  )
}

function FilterRow({
  label,
  children,
}: {
  label: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="w-14 shrink-0 text-xs font-medium text-[#6b7c96]">{label}</span>
      {children}
    </div>
  )
}

function Chip({
  href,
  active,
  children,
}: {
  href: string
  active: boolean
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
        active
          ? 'bg-[#189ec2] text-white'
          : 'bg-[#101f38] text-[#9fb4d0] ring-1 ring-[#1c3556] hover:bg-[#14263f]'
      }`}
    >
      {children}
    </Link>
  )
}
