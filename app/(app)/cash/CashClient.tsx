'use client'

/**
 * 현금 잔고 입력 + 최근 60일 리스트. 수동 입력 단계 — 차후 은행 API 붙으면
 * source 컬럼이 'hana_api' / 'openbanking' 으로 자동 채워짐.
 */
import { useState, useTransition } from 'react'

import { deleteSnapshot, recordBalance, type CashSnapshot } from './actions'

function fmtKRW(n: number): string {
  if (Math.abs(n) >= 1e8) return `₩${(n / 1e8).toFixed(2)}억`
  if (Math.abs(n) >= 1e4) return `₩${(n / 1e4).toFixed(0)}만`
  return `₩${n.toLocaleString('ko-KR')}`
}

function fmtKRWFull(n: number): string {
  return `₩${n.toLocaleString('ko-KR')}`
}

function dayDelta(curr: CashSnapshot, prev: CashSnapshot | undefined): string | null {
  if (!prev) return null
  const d = curr.balance_krw - prev.balance_krw
  if (d === 0) return '변동 없음'
  const sign = d > 0 ? '+' : '−'
  return `${sign}${fmtKRW(Math.abs(d))}`
}

export function CashClient({ initial }: { initial: CashSnapshot[] }): React.JSX.Element {
  const today = new Date().toISOString().slice(0, 10)
  const [pending, startTransition] = useTransition()
  const [err, setErr] = useState<string | null>(null)
  const [snapshots, setSnapshots] = useState(initial)

  const latest = snapshots[0]
  const prev = snapshots[1]
  const delta = latest && prev ? latest.balance_krw - prev.balance_krw : 0
  const deltaSign = delta > 0 ? '+' : delta < 0 ? '−' : ''

  async function onSubmit(formData: FormData): Promise<void> {
    setErr(null)
    startTransition(async () => {
      const res = await recordBalance(formData)
      if (!res.ok) {
        setErr(res.error ?? '저장 실패')
        return
      }
      // 클라이언트 상태도 즉시 갱신을 위해 reload
      location.reload()
    })
  }

  async function onDelete(id: string): Promise<void> {
    if (!confirm('이 스냅샷을 삭제할까요?')) return
    await deleteSnapshot(id)
    setSnapshots(snapshots.filter((s) => s.id !== id))
  }

  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <header className="mb-8">
        <p className="text-[10px] font-bold tracking-[0.2em] text-blue-600">CASH · 가용 현금</p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">잔고 일지</h1>
        <p className="mt-1 text-sm text-slate-500">
          매일 하나은행 인터넷뱅킹 보고 한 줄 입력. 같은 날 두 번 입력하면 덮어씀.
        </p>
      </header>

      {latest ? (
        <section className="mb-8 rounded-2xl bg-gradient-to-br from-blue-600 to-blue-700 px-6 py-5 text-white shadow-lg">
          <p className="text-[10px] font-bold tracking-[0.2em] text-blue-100">
            오늘 가용 현금 · {latest.as_of_date}
          </p>
          <p className="mt-2 text-4xl font-extrabold tabular-nums">
            {fmtKRWFull(latest.balance_krw)}
          </p>
          {prev ? (
            <p className="mt-1 text-xs text-blue-100">
              전일({prev.as_of_date}) 대비 {deltaSign}
              {fmtKRW(Math.abs(delta))}
            </p>
          ) : null}
        </section>
      ) : null}

      <form
        action={onSubmit}
        className="mb-10 grid grid-cols-1 gap-3 rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200 sm:grid-cols-2"
      >
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-slate-600">기준일</span>
          <input
            name="as_of_date"
            type="date"
            defaultValue={today}
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs">
          <span className="mb-1 block font-semibold text-slate-600">잔고 (원)</span>
          <input
            name="balance_krw"
            type="text"
            inputMode="numeric"
            placeholder="예: 125000000"
            required
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm tabular-nums"
          />
        </label>
        <label className="block text-xs sm:col-span-1">
          <span className="mb-1 block font-semibold text-slate-600">은행</span>
          <input
            name="bank_name"
            type="text"
            defaultValue="하나은행"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs sm:col-span-1">
          <span className="mb-1 block font-semibold text-slate-600">계좌 별칭 (선택)</span>
          <input
            name="account_alias"
            type="text"
            placeholder="예: 주거래, 마케팅"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <label className="block text-xs sm:col-span-2">
          <span className="mb-1 block font-semibold text-slate-600">메모 (선택)</span>
          <input
            name="note"
            type="text"
            placeholder="예: 매입대금 결제 후"
            className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm"
          />
        </label>
        <div className="flex items-center justify-between sm:col-span-2">
          {err ? <p className="text-xs text-rose-600">{err}</p> : <span />}
          <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {pending ? '저장 중...' : '저장'}
          </button>
        </div>
      </form>

      <section>
        <h2 className="mb-3 text-xs font-bold tracking-[0.18em] text-slate-400">최근 기록</h2>
        {snapshots.length === 0 ? (
          <p className="rounded-2xl bg-slate-50 px-4 py-6 text-center text-xs text-slate-400">
            아직 기록 없음. 위에서 첫 잔고를 입력해 주세요.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl bg-white ring-1 ring-slate-200">
            {snapshots.map((s, i) => (
              <li key={s.id} className="flex items-center justify-between gap-4 px-5 py-3 text-sm">
                <div className="min-w-0">
                  <p className="font-semibold text-slate-800">
                    {s.as_of_date}
                    {s.account_alias ? (
                      <span className="ml-2 text-xs font-medium text-slate-400">
                        · {s.account_alias}
                      </span>
                    ) : null}
                  </p>
                  {s.note ? <p className="mt-0.5 text-xs text-slate-500">{s.note}</p> : null}
                </div>
                <div className="text-right">
                  <p className="font-bold text-slate-900 tabular-nums">
                    {fmtKRWFull(s.balance_krw)}
                  </p>
                  {dayDelta(s, snapshots[i + 1]) ? (
                    <p className="text-[10px] text-slate-400">{dayDelta(s, snapshots[i + 1])}</p>
                  ) : null}
                </div>
                <button
                  onClick={() => onDelete(s.id)}
                  className="text-[10px] text-slate-300 hover:text-rose-500"
                  title="삭제"
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
