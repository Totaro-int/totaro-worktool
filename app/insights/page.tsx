import type { JSX } from 'react'

import Link from 'next/link'

import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Insights — Totaro',
  description: 'Totaro 인사이트 카드 모음.',
}

const CARDS = [
  {
    slug: 'korea-kimchi-oem-supplier-verification',
    title: '한국 김치 OEM 공급사 검증 가이드',
    description: 'HACCP·FDA·MOQ·평균 단가 한 페이지 정리 (2025)',
    date: '2026-05-28',
  },
  {
    slug: 'korea-ramen-oem-supplier-verification',
    title: '한국 라면 OEM 공급사 검증 가이드',
    description: 'HACCP·할랄·SKU·평균 단가 한 페이지 정리 (2025)',
    date: '2026-05-28',
  },
  {
    slug: 'fungal-melanin-uv-protection-rsc-2021',
    title: '진균 멜라닌 자외선 차단 데이터',
    description: '2021 RSC 논문이 정리한 SPF·UVA/UVB·항산화·세포 안전성',
    date: '2026-05-29',
  },
] as const

export default function Page(): JSX.Element {
  return (
    <main className="bg-white">
      <div className="mx-auto max-w-3xl px-6 py-12">
        <h1 className="text-3xl font-bold text-slate-900">Insights</h1>
        <p className="mt-2 text-slate-600">한국 식품 OEM·수출 B2B 인사이트 카드.</p>

        <ul className="mt-8 space-y-4">
          {CARDS.map((card) => (
            <li
              key={card.slug}
              className="rounded-lg border border-slate-200 bg-slate-50/50 p-5 transition hover:bg-slate-100"
            >
              <Link href={`/insights/${card.slug}`} className="block">
                <h2 className="text-lg font-semibold text-slate-900">{card.title}</h2>
                <p className="mt-1 text-sm text-slate-700">{card.description}</p>
                <time dateTime={card.date} className="mt-2 block text-xs text-slate-500">
                  {card.date}
                </time>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </main>
  )
}
