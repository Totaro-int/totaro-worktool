'use client'

/**
 * 현금 잔고 입력 + 최근 60일 리스트. 절제된 모노톤 + 단일 액센트.
 * 차후 은행 API 붙으면 source 컬럼이 'hana_api' / 'openbanking' 으로 자동 채워짐.
 */
import { useState, useTransition } from 'react'

import Link from 'next/link'

import { deleteSnapshot, recordBalance, type CashSnapshot } from './actions'

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1e8) return `${(n / 1e8).toFixed(2)}억`
  if (Math.abs(n) >= 1e4) return `${(n / 1e4).toFixed(0)}만`
  return n.toLocaleString('ko-KR')
}

function fmtKRWFull(n: number): string {
  return n.toLocaleString('ko-KR')
}

export function CashClient({ initial }: { initial: CashSnapshot[] }): React.JSX.Element {
  const today = new Date().toISOString().slice(0, 10)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState(initial)

  const latest = snapshots[0]
  const prev = snapshots[1]
  const delta = latest && prev ? latest.balance_krw - prev.balance_krw : 0

  async function onSubmit(formData: FormData): Promise<void> {
    setErr(null)
    startTransition(async () => {
      const res = await recordBalance(formData)
      if (!res.ok) {
        setErr(res.error ?? '저장 실패')
        return
      }
      location.reload()
    })
  }

  async function onDelete(id: string): Promise<void> {
    if (!confirm('이 스냅샷을 삭제할까요?')) return
    await deleteSnapshot(id)
    setSnapshots(snapshots.filter((s) => s.id !== id))
  }

  return (
    <main className="mx-auto max-w-3xl px-8 py-12">
      <header className="mb-10 flex items-end justify-between border-b border-slate-200 pb-6">
        <div>
          <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">Cash</p>
          <h1 className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-slate-900">
            잔고 일지
          </h1>
          <p className="mt-3 text-xs text-slate-500">
            매일 한 줄. 같은 날 다시 입력하면 덮어씁니다.
          </p>
        </div>
        <Link
          href="/hub"
          className="rounded-md px-3 py-1.5 text-xs font-medium text-slate-500 transition-colors hover:text-slate-900"
        >
          허브
        </Link>
      </header>

      {latest ? (
        <section className="mb-10 overflow-hidden rounded-xl border border-slate-200 bg-slate-900 text-white">
          <div className="px-7 py-7">
            <div className="flex items-baseline justify-between">
              <p className="text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
                오늘 가용 현금
              </p>
              <p className="text-[10px] font-medium tracking-[0.18em] text-slate-500 uppercase tabular-nums">
                {latest.as_of_date}
              </p>
            </div>
            <p className="mt-4 flex items-baseline gap-1.5 text-[42px] leading-none font-semibold tracking-tight tabular-nums">
              <span className="text-slate-500">₩</span>
              <span>{fmtKRWFull(latest.balance_krw)}</span>
            </p>
            {prev ? (
              <p className="mt-3 text-xs text-slate-400">
                <span className="text-slate-500">전일 대비</span>{' '}
                <span
                  className={`font-medium tabular-nums ${
                    delta > 0 ? 'text-emerald-300' : delta < 0 ? 'text-rose-300' : 'text-slate-400'
                  }`}
                >
                  {delta > 0 ? '+' : delta < 0 ? '−' : ''}₩{fmtKRW(Math.abs(delta))}
                </span>
                <span className="ml-2 text-slate-500">({prev.as_of_date})</span>
              </p>
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="mb-12 rounded-xl border border-slate-200 bg-white p-6">
        <p className="mb-4 text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
          새 기록
        </p>
        <form action={onSubmit} className="grid grid-cols-1 gap-x-5 gap-y-4 sm:grid-cols-2">
          <Field name="as_of_date" label="기준일" type="date" defaultValue={today} required />
          <Field
            name="balance_krw"
            label="잔고 (원)"
            type="text"
            inputMode="numeric"
            placeholder="예: 125000000"
            required
          />
          <Field name="bank_name" label="은행" defaultValue="하나은행" />
          <Field name="account_alias" label="계좌 별칭" placeholder="예: 주거래" />
          <div className="sm:col-span-2">
            <Field name="note" label="메모" placeholder="예: 매입대금 결제 후" />
          </div>
          <div className="flex items-center justify-between gap-3 pt-1 sm:col-span-2">
            <p className="text-[11px] text-rose-500">{err ?? ''}</p>
            <button
              type="submit"
              disabled={pending}
              className="rounded-md bg-slate-900 px-4 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-700 disabled:opacity-50"
            >
              {pending ? '저장 중' : '저장'}
            </button>
          </div>
        </form>
      </section>

      <section>
        <p className="mb-4 text-[10px] font-medium tracking-[0.3em] text-slate-400 uppercase">
          최근 기록
        </p>
        {snapshots.length === 0 ? (
          <p className="rounded-xl border border-dashed border-slate-200 px-4 py-10 text-center text-xs text-slate-400">
            아직 기록이 없습니다.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-xl border border-slate-200 bg-white">
            {snapshots.map((s, i) => {
              const nx = snapshots[i + 1]
              const d = nx ? s.balance_krw - nx.balance_krw : 0
              return (
                <li
                  key={s.id}
                  className="group flex items-center justify-between gap-4 px-5 py-3.5 text-sm transition-colors hover:bg-slate-50/60"
                >
                  <div className="min-w-0">
                    <p className="text-[13px] font-medium text-slate-800 tabular-nums">
                      {s.as_of_date}
                      {s.account_alias ? (
                        <span className="ml-2 text-[11px] font-normal text-slate-400">
                          {s.account_alias}
                        </span>
                      ) : null}
                    </p>
                    {s.note ? <p className="mt-0.5 text-[11px] text-slate-500">{s.note}</p> : null}
                  </div>
                  <div className="text-right">
                    <p className="text-[13px] font-semibold text-slate-900 tabular-nums">
                      ₩{fmtKRWFull(s.balance_krw)}
                    </p>
                    {nx && d !== 0 ? (
                      <p
                        className={`text-[10px] tabular-nums ${
                          d > 0 ? 'text-emerald-600' : 'text-rose-500'
                        }`}
                      >
                        {d > 0 ? '+' : '−'}₩{fmtKRW(Math.abs(d))}
                      </p>
                    ) : nx ? (
                      <p className="text-[10px] text-slate-300">변동 없음</p>
                    ) : null}
                  </div>
                  <button
                    onClick={() => onDelete(s.id)}
                    className="ml-1 text-slate-300 opacity-0 transition-opacity group-hover:opacity-100 hover:text-rose-500"
                    title="삭제"
                    aria-label="삭제"
                  >
                    <svg
                      width="14"
                      height="14"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
                    </svg>
                  </button>
                </li>
              )
            })}
          </ul>
        )}
      </section>
    </main>
  )
}

function Field({
  name,
  label,
  ...rest
}: {
  name: string
  label: string
} & React.InputHTMLAttributes<HTMLInputElement>): React.JSX.Element {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[10px] font-medium tracking-[0.2em] text-slate-400 uppercase">
        {label}
      </span>
      <input
        name={name}
        {...rest}
        className="w-full rounded-md border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 transition-colors placeholder:text-slate-300 focus:border-slate-400 focus:outline-none"
      />
    </label>
  )
}
