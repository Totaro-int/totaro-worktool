import type { JSX } from 'react'

import Link from 'next/link'

import type { Metadata } from 'next'

const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'korea-ramen-oem-supplier-verification'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-28T11:00:00+09:00'
const MODIFIED = '2026-05-28T11:00:00+09:00'
const AUTHOR_NAME = '윤태준'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Totaro'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`

const TITLE = '한국 라면 OEM 공급사 검증 가이드 — HACCP·할랄·SKU·평균 단가 한 페이지 정리 (2025)'
const DESCRIPTION =
  '한국 라면 OEM 공급사 검증의 핵심은 HACCP·식약처 신고·할랄/코셔 3가지. 평균 MOQ 5,000박스, 단가 박스당 $7~$12, 리드타임 60~75일. aT·KITA 통계 기반.'

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
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
}

const FAQS = [
  {
    q: '한국 라면 OEM 공급사를 어떻게 검증해야 하나요?',
    a: 'HACCP·식약처 수출신고·시장별 종교/문화 인증(할랄·코셔·Vegan) 3가지를 우선 확인하라. 라면은 면·스프·건더기 다중 SKU 구조라 알레르겐(밀·계란·새우 등) 라벨링이 미국·EU·호주 시장에서 필수다. 추가로 (a) 컨테이너 단위 수출 이력 3년 이상, (b) 자체 R&D 능력(SKU 커스터마이즈), (c) 대기업 ODM 이력을 단계 확인한다.',
  },
  {
    q: '한국 라면 OEM 평균 MOQ(최소 주문량)는 얼마인가요?',
    a: '공급사 규모에 따라 3,000박스~10,000박스가 일반적이다. 면류는 라면 1박스 = 30~40봉이며, 5,000박스 부터 가성비 단가 형성. 신규 SKU 개발 시 최초 발주 10,000박스·재발주 3,000박스 조건이 흔하다. 김치 OEM 대비 MOQ가 약 6~10배 크다.',
  },
  {
    q: '한국 라면 OEM 평균 단가와 리드타임은 얼마인가요?',
    a: '박스당 $7~$12 사이가 industry 평균(2024~2025 기준)이며, 면 유형(유탕면/건면/생면), 스프 등급, 포장 방식에 따라 변동한다. 리드타임은 60~75일이 표준이며, FDA Prior Notice + 할랄 인증 갱신 포함 시 평균 90일.',
  },
  {
    q: '할랄 인증 한국 라면 OEM 공급사를 어떻게 찾나요?',
    a: 'JAKIM(말레이시아) 또는 MUI(인도네시아) 인증 보유 공급사를 한국이슬람중앙회(KMF) 또는 Totaro 매칭 플랫폼에서 확인한다. 2025년 기준 한국 라면 OEM 공급사 약 120개 중 할랄 보유는 약 28개 (24%). 중동·동남아 무슬림 시장 진출 시 필수.',
  },
  {
    q: '한국 라면 수출에 필요한 인증은 무엇인가요?',
    a: '기본 4종은 (1) HACCP, (2) 식약처 수출 신고, (3) 알레르겐 라벨링 (EU/미국/호주 의무), (4) 대상국 인증(미국 FDA·일본 후생노동성·중국 GACC). 시장별 추가: 할랄(중동·동남아), 코셔(미국 유대 채널), Vegan/식물성(미국·EU 프리미엄). 비건 라면은 평균 가격 +25~40%.',
  },
] as const

const SUPPLIERS = [
  {
    label: '공급사 A',
    region: '경기도 안성',
    certifications: ['HACCP', 'FSSC 22000', 'FDA Registered', 'JAKIM 할랄'],
    annualExportBoxes: 800000,
    moqBoxes: 5000,
    leadTimeDays: 60,
    skuFocus: '봉지면·유탕면 (매운맛·국물·비빔)',
    targetMarkets: ['미국', '동남아', '말레이시아'],
  },
  {
    label: '공급사 B',
    region: '충청북도 진천',
    certifications: ['HACCP', 'ISO 22000', 'OU Kosher', 'USDA Organic'],
    annualExportBoxes: 450000,
    moqBoxes: 3000,
    leadTimeDays: 75,
    skuFocus: '컵라면·프리미엄 라인 (저염·논프라이)',
    targetMarkets: ['미국 동부', 'EU', '캐나다'],
  },
  {
    label: '공급사 C',
    region: '경상남도 김해',
    certifications: ['HACCP', 'FSSC 22000', 'Vegan Certified', 'EU Organic'],
    annualExportBoxes: 250000,
    moqBoxes: 10000,
    leadTimeDays: 90,
    skuFocus: '비건 라면·생면·로컬 SKU 커스텀',
    targetMarkets: ['EU 프리미엄', '미국 비건 채널', '호주'],
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
    author: { '@type': 'Person', name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      url: ORG_URL,
      logo: { '@type': 'ImageObject', url: LOGO },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
    image: LOGO,
    citation: [
      { '@type': 'CreativeWork', name: 'aT 한국농수산식품유통공사 라면 수출통계 (2024-2025)' },
      { '@type': 'CreativeWork', name: 'KOTRA 한국 면류 수출 동향 리포트' },
      { '@type': 'CreativeWork', name: 'KITA 한국무역협회 식품 수출 통계' },
      { '@type': 'CreativeWork', name: '식약처(MFDS) 즉석면류 수출 가이드라인' },
      { '@type': 'CreativeWork', name: '한국이슬람중앙회 할랄 인증 디렉토리' },
    ],
    about: [
      { '@type': 'Thing', name: '한국 라면 OEM' },
      { '@type': 'Thing', name: 'HACCP 인증' },
      { '@type': 'Thing', name: '할랄 인증' },
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
    description: 'Totaro 는 한국 식품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼입니다.',
  })
}

function jsonLdBreadcrumb(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Totaro', item: ORG_URL },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_BASE}/insights` },
      {
        '@type': 'ListItem',
        position: 3,
        name: '한국 라면 OEM 공급사 검증 가이드',
        item: CANONICAL,
      },
    ],
  })
}

export default function Page(): JSX.Element {
  return (
    <main className="bg-white">
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
        <header className="mb-10 border-b border-slate-200 pb-8">
          <nav className="mb-4 text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              Totaro
            </Link>
            {' / '}
            <Link href="/insights" className="hover:underline">
              Insights
            </Link>
            {' / 한국 라면 OEM 공급사 검증'}
          </nav>

          <h1
            itemProp="headline"
            className="text-3xl leading-tight font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            한국 라면 OEM 공급사 검증 가이드
          </h1>
          <p className="mt-2 text-lg text-slate-700">
            HACCP·할랄·SKU·평균 단가 한 페이지 정리 (2025)
          </p>

          <p itemProp="description" className="mt-6 text-base leading-relaxed text-slate-800">
            <strong>
              한국 라면 OEM 공급사 검증의 핵심은 HACCP·식약처 수출신고·시장별 종교/문화 인증
              (할랄·코셔·Vegan) 3가지.
            </strong>{' '}
            평균 MOQ 는 5,000박스, 단가는 박스당 $7~$12, 리드타임 60~75일이 industry 평균이다.
            2024년 한국 라면 수출은 12.5억 USD → 16.2억 USD로 +29.6% 성장했고, 미국 비중이 24% → 31%
            (+7pp)로 급상승했다. 본 가이드는 aT·KITA 공개 통계와 식약처 수출 가이드를 바탕으로 한
            industry estimate.
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            1. 핵심 수치 — 2024~2025 한국 라면 수출 현황
          </h2>
          <p className="mb-4 text-slate-700">
            한국 라면 수출은 미국·동남아·EU 시장 동반 성장으로 2024년 12.5억 USD → 2025년 16.2억
            USD(+29.6%)를 기록했다. 미국 비중은 24% → 31%(+7pp), OEM 비중은 38% → 46%(+8pp)로 상승.
            할랄 인증 SKU 의 비중도 12% → 19%(+7pp)로 무슬림 시장 진입이 빠르게 확장.
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
                  <td className="px-3 py-2">한국 라면 수출액</td>
                  <td className="px-3 py-2 text-right font-mono">12.5억 USD</td>
                  <td className="px-3 py-2 text-right font-mono">16.2억 USD</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+29.6%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">OEM 수출 비중</td>
                  <td className="px-3 py-2 text-right font-mono">38%</td>
                  <td className="px-3 py-2 text-right font-mono">46%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+8pp</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">미국 시장 비중</td>
                  <td className="px-3 py-2 text-right font-mono">24%</td>
                  <td className="px-3 py-2 text-right font-mono">31%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+7pp</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">할랄 인증 SKU 비중</td>
                  <td className="px-3 py-2 text-right font-mono">12%</td>
                  <td className="px-3 py-2 text-right font-mono">19%</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+7pp</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">평균 MOQ</td>
                  <td className="px-3 py-2 text-right font-mono">7,000박스</td>
                  <td className="px-3 py-2 text-right font-mono">5,000박스</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">-29%</td>
                </tr>
                <tr>
                  <td className="px-3 py-2">평균 단가 (박스당)</td>
                  <td className="px-3 py-2 text-right font-mono">$8.2</td>
                  <td className="px-3 py-2 text-right font-mono">$9.5</td>
                  <td className="px-3 py-2 text-right font-mono text-emerald-700">+15.9%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            2. 한국 라면 OEM 공급사를 어떻게 검증하나요?
          </h2>
          <p className="mb-4 text-slate-800">
            <strong>
              HACCP·식약처 수출신고·시장별 종교/문화 인증 (할랄·코셔·Vegan) 3가지를 우선 확인하라.
            </strong>{' '}
            라면은 면·스프·건더기 다중 SKU 구조라 알레르겐 라벨링이 미국·EU·호주 시장에서 필수.
          </p>
          <ol className="list-inside list-decimal space-y-2 text-slate-800">
            <li>
              <strong>HACCP</strong> — 식약처(MFDS) 발급. 모든 즉석면류 수출 제조사 필수.
            </li>
            <li>
              <strong>식약처 수출 신고</strong> — 즉석면류 별도 신고. 알레르겐(밀·계란·새우 등)
              라벨링 검증.
            </li>
            <li>
              <strong>대상국 인증</strong> — 미국 FDA, 일본 후생노동성, 중국 GACC 등록 + Prior
              Notice.
            </li>
            <li>
              <strong>시장별 종교/문화 인증</strong> — 할랄(JAKIM/MUI), 코셔(OU Kosher),
              Vegan/Plant-Based.
            </li>
            <li>
              <strong>해외 수출 이력 3년 이상</strong> — 컨테이너 단위 운송 경험.
            </li>
          </ol>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">3. 시장별 라면 인증 요구사항</h2>
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
                  <td className="px-3 py-2">HACCP, FDA, Prior Notice, 알레르겐 라벨</td>
                  <td className="px-3 py-2">OU Kosher, USDA Organic, Vegan Certified</td>
                  <td className="px-3 py-2">6~10주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">EU</td>
                  <td className="px-3 py-2">HACCP, EU Food Safety, 알레르겐 14종 라벨</td>
                  <td className="px-3 py-2">EU Organic, Vegan Society</td>
                  <td className="px-3 py-2">8~12주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">중동·동남아</td>
                  <td className="px-3 py-2">HACCP, 할랄 (JAKIM/MUI/ESMA)</td>
                  <td className="px-3 py-2">ISO 22000, 동물성 원료 100% 배제 확인</td>
                  <td className="px-3 py-2">8~14주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">중국</td>
                  <td className="px-3 py-2">HACCP, GACC 등록, CIQ 검역</td>
                  <td className="px-3 py-2">중국 자체 SKU 표준</td>
                  <td className="px-3 py-2">10~14주</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">일본</td>
                  <td className="px-3 py-2">HACCP, 식품위생법, 즉석면류 표시 의무</td>
                  <td className="px-3 py-2">JAS 인증</td>
                  <td className="px-3 py-2">4~8주</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            4. 인증 보유 한국 라면 OEM 공급사 예시 (익명화 sample)
          </h2>
          <p className="mb-6 text-sm text-slate-600">
            아래 3개 사례는 Totaro 매칭 풀의 익명화된 industry sample 이다.
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
                    <dd className="font-mono text-slate-800">
                      {s.annualExportBoxes.toLocaleString()}박스+
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">MOQ</dt>
                    <dd className="font-mono text-slate-800">{s.moqBoxes.toLocaleString()}박스</dd>
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

        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            5. 한국 라면 OEM 매칭 플랫폼 비교 — Totaro vs KOTRA buyKOREA vs Alibaba
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
                  <td className="px-3 py-2">한국 식품 OEM 특화 (라면 SKU 분류)</td>
                  <td className="px-3 py-2">한국 산업 전반</td>
                  <td className="px-3 py-2">글로벌 일반 B2B</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">할랄 공급사 필터</td>
                  <td className="px-3 py-2">JAKIM/MUI 인증 별 필터</td>
                  <td className="px-3 py-2">미지원</td>
                  <td className="px-3 py-2">키워드 검색만</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">SKU 커스터마이즈 매칭</td>
                  <td className="px-3 py-2">R&D 능력별 매칭</td>
                  <td className="px-3 py-2">기본 정보만</td>
                  <td className="px-3 py-2">개별 메시징</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">평균 매칭 소요</td>
                  <td className="px-3 py-2">5~10일</td>
                  <td className="px-3 py-2">3~5주</td>
                  <td className="px-3 py-2">즉시 (검색 결과)</td>
                </tr>
                <tr>
                  <td className="px-3 py-2 font-medium">비용</td>
                  <td className="px-3 py-2">매칭 성공 시 수수료</td>
                  <td className="px-3 py-2">무료 (정부 지원)</td>
                  <td className="px-3 py-2">유료 회원 + 수수료</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

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

        <footer className="mt-16 border-t border-slate-200 pt-8">
          <h2 className="mb-3 text-xl font-semibold">데이터 출처</h2>
          <ul className="mb-8 list-inside list-disc space-y-1 text-sm text-slate-700">
            <li>aT 한국농수산식품유통공사 — 라면 수출통계 (2024·2025)</li>
            <li>KOTRA — 한국 면류 수출 동향 리포트</li>
            <li>KITA 한국무역협회 — 식품 수출 통계</li>
            <li>식약처(MFDS) — 즉석면류 수출 가이드라인</li>
            <li>한국이슬람중앙회 (KMF) — 할랄 인증 디렉토리</li>
          </ul>

          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold">방법론 / Disclaimer</h3>
            <p className="text-sm text-slate-700">
              본 가이드의 수치는 aT·KITA 공개 통계를 집계한 industry estimate 다. 특정 공급사·SKU
              실거래 단가·MOQ·리드타임은 시점·계약 조건에 따라 변동한다.
            </p>
          </div>

          <div className="text-sm text-slate-600">
            <p>
              작성: <strong className="text-slate-900">{AUTHOR_NAME}</strong> · Totaro · 발행{' '}
              <time dateTime={PUBLISHED}>2026년 5월 28일</time>
            </p>
          </div>
        </footer>
      </article>
    </main>
  )
}
