'use client'

import { useState } from 'react'

import { ReportView } from '@/app/(app)/hub/ai-team/[slug]/ReportView'

type Report = {
  filename: string
  createdAt: string
  content: string | null
  summary: string | null
  driveLink: string | null
}

/** 카드레터 스튜디오 챗 옆 — 사현이의 오늘자 마케팅 보고서를 그 자리에서 펼쳐 본다(카드 소재로). */
export function StudioReportPanel(): React.JSX.Element {
  const [report, setReport] = useState<Report | null>(null)
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [err, setErr] = useState('')

  async function load(): Promise<void> {
    setLoading(true)
    setErr('')
    try {
      const res = await fetch('/api/content/report')
      const data = (await res.json()) as { ok?: boolean; report?: Report | null }
      if (data.ok && data.report) {
        setReport(data.report)
        setOpen(true)
      } else {
        setErr('오늘 보고서가 아직 없어요 (매일 아침 8시 업로드).')
      }
    } catch {
      setErr('보고서 불러오기 실패.')
    } finally {
      setLoading(false)
    }
  }

  function toggle(): void {
    if (report) setOpen((o) => !o)
    else void load()
  }

  const label = loading
    ? '불러오는 중…'
    : report
      ? open
        ? '오늘 보고서 접기'
        : '오늘 보고서 펴기'
      : '📋 오늘 보고서 가져오기'

  return (
    <div className="mb-3 rounded-xl bg-white p-3 ring-1 ring-slate-200">
      <button
        type="button"
        onClick={toggle}
        disabled={loading}
        className="w-full rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white transition-colors hover:bg-slate-800 disabled:opacity-50"
      >
        {label}
      </button>
      {err ? <p className="mt-2 text-xs text-slate-400">{err}</p> : null}
      {report && open ? (
        <div className="mt-3">
          <div className="mb-1 flex items-center justify-between gap-2 text-[11px] text-slate-400">
            <span className="min-w-0 truncate">{report.filename}</span>
            {report.driveLink ? (
              <a
                href={report.driveLink}
                target="_blank"
                rel="noreferrer"
                className="shrink-0 hover:text-slate-700"
              >
                전문 ↗
              </a>
            ) : null}
          </div>
          <div className="max-h-72 overflow-y-auto rounded-lg bg-slate-50 p-3">
            {report.content ? (
              <ReportView content={report.content} />
            ) : (
              <p className="text-xs text-slate-500">
                {report.summary ?? '본문을 불러오지 못했어요.'}
              </p>
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
