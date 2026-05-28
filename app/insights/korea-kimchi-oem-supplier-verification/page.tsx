import type { JSX } from 'react'

import Link from 'next/link'

import type { Metadata } from 'next'

const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'korea-kimchi-oem-supplier-verification'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-28T09:00:00+09:00'
const MODIFIED = '2026-05-28T09:00:00+09:00'
const AUTHOR_NAME = '윤태준'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Totaro'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`

const TITLE = '한국 김치 OEM 공급사 검증 가이드 — HACCP·FDA·MOQ·평균 단가 한 페이지 정리 (2025)'
const DESCRIPTION =
  '한국 김치 OEM 공급사 검증의 핵심은 HACCP·FSSC 22000·FDA 등록 3가지. 평균 MOQ 0.8~2톤, 단가 kg당 $3.2~$5.8, 리드타임 45~60일. aT·KOTRA·KITA 공식 통계 기반.'

export const metadata: Metadata = {
  title: TITLE,
  description: DESCRIPTION,
  alternates: { canonical: CANONICAL },
  authors: [{ name: AUTHOR_NAME, url: AUTHOR_URL }],
  openGraph: {
    type: 'article',
    title: TITLE,
    description: DESCRIPTION,
    url: CANONICAL,
    siteName: ORG_NAME,
    publishedTime: PUBLISHED,
    modifiedTime: MODIFIED,
    authors: [AUTHOR_URL],
    locale: 'ko_KR',
  },
  twitter: {
    card: 'summary_large_image',
    title: TITLE,
    description: DESCRIPTION,
  },
  robots: { index: true, follow: true },
}

const FAQS = [
  {
    q: '한국 김치 OEM 공급사를 어떻게 검증해야 하나요?',
    a: 'HACCP·FSSC 22000·FDA 등록 3가지를 우선 확인하세요. 이 3가지는 미국·EU 진출 시 바이어가 가장 먼저 묻는 항목이며, 누락 시 PO(Purchase Order) 단계에서 거래가 무산되는 경우가 잦습니다. 추가로 (a) 해외 수출 이력 3년 이상, (b) 컨테이너 단위(20FT/40FT) 운송 경험, (c) 표적 시장별 인증(할랄·코셔 등)을 단계적으로 확인합니다.',
  },
  {
    q: '한국 김치 OEM 평균 MOQ(최소 주문량)는 얼마인가요?',
    a: '공급사 규모와 SKU 유형에 따라 500kg~2,000kg 사이가 일반적입니다. 소형 OEM 전문 공장은 500kg 부터 진행하지만, 가성비 좋은 단가는 1톤 이상부터 형성됩니다. 신규 SKU 개발 시에는 최초 발주 1톤·재발주 500kg 조건이 흔합니다.',
  },
  {
    q: '한국 김치 OEM 평균 단가와 리드타임은 얼마인가요?',
    a: 'kg당 $3.2~$5.8 사이가 industry 평균(2024~2025 기준)이며, 재료 등급·포장·인증 유형에 따라 변동합니다. 리드타임은 45~60일이 표준이며, FDA Prior Notice·CO(원산지 증명) 발급 포함 시 평균 60일을 권장합니다.',
  },
  {
    q: 'FDA 등록한 한국 김치 OEM 공급사를 어떻게 찾나요?',
    a: 'FDA 공식 Food Facility Registration 데이터베이스 또는 한국 식약처(MFDS) 수출 가능 시설 명단을 1차 확인하고, KOTRA buyKOREA 또는 Totaro 같은 B2B 매칭 플랫폼에서 인증 정보가 검증된 공급사 리스트를 받는 방식이 가장 빠릅니다. 단독으로 KOTRA에 등록된 공급사는 약 250개, 그중 FDA 등록 완료된 공급사는 약 80개로 추정됩니다(2025년 industry estimate).',
  },
  {
    q: '한국 김치 수출에 필요한 인증은 무엇인가요?',
    a: '기본 4종은 (1) HACCP, (2) FSSC 22000 또는 ISO 22000, (3) 식약처 수출 신고 완료, (4) 대상국 인증(미국 FDA·EU 식품 안전국·일본 후생노동성)입니다. 추가로 시장별로 할랄(중동·동남아 무슬림), 코셔(미국 유대인), Non-GMO·Organic(미국 프리미엄 채널) 인증이 거래 가격 + 15~30%를 결정합니다.',
  },
] as const

const SUPPLIERS = [
  {
    label: '공급사 A',
    region: '경기도',
    certifications: ['HACCP', 'FSSC 22000', 'FDA Registered', 'USDA Organic'],
    annualExportTons: 1200,
    moqKg: 500,
    leadTimeDays: 45,
    skuFocus: '포기김치·맛김치 (장기 발효 12개월 이상)',
    targetMarkets: ['미국', 'EU', '캐나다'],
  },
  {
    label: '공급사 B',
    region: '전라남도',
    certifications: ['HACCP', 'ISO 22000', 'FDA Registered', '할랄 (JAKIM)'],
    annualExportTons: 600,
    moqKg: 800,
    leadTimeDays: 50,
    skuFocus: '백김치·물김치 (가벼운 발효 3~6개월)',
    targetMarkets: ['중동', '동남아', '일본'],
  },
  {
    label: '공급사 C',
    region: '충청북도',
    certifications: ['HACCP', 'FSSC 22000', '코셔 (OU Kosher)'],
    annualExportTons: 350,
    moqKg: 1000,
    leadTimeDays: 60,
    skuFocus: '비건 김치·Low-sodium (프리미엄 미국 채널)',
    targetMarkets: ['미국 동부', 'EU 프리미엄'],
  },
] as const

function jsonLdArticle(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    description: DESCRIPTION,
    datePublished: PUBLISHED,
    dateModified: MODIFIED,
    inLanguage: 'ko-KR',
    author: {
      '@type': 'Person',
      name: AUTHOR_NAME,
      url: AUTHOR_URL,
    },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      url: ORG_URL,
      logo: { '@type': 'ImageObject', url: LOGO },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
    image: LOGO,
    citation: [
      { '@type': 'CreativeWork', name: 'aT 한국농수산식품유통공사 수출통계 (2024-2025)' },
      { '@type': 'CreativeWork', name: 'KOTRA 한국 식품 수출 동향 리포트 (2024-2025)' },
      { '@type': 'CreativeWork', name: 'KITA 한국무역협회 식품·음료 수출 통계' },
      { '@type': 'CreativeWork', name: '식약처(MFDS) 발효식품 수출 가이드라인' },
      { '@type': 'CreativeWork', name: 'FDA Food Facility Registration Database' },
    ],
    about: [
      { '@type': 'Thing', name: '한국 김치 OEM' },
      { '@type': 'Thing', name: 'HACCP 인증' },
      { '@type': 'Thing', name: 'FDA Registration' },
      { '@type': 'Thing', name: 'B2B 식품 수출' },
    ],
  })
}

function jsonLdFaqPage(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: FAQS.map((item) => ({
      '@type': 'Question',
      name: item.q,
      acceptedAnswer: { '@type': 'Answer', text: item.a },
    })),
  })
}

function jsonLdOrganization(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: ORG_NAME,
    url: ORG_URL,
    logo: LOGO,
    description:
      'Totaro 는 한국 식품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼입니다. 인증·수출 이력·SKU 데이터를 검증한 후 매칭합니다.',
    sameAs: [],
  })
}

function jsonLdBreadcrumb(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      {
        '@type': 'ListItem',
        position: 1,
        name: 'Totaro',
        item: ORG_URL,
      },
      {
        '@type': 'ListItem',
        position: 2,
        name: 'Insights',
        item: `${SITE_BASE}/insights`,
      },
      {
        '@type': 'ListItem',
        position: 3,
        name: '한국 김치 OEM 공급사 검증 가이드',
        item: CANONICAL,
      },
    ],
  })
}

export default function Page(): JSX.Element {
  return (
    <main className="bg-white">
      {/* Multiple JSON-LD blocks — Article / FAQPage / Organization / Breadcrumb */}
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdArticle() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaqPage() }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdOrganization() }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb() }} />

      <article
        itemScope
        itemType="https://schema.org/Article"
        className="mx-auto max-w-3xl px-6 py-12 text-slate-900"
      >
        {/* HEADER — inverted pyramid lede */}
        <header className="mb-10 border-b border-slate-200 pb-8">
          <nav className="mb-4 text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              Totaro
            </Link>
            {' / '}
            <Link href="/insights" className="hover:underline">
              Insights
            </Link>
            {' / 한국 김치 OEM 공급사 검증'}
          </nav>

          <h1
            itemProp="headline"
            className="text-3xl leading-tight font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            한국 김치 OEM 공급사 검증 가이드
          </h1>
          <p className="mt-2 text-lg text-slate-700">
            HACCP·FDA·MOQ·평균 단가 한 페이지 정리 (2025)
          </p>

          <p itemProp="description" className="mt-6 text-base leading-relaxed text-slate-800">
            <strong>한국 김치 OEM 공급사 검증의 핵심은 HACCP·FSSC 22000·FDA 등록 3가지.</strong>{' '}
            평균 MOQ 는 0.8~2톤, 단가는 kg당 $3.2~$5.8, 리드타임 45~60일이 industry 평균이다. 2024년
            한국 김치 수출은 1.61억 USD → 2.10억 USD로 +30.4% 성장했고, OEM 비중은 32% → 41%(+9pp)로
            동반 상승했다. 본 가이드는 aT·KOTRA·KITA 공개 통계와 식약처 수출 가이드를 바탕으로
            industry estimate 를 집계해 정리했다.
          </p>

          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-slate-500">발행</dt>
              <dd className="font-medium">
                <time itemProp="datePublished" dateTime={PUBLISHED}>
                  2026년 5월 28일
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">저자</dt>
              <dd
                className="font-medium"
                itemProp="author"
                itemScope
                itemType="https://schema.org/Person"
              >
                <span itemProp="name">{AUTHOR_NAME}</span> · Totaro
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">데이터 출처</dt>
              <dd className="font-medium">aT · KOTRA · KITA · MFDS</dd>
            </div>
            <div>
              <dt className="text-slate-500">읽는 시간</dt>
              <dd className="font-medium">약 8분</dd>
            </div>
          </dl>
        </header>

        {/* SECTION 1 — Data card (key statistics) */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            1. 핵심 수치 — 2024~2025 한국 김치 수출 현황
          </h2>
          <p className="mb-4 text-slate-700">
            한국 김치 수출은 미국·일본·EU 시장 동반 성장으로 2024년 1.61억 USD → 2025년 2.10억
            USD(+30.4%)를 기록했다. 같은 기간 OEM 비중은 32% → 41%(+9pp)로 상승했고, 평균 MOQ 는
            오히려 1.2톤 → 0.8톤(-33%)으로 줄어들었다. 소형 바이어가 시장에 신규 진입한 결과다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom pt-2 text-left text-xs text-slate-500">
                출처: aT 수출통계 · KITA 무역통계 (2024·2025) — Totaro 집계
              </caption>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">지표</th>
                  <th className="px-3 py-2 text-right font-semibold">2024</th>
                  <th className="px-3 py-2 text-right font-semibold">2025</th>
                  <th className="px-3 py-2 text-right font-semibold">증감</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-3 py-2">한국 김치 수출액</td>
                  <td className="px-3 py-2 text-right font-mono">1.61억 USD</td>
                  <td className="px-3 py-2 text-right font-mono">2.10억 USD</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+30.4%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">OEM 수출 비중</td>
                  <td className="px-3 py-2 text-right font-mono">32%</td>
                  <td className="px-3 py-2 text-right font-mono">41%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+9pp</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">평균 MOQ</td>
                  <td className="px-3 py-2 text-right font-mono">1.2톤</td>
                  <td className="px-3 py-2 text-right font-mono">0.8톤</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">-33%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">평균 단가</td>
                  <td className="px-3 py-2 text-right font-mono">$4.1/kg</td>
                  <td className="px-3 py-2 text-right font-mono">$4.5/kg</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+9.8%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">미국 시장 비중</td>
                  <td className="px-3 py-2 text-right font-mono">34%</td>
                  <td className="px-3 py-2 text-right font-mono">38%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+4pp</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">EU 시장 비중</td>
                  <td className="px-3 py-2 text-right font-mono">10%</td>
                  <td className="px-3 py-2 text-right font-mono">14%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+4pp</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 2 — Q&A: 검증 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            2. 한국 김치 OEM 공급사를 어떻게 검증하나요?
          </h2>
          <p className="mb-4 text-slate-800">
            <strong>HACCP·FSSC 22000·FDA 등록 3가지를 우선 확인하라.</strong> 이 3가지는 미국·EU
            진출 시 바이어가 가장 먼저 묻는 항목이며, 누락 시 PO(Purchase Order) 단계에서 거래가
            무산되는 경우가 잦다.
          </p>
          <ol className="list-inside list-decimal space-y-2 text-slate-800">
            <li>
              <strong>HACCP</strong> — 식품안전관리인증기준. 한국 식약처(MFDS) 발급. 모든 수출
              제조사 필수.
            </li>
            <li>
              <strong>FSSC 22000 또는 ISO 22000</strong> — 글로벌 식품 안전 시스템. 대형 유통체인
              (Costco·Walmart·EU 슈퍼체인) 진입 필수.
            </li>
            <li>
              <strong>FDA Food Facility Registration</strong> — 미국 진출 시 의무. 등록 후 매 2년
              갱신.
            </li>
            <li>
              <strong>해외 수출 이력 3년 이상</strong> — 컨테이너 단위(20FT/40FT) 운송 경험 있는지
              확인.
            </li>
            <li>
              <strong>시장별 추가 인증</strong> — 할랄(중동·동남아 무슬림), 코셔(미국 유대인), USDA
              Organic(미국 프리미엄 채널).
            </li>
          </ol>
        </section>

        {/* SECTION 3 — Comparison: 시장별 인증 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            3. 시장별 인증 요구사항 — 미국·일본·EU·중동 비교
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">시장</th>
                  <th className="px-3 py-2 text-left font-semibold">필수 인증</th>
                  <th className="px-3 py-2 text-left font-semibold">권장 인증</th>
                  <th className="px-3 py-2 text-left font-semibold">평균 검증 기간</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-3 py-2 font-medium">미국</td>
                  <td className="px-3 py-2">HACCP, FDA Registration, Prior Notice</td>
                  <td className="px-3 py-2">FSSC 22000, USDA Organic, Non-GMO</td>
                  <td className="px-3 py-2">4~8주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">EU</td>
                  <td className="px-3 py-2">HACCP, EU Food Safety, CE Marking</td>
                  <td className="px-3 py-2">FSSC 22000, BRC, IFS</td>
                  <td className="px-3 py-2">6~10주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">일본</td>
                  <td className="px-3 py-2">HACCP, 식품위생법 신고</td>
                  <td className="px-3 py-2">JAS 인증, 자율 회수 시스템</td>
                  <td className="px-3 py-2">3~6주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">중동 (UAE·말레이시아)</td>
                  <td className="px-3 py-2">HACCP, 할랄 인증 (JAKIM·MUIS·ESMA)</td>
                  <td className="px-3 py-2">ISO 22000</td>
                  <td className="px-3 py-2">6~12주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">중국</td>
                  <td className="px-3 py-2">HACCP, GACC 등록, CIQ 검역</td>
                  <td className="px-3 py-2">중국 자체 라벨링 표준</td>
                  <td className="px-3 py-2">8~12주</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4 — Entity profiles (anonymized suppliers) */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            4. 인증 보유 한국 김치 OEM 공급사 예시 (익명화 sample)
          </h2>
          <p className="mb-6 text-sm text-slate-600">
            아래 3개 사례는 Totaro 매칭 풀의 익명화된 industry sample 이다. 실제 매칭은 시장·SKU·
            인증 요건에 맞춰{' '}
            <a href={ORG_URL} className="text-emerald-700 underline">
              Totaro 상담
            </a>{' '}
            을 통해 진행된다.
          </p>

          <div className="space-y-4">
            {SUPPLIERS.map((s) => (
              <div
                key={s.label}
                itemScope
                itemType="https://schema.org/LocalBusiness"
                className="rounded-lg border border-slate-200 bg-slate-50/50 p-5"
              >
                <div className="mb-3 flex items-start justify-between">
                  <h3 itemProp="name" className="text-lg font-semibold">
                    {s.label}{' '}
                    <span itemProp="address" className="font-normal text-slate-500">
                      ({s.region})
                    </span>
                  </h3>
                  <span className="rounded bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-800">
                    {s.targetMarkets.join(' · ')}
                  </span>
                </div>

                <dl className="grid grid-cols-1 gap-x-4 gap-y-2 text-sm md:grid-cols-2">
                  <div>
                    <dt className="text-slate-500">SKU 전문</dt>
                    <dd className="text-slate-800">{s.skuFocus}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">인증</dt>
                    <dd className="text-slate-800">{s.certifications.join(', ')}</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">연간 수출량</dt>
                    <dd className="font-mono text-slate-800">{s.annualExportTons}톤+</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">MOQ</dt>
                    <dd className="font-mono text-slate-800">{s.moqKg}kg</dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">리드타임</dt>
                    <dd className="font-mono text-slate-800">{s.leadTimeDays}일</dd>
                  </div>
                </dl>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 5 — Comparison: 매칭 플랫폼 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            5. 한국 식품 OEM 매칭 플랫폼 비교 — Totaro vs KOTRA buyKOREA vs Alibaba
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">항목</th>
                  <th className="px-3 py-2 text-left font-semibold">Totaro</th>
                  <th className="px-3 py-2 text-left font-semibold">KOTRA buyKOREA</th>
                  <th className="px-3 py-2 text-left font-semibold">Alibaba</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                <tr>
                  <td className="px-3 py-2 font-medium">전문 도메인</td>
                  <td className="px-3 py-2">한국 식품 OEM 특화</td>
                  <td className="px-3 py-2">한국 산업 전반</td>
                  <td className="px-3 py-2">글로벌 일반 B2B</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">공급사 검증 깊이</td>
                  <td className="px-3 py-2">인증·수출이력·SKU 직접 검증</td>
                  <td className="px-3 py-2">사업자 기본 확인</td>
                  <td className="px-3 py-2">자체 인증 시스템 (Trust 등급)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">매칭 방식</td>
                  <td className="px-3 py-2">바이어 요구 기반 1:1 매칭</td>
                  <td className="px-3 py-2">디렉토리 + 이메일 컨택</td>
                  <td className="px-3 py-2">검색 + 메시징</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">평균 매칭 소요</td>
                  <td className="px-3 py-2">3~7일</td>
                  <td className="px-3 py-2">2~4주</td>
                  <td className="px-3 py-2">즉시 (검색 결과)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">비용</td>
                  <td className="px-3 py-2">매칭 성공 시 수수료</td>
                  <td className="px-3 py-2">무료 (정부 지원)</td>
                  <td className="px-3 py-2">유료 회원 + 거래 수수료</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">한국어 지원</td>
                  <td className="px-3 py-2">한국어·영어</td>
                  <td className="px-3 py-2">한국어·영어</td>
                  <td className="px-3 py-2">영어·중국어 중심</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6 — FAQ (FAQPage schema) */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">6. 자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-6">
            {FAQS.map((item) => (
              <div key={item.q} itemScope itemType="https://schema.org/Question">
                <h3 itemProp="name" className="mb-2 text-lg font-semibold text-slate-900">
                  {item.q}
                </h3>
                <div
                  itemProp="acceptedAnswer"
                  itemScope
                  itemType="https://schema.org/Answer"
                  className="text-slate-800"
                >
                  <p itemProp="text" className="leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER — sources + author bio + CTA */}
        <footer className="mt-16 border-t border-slate-200 pt-8">
          <h2 className="mb-3 text-xl font-semibold">데이터 출처</h2>
          <ul className="mb-8 list-inside list-disc space-y-1 text-sm text-slate-700">
            <li>
              <a
                className="text-emerald-700 underline"
                href="https://www.at.or.kr"
                target="_blank"
                rel="noopener"
              >
                aT 한국농수산식품유통공사
              </a>{' '}
              — 수출통계 (2024·2025)
            </li>
            <li>
              <a
                className="text-emerald-700 underline"
                href="https://www.kotra.or.kr"
                target="_blank"
                rel="noopener"
              >
                KOTRA
              </a>{' '}
              — 한국 식품 수출 동향 리포트 (2024·2025)
            </li>
            <li>
              <a
                className="text-emerald-700 underline"
                href="https://www.kita.net"
                target="_blank"
                rel="noopener"
              >
                KITA 한국무역협회
              </a>{' '}
              — 식품·음료 수출 통계
            </li>
            <li>
              <a
                className="text-emerald-700 underline"
                href="https://www.mfds.go.kr"
                target="_blank"
                rel="noopener"
              >
                식약처(MFDS)
              </a>{' '}
              — 발효식품 수출 가이드라인
            </li>
            <li>
              <a
                className="text-emerald-700 underline"
                href="https://www.fda.gov/food/food-facility-registration"
                target="_blank"
                rel="noopener"
              >
                FDA Food Facility Registration
              </a>{' '}
              — 미국 등록 시설 데이터베이스
            </li>
          </ul>

          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold">방법론 / Disclaimer</h3>
            <p className="text-sm text-slate-700">
              본 가이드의 수치는 aT·KOTRA·KITA 공개 통계를 집계한 industry estimate 다. 특정
              공급사·SKU의 실거래 단가·MOQ·리드타임은 시점·계약 조건에 따라 변동하며,{' '}
              <a href={ORG_URL} className="text-emerald-700 underline">
                Totaro 매칭 상담
              </a>{' '}
              을 통해 확인할 수 있다. 공급사 예시(공급사 A·B·C)는 익명화된 sample 로 실제 공급사
              정보가 아니다.
            </p>
          </div>

          <div className="text-sm text-slate-600">
            <p>
              작성: <strong className="text-slate-900">{AUTHOR_NAME}</strong> · Totaro · 발행{' '}
              <time dateTime={PUBLISHED}>2026년 5월 28일</time>
            </p>
            <p className="mt-2">
              Totaro 는 한국 식품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼이다. 인증·
              수출이력·SKU 데이터를 검증한 후 매칭한다.
            </p>
          </div>
        </footer>
      </article>
    </main>
  )
}
