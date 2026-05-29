import type { JSX } from 'react'

import Link from 'next/link'

import type { Metadata } from 'next'

const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'fungal-melanin-uv-protection-rsc-2021'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-29T09:00:00+09:00'
const MODIFIED = '2026-05-29T09:00:00+09:00'
const AUTHOR_NAME = '윤태준'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Totaro COS'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`

const TITLE =
  '진균 멜라닌 자외선 차단 데이터 — 2021 RSC 논문이 정리한 SPF·UVA/UVB·항산화·세포 안전성'
const SUBTITLE_EN = 'Fungal Melanin as Broad-Spectrum Sunscreen — RSC Advances 2021 Data Brief'
const DESCRIPTION =
  'Amorphotheca resinae 유래 진균 멜라닌 5% 크림이 in vitro SPF 2.5, 임계파장 388 nm, UVA/UVB 0.87을 기록하며 FDA·EU 광역차단 기준을 모두 충족. ORAC 항산화는 비타민 C 동등, HaCaT 인간 각질세포 4 mg/mL × 72h 무독성. RSC Advances 2021 (DOI 10.1039/d1ra02583j) 정량 데이터 정리.'

const DOI = '10.1039/d1ra02583j'
const DOI_URL = `https://doi.org/${DOI}`

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
    alternateLocale: ['en_US'],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
}

const SPF_DATA = [
  {
    melanin: '0% (순수 크림)',
    spf: '1.0 ± 0.1',
    lambdaC: '—',
    uvaUvb: '—',
    broadSpectrum: '해당 없음',
  },
  {
    melanin: '0.5%',
    spf: '1.4 ± 0.1',
    lambdaC: '388.8 ± 0.5 nm',
    uvaUvb: '0.88 ± 0.04',
    broadSpectrum: '충족',
  },
  {
    melanin: '1%',
    spf: '1.5 ± 0.1',
    lambdaC: '388.8 ± 0.4 nm',
    uvaUvb: '0.90 ± 0.02',
    broadSpectrum: '충족',
  },
  {
    melanin: '3%',
    spf: '2.0 ± 0.2',
    lambdaC: '388 nm',
    uvaUvb: '0.84 ± 0.01',
    broadSpectrum: '충족',
  },
  {
    melanin: '5%',
    spf: '2.5 ± 0.1',
    lambdaC: '388 nm',
    uvaUvb: '0.87 ± 0.01',
    broadSpectrum: '충족',
  },
] as const

const COMPARISON = [
  {
    spec: '메커니즘',
    oxybenzone: '유기 흡수 (UV-B + 일부 UV-A)',
    zincTitanium: '무기 반사·산란',
    fungalMelanin: '광역 흡수 + ROS 항산화',
  },
  {
    spec: '광역 차단 (broad-spectrum)',
    oxybenzone: '부분 (UVA 약함)',
    zincTitanium: '충족',
    fungalMelanin: '충족 (λc 388 nm)',
  },
  {
    spec: '항산화 활성',
    oxybenzone: '없음',
    zincTitanium: '없음',
    fungalMelanin: '비타민 C 동등',
  },
  {
    spec: '환경 부담',
    oxybenzone: '⚠️ 산호초 백화·내분비 교란 우려',
    zincTitanium: '나노 입자 논쟁',
    fungalMelanin: '생체적합성 (생분해)',
  },
  {
    spec: '백탁 (whitening cast)',
    oxybenzone: '없음',
    zincTitanium: '있음 (특히 ZnO)',
    fungalMelanin: '갈색 색조 (저감 가능)',
  },
  {
    spec: '단독 SPF 수준 (실측)',
    oxybenzone: 'SPF 15~30 (4~6% 농도)',
    zincTitanium: 'SPF 20~50+ (10~25% 농도)',
    fungalMelanin: 'SPF 2.5 (5% 농도) — 보조용',
  },
] as const

const FAQS = [
  {
    q: '진균 멜라닌 5% 크림을 일상 자외선 차단제로 쓸 수 있나요?',
    a: '본 논문의 in vitro SPF 2.5는 광역차단 기준(λc·UVA/UVB)은 충족하지만, 상업 선스크린의 최소 SPF 15+에는 미달합니다. 단일 차단제 자리는 어렵고, 다른 차단 성분(옥시벤존·ZnO·TiO₂)과의 시너지 배합이 향후 과제로 남아 있어요. 보조 차단제·항산화 부스터로 평가하는 게 정확합니다.',
  },
  {
    q: '"광역차단 기준 충족"이 정확히 무슨 의미인가요?',
    a: 'FDA·EU 광역(broad-spectrum) 기준은 임계파장 λc ≥ 370 nm + UVA/UVB 비율 ≥ 0.81입니다. 본 논문은 모든 농도(0.5~5%)에서 λc 약 388 nm, UVA/UVB 0.84~0.90으로 두 기준 모두 통과했습니다.',
  },
  {
    q: 'ORAC "비타민 C 동등"은 신뢰할 수 있는 표현인가요?',
    a: '정성적 비교는 명확하지만(Figure 4), μM Trolox equivalent/g 절대값 수치가 본문에 명시되지 않은 한계가 있어요. 직접 정량 비교를 하려면 원저자 데이터 요청 또는 자체 ORAC 측정이 필요합니다.',
  },
  {
    q: '멜라노사이트 영양 제품도 같은 자외선 차단 효과를 가지나요?',
    a: '멜라노사이트 영양은 반영구 시술·미용 영역이고, 본 RSC 논문은 진균 유래 멜라닌 분자의 광역 자외선 차단을 학술적으로 검증한 자료입니다. 멜라노사이트 영양 제품의 보습·미백 효과 추정과는 분리하며, 본 논문은 자외선 차단 기능을 표방하지 않습니다.',
  },
  {
    q: '한국 화장품 OEM 에 이 진균 멜라닌을 적용할 수 있나요?',
    a: '현재 시점 상업화 단계는 R&D 후기/파일럿 수준이며, 식약처 화장품 원료 등재·MoCRA(미국) 신고 절차가 추가로 필요합니다. Totaro COS 매칭에서 진균 멜라닌 R&D 능력 보유 OEM 공급사 검색이 가능하지만, 즉시 양산이 아니라 공동 연구 형태가 일반적입니다.',
  },
] as const

const LIMITATIONS = [
  {
    title: 'SPF 2.5는 상업 기준에 미달',
    detail:
      'in vitro SPF 2.5는 광역에서 기준(상업 선스크린 최소 SPF 15+)에 못 미칩니다. 단일 성분으로 충분한 차단제가 되기 어렵고, 향후 기존 자외선 차단제와 조합한 보조 차단제·항산화 부스터 포지셔닝이 현실적.',
  },
  {
    title: 'ORAC 절대값 미공개, 그래프만 표시',
    detail:
      'Figure 4에서 비타민 C와 정성적으로 비교했지만, μM Trolox equivalent/g 절대값은 본문·SI 어디에도 공개되지 않았습니다. 다른 항산화 소재와 정량 비교가 불가능하다는 게 가장 큰 한계.',
  },
  {
    title: '96시간 세포독성은 결과에 빠져 있음',
    detail:
      'MTT 어세이는 24·48·72시간 시점만 다뤘고, 화장품 실사용 노출에 더 가까운 96시간·장기(7~14일) 데이터가 빠져 있어요. 만성 노출 시 안전성은 본 논문 범위 밖.',
  },
] as const

function jsonLdArticle(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: TITLE,
    alternativeHeadline: SUBTITLE_EN,
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
      {
        '@type': 'ScholarlyArticle',
        headline:
          'Fungal melanin as a biocompatible broad-spectrum sunscreen with high antioxidant activity',
        author: 'Oh, Jeong-Joo et al.',
        datePublished: '2021',
        isPartOf: { '@type': 'Periodical', name: 'RSC Advances', issn: '2046-2069' },
        identifier: DOI,
        sameAs: DOI_URL,
      },
    ],
    about: [
      { '@type': 'Thing', name: 'Fungal Melanin' },
      { '@type': 'Thing', name: 'Amorphotheca resinae' },
      { '@type': 'Thing', name: 'Sunscreen (Broad-spectrum)' },
      { '@type': 'Thing', name: 'Antioxidant (ORAC)' },
      { '@type': 'Thing', name: 'HaCaT keratinocyte cytotoxicity' },
      { '@type': 'Thing', name: 'Korean Cosmetics OEM' },
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
      'Totaro COS는 한국 화장품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼입니다. 원료·인증·R&D 능력을 검증한 후 매칭합니다.',
  })
}

function jsonLdBreadcrumb(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Totaro', item: ORG_URL },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_BASE}/insights` },
      { '@type': 'ListItem', position: 3, name: '진균 멜라닌 자외선 차단 데이터', item: CANONICAL },
    ],
  })
}

export default function Page(): JSX.Element {
  return (
    <main className="bg-gradient-to-b from-stone-50 via-white to-emerald-50/30 text-stone-900">
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdArticle() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaqPage() }} />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLdOrganization() }}
      />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb() }} />

      {/* HERO — soft gradient + 부드러운 blur orb + 큰 영문 부제 + 수치 카드 */}
      <div className="relative overflow-hidden border-b border-stone-200/60 bg-gradient-to-br from-rose-50 via-amber-50/40 to-emerald-50">
        <div className="absolute -top-20 -right-20 h-72 w-72 rounded-full bg-rose-200/30 blur-3xl" />
        <div className="absolute -bottom-32 -left-20 h-80 w-80 rounded-full bg-emerald-200/40 blur-3xl" />

        <div className="relative mx-auto max-w-3xl px-6 pt-12 pb-16">
          <nav className="mb-8 text-xs text-stone-500">
            <Link href="/" className="transition-colors hover:text-emerald-700">
              Totaro
            </Link>
            <span className="mx-2 text-stone-300">/</span>
            <Link href="/insights" className="transition-colors hover:text-emerald-700">
              Insights
            </Link>
            <span className="mx-2 text-stone-300">/</span>
            <span className="text-stone-700">진균 멜라닌 자외선 차단 데이터</span>
          </nav>

          <div className="mb-6 inline-flex items-center gap-2 rounded-full bg-white/80 px-4 py-1.5 text-xs font-medium tracking-wider text-emerald-800 uppercase shadow-sm ring-1 ring-emerald-200/60 backdrop-blur">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
            RSC Advances 2021 · Peer-Reviewed
          </div>

          <h1
            itemProp="headline"
            className="text-4xl leading-[1.15] font-bold tracking-tight text-stone-900 md:text-5xl"
          >
            진균 멜라닌
            <br />
            <span className="bg-gradient-to-r from-emerald-700 to-rose-600 bg-clip-text text-transparent">
              자외선 차단 데이터
            </span>
          </h1>
          <p
            className="mt-4 font-serif text-xl text-stone-600 italic md:text-2xl"
            itemProp="alternativeHeadline"
            lang="en"
          >
            {SUBTITLE_EN}
          </p>

          <p
            itemProp="description"
            className="mt-8 text-lg leading-relaxed font-light text-stone-800"
          >
            <strong className="font-semibold text-stone-900">
              Amorphotheca resinae 유래 진균 멜라닌 5% 크림이 in vitro SPF 2.5, 임계파장 388 nm,
              UVA/UVB 0.87을 기록
            </strong>
            하며 FDA·EU 광역차단 기준을 모두 충족했다. ORAC 항산화 활성은 비타민 C 동등, HaCaT 인간
            각질세포 4 mg/mL × 72시간에서 세포독성 미검출. RSC Advances 2021 (DOI{' '}
            <a
              href={DOI_URL}
              className="text-emerald-700 underline decoration-emerald-300 underline-offset-4 transition-colors hover:decoration-emerald-600"
            >
              {DOI}
            </a>
            ) 정량 데이터 정리.
          </p>

          {/* HERO NUMBER CARDS — 핵심 3수치 */}
          <div className="mt-10 grid grid-cols-3 gap-3">
            <div className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-stone-200/60 backdrop-blur transition-transform hover:-translate-y-0.5">
              <p className="text-[10px] font-medium tracking-wider text-stone-500 uppercase">
                in vitro SPF
              </p>
              <p className="mt-1 font-serif text-4xl font-bold text-emerald-800">2.5</p>
              <p className="mt-1 text-xs text-stone-500">± 0.1 (5% 농도)</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-stone-200/60 backdrop-blur transition-transform hover:-translate-y-0.5">
              <p className="text-[10px] font-medium tracking-wider text-stone-500 uppercase">
                임계파장 λc
              </p>
              <p className="mt-1 font-serif text-4xl font-bold text-rose-700">388</p>
              <p className="mt-1 text-xs text-stone-500">nm · 광역차단 ✓</p>
            </div>
            <div className="rounded-2xl bg-white/90 p-5 shadow-sm ring-1 ring-stone-200/60 backdrop-blur transition-transform hover:-translate-y-0.5">
              <p className="text-[10px] font-medium tracking-wider text-stone-500 uppercase">
                UVA/UVB
              </p>
              <p className="mt-1 font-serif text-4xl font-bold text-amber-700">0.87</p>
              <p className="mt-1 text-xs text-stone-500">FDA/EU 기준 통과</p>
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-stone-200/60 pt-6 text-sm md:grid-cols-4">
            <div>
              <dt className="text-xs tracking-wide text-stone-500 uppercase">발행</dt>
              <dd className="mt-1 font-medium text-stone-800">
                <time itemProp="datePublished" dateTime={PUBLISHED}>
                  2026년 5월 29일
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-stone-500 uppercase">저자</dt>
              <dd
                className="mt-1 font-medium text-stone-800"
                itemProp="author"
                itemScope
                itemType="https://schema.org/Person"
              >
                <span itemProp="name">{AUTHOR_NAME}</span> · Totaro COS
              </dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-stone-500 uppercase">원논문</dt>
              <dd className="mt-1 font-medium text-stone-800">RSC Advances 2021</dd>
            </div>
            <div>
              <dt className="text-xs tracking-wide text-stone-500 uppercase">읽는 시간</dt>
              <dd className="mt-1 font-medium text-stone-800">약 7분</dd>
            </div>
          </dl>
        </div>
      </div>

      <article
        itemScope
        itemType="https://schema.org/Article"
        className="mx-auto max-w-3xl px-6 py-16"
      >
        {/* SECTION 1 — KEY DATA TABLE */}
        <section className="mb-12">
          <SectionHeading n={1} title="핵심 수치" subtitle="멜라닌 함량별 자외선 차단 성능" />
          <p className="mb-6 leading-relaxed text-stone-700">
            <strong className="text-stone-900">
              5% 농도에서 in vitro SPF 2.5, λc 388 nm, UVA/UVB 0.87.
            </strong>{' '}
            0.5%부터 5%까지 모든 농도에서 FDA·EU 광역차단 기준(λc ≥ 370 nm + UVA/UVB ≥ 0.81)을
            통과했다. 농도 증가에 비례한 SPF 상승은 명확했지만, 단일 성분 SPF 절대값은 상업 기준에
            미달한다.
          </p>

          <div className="overflow-hidden rounded-2xl border border-stone-200/80 shadow-sm">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom bg-stone-50/80 px-4 py-2 text-left text-xs text-stone-500">
                출처: Oh et al., RSC Advances 2021 — Table 1 데이터 재구성
              </caption>
              <thead>
                <tr className="border-b border-stone-200 bg-gradient-to-r from-emerald-50 to-rose-50/60">
                  <th className="px-4 py-3 text-left font-semibold text-stone-800">멜라닌 함량</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-800">
                    in vitro SPF
                  </th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-800">임계파장 λc</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-800">UVA/UVB</th>
                  <th className="px-4 py-3 text-right font-semibold text-stone-800">광역차단</th>
                </tr>
              </thead>
              <tbody>
                {SPF_DATA.map((row, i) => (
                  <tr
                    key={row.melanin}
                    className={`border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}
                  >
                    <td className="px-4 py-3 font-medium text-stone-800">{row.melanin}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-700">{row.spf}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-700">{row.lambdaC}</td>
                    <td className="px-4 py-3 text-right font-mono text-stone-700">{row.uvaUvb}</td>
                    <td className="px-4 py-3 text-right">
                      {row.broadSpectrum === '충족' ? (
                        <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-medium text-emerald-800">
                          ✓ {row.broadSpectrum}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">{row.broadSpectrum}</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 2 */}
        <section className="mb-16">
          <SectionHeading n={2} title="논문 한 줄 요약" subtitle="RSC Advances 2021" />
          <p className="leading-relaxed text-stone-700">
            <strong className="text-stone-900">
              Oh, Jeong-Joo 등은 Amorphotheca resinae KUC2024 균주에서 추출한 진균 멜라닌을 시판
              무향 크림에 0.5~5% 혼합 후 자외선·항산화·세포 안전성 3축 종합 평가를 수행했다.
            </strong>{' '}
            원료 처리는 알칼리 추출 → 산 침전 → 세척 → 동결건조 → 30분 가수분해 → 동결 보관 → 크림
            혼합 순. 사용 균주(KUC2024)는 폴리유전체학 항산화 진균으로 알려진 종이며, 본 논문은 동일
            균주의 멜라닌 분획만 분리해 화장품 소재 잠재력을 정량화했다.
          </p>
        </section>

        {/* SECTION 3 */}
        <section className="mb-16">
          <SectionHeading n={3} title="자외선 차단 성능" subtitle="SPF · λc · 광역 기준" />
          <p className="mb-6 leading-relaxed text-stone-700">
            in vitro SPF는 농도에 비례해 1.4(0.5%) → 2.5(5%)로 증가했다. 동시에{' '}
            <strong className="text-stone-900">UV-Vis 365 nm 부근에서 멜라닌 π → π* 전이</strong>가
            광범위한 흡수를 형성해 UVA·UVB 양쪽을 동시에 흡수한다. 이게 광역 차단 기준 충족의 분자적
            이유다.
          </p>
          <ol className="space-y-3 text-stone-700">
            {[
              ['임계파장 λc 388 nm', 'FDA 광역 기준 (370 nm) 초과'],
              ['UVA/UVB 비율 0.84~0.90', 'EU 광역 기준 (≥ 0.81) 충족'],
              ['광역 흡수 메커니즘', '멜라닌 indolyl 단량체 π 공액 시스템'],
              ['UV-B 흡수 + ROS 항산화 dual', '2차 광손상 방어 동시'],
            ].map(([title, desc], i) => (
              <li key={title} className="flex gap-3">
                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                  {i + 1}
                </span>
                <span>
                  <strong className="text-stone-900">{title}</strong>{' '}
                  <span className="text-stone-600">— {desc}</span>
                </span>
              </li>
            ))}
          </ol>
        </section>

        {/* SECTION 4 */}
        <section className="mb-16">
          <SectionHeading n={4} title="항산화 · 세포 안전성" subtitle="ORAC 와 MTT" />

          <h3 className="mt-2 mb-3 text-lg font-semibold text-stone-900">
            <span className="text-emerald-600">4-1.</span> ORAC — 비타민 C 동등 수준
          </h3>
          <p className="mb-6 leading-relaxed text-stone-700">
            <strong className="text-stone-900">ORAC(Oxygen Radical Absorbance Capacity)는</strong>{' '}
            AAPH 라디칼이 유도한 플루오레세인 형광 감쇠를 Trolox 등가량으로 환산하는 표준 항산화
            측정법이다. 진균 멜라닌의 ORAC 값은{' '}
            <strong className="text-stone-900">아스코르브산(비타민 C)과 유사하게 측정</strong>
            됐고, 환원 글루타치온(GSH)을 초과했다. 자유라디칼 소거 기전은 FTIR에서 확인된 퀴논(C=O,
            1629 cm⁻¹) + 페놀 C-OH(1339 cm⁻¹) 작용기에 의한 수소 공여로 추정된다.
          </p>

          <h3 className="mt-2 mb-3 text-lg font-semibold text-stone-900">
            <span className="text-emerald-600">4-2.</span> MTT — HaCaT 무독성
          </h3>
          <p className="mb-6 leading-relaxed text-stone-700">
            <strong className="text-stone-900">
              HaCaT 인간 각질세포에서 멜라닌 함량 0~4 mg/mL × 24·48·72시간 노출 후 MTT 어세이로 세포
              생존율 측정 → 모든 농도·시간 조건에서 통계적으로 유의한 세포독성이 검출되지 않았다.
            </strong>{' '}
            (p &gt; 0.05) 단, 96시간·만성 노출 데이터는 본 논문 범위 밖.
          </p>

          {/* PULL QUOTE */}
          <blockquote className="relative my-8 rounded-2xl border border-emerald-200/60 bg-gradient-to-br from-emerald-50 to-white p-8 shadow-sm">
            <div className="absolute -top-2 left-6 font-serif text-7xl leading-none text-emerald-300/80 select-none">
              &ldquo;
            </div>
            <p className="font-serif text-lg leading-relaxed text-stone-800 italic">
              안전하다는 결론보다는,{' '}
              <strong className="not-italic">검출되지 않았다는 메시지가 더 정확합니다.</strong> 본
              논문은 SPF·λc·UVA/UVB·ORAC·MTT 5개 측정 모두 수치로 제시했어요.
            </p>
          </blockquote>
        </section>

        {/* SECTION 5 */}
        <section className="mb-16">
          <SectionHeading
            n={5}
            title="시판 자외선 차단 성분 비교"
            subtitle="옥시벤존 vs ZnO/TiO₂ vs 진균 멜라닌"
          />
          <p className="mb-6 leading-relaxed text-stone-700">
            진균 멜라닌을 기존 자외선 차단제와 6개 축으로 비교했다. 단일 차단제로는 부족하지만{' '}
            <strong className="text-stone-900">
              항산화·환경 부담·생체적합성 3축에서 명확한 강점
            </strong>
            이 있다.
          </p>
          <div className="overflow-hidden rounded-2xl border border-stone-200/80 shadow-sm">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-stone-50 to-emerald-50/60">
                  <th className="border-b border-stone-200 px-4 py-3 text-left font-semibold text-stone-800">
                    항목
                  </th>
                  <th className="border-b border-stone-200 px-4 py-3 text-left font-semibold text-stone-700">
                    옥시벤존
                  </th>
                  <th className="border-b border-stone-200 px-4 py-3 text-left font-semibold text-stone-700">
                    ZnO·TiO₂
                  </th>
                  <th className="border-b border-stone-200 bg-emerald-100/60 px-4 py-3 text-left font-semibold text-emerald-900">
                    진균 멜라닌 ★
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.spec}
                    className={`border-b border-stone-100 ${i % 2 === 0 ? 'bg-white' : 'bg-stone-50/40'}`}
                  >
                    <td className="px-4 py-3 font-medium text-stone-800">{row.spec}</td>
                    <td className="px-4 py-3 text-stone-600">{row.oxybenzone}</td>
                    <td className="px-4 py-3 text-stone-600">{row.zincTitanium}</td>
                    <td className="bg-emerald-50/40 px-4 py-3 font-medium text-emerald-900">
                      {row.fungalMelanin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6 */}
        <section className="mb-16">
          <SectionHeading n={6} title="한계" subtitle="솔직히 짚어야 할 3가지" tone="amber" />
          <div className="space-y-4">
            {LIMITATIONS.map((item) => (
              <div
                key={item.title}
                className="rounded-2xl border border-amber-200/70 bg-gradient-to-br from-amber-50/80 to-white p-6 shadow-sm"
              >
                <h3 className="mb-2 flex items-center gap-2 text-base font-semibold text-amber-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-amber-200/80 text-xs">
                    !
                  </span>
                  {item.title}
                </h3>
                <p className="pl-8 text-sm leading-relaxed text-stone-700">{item.detail}</p>
              </div>
            ))}
          </div>

          <blockquote className="relative my-8 rounded-2xl border border-stone-200/80 bg-gradient-to-br from-stone-50 to-white p-8 shadow-sm">
            <div className="absolute -top-2 left-6 font-serif text-7xl leading-none text-stone-300 select-none">
              &ldquo;
            </div>
            <p className="font-serif text-lg leading-relaxed text-stone-700 italic">
              데이터를 멀리까지 보는 습관이 안전한 선택의 시작입니다. 멜라닌 → 화장품 인용은 모두
              출처·DOI 까지 추적 가능해야 합니다.
            </p>
          </blockquote>
        </section>

        {/* SECTION 7 — FAQ */}
        <section className="mb-16">
          <SectionHeading n={7} title="자주 묻는 질문" subtitle="FAQ" />
          <div className="space-y-5">
            {FAQS.map((item, i) => (
              <div
                key={item.q}
                itemScope
                itemType="https://schema.org/Question"
                className="rounded-2xl border border-stone-200/70 bg-white p-6 shadow-sm transition-shadow hover:shadow-md"
              >
                <h3
                  itemProp="name"
                  className="mb-3 flex items-start gap-3 text-base font-semibold text-stone-900 md:text-lg"
                >
                  <span className="flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-emerald-100 text-xs font-bold text-emerald-700">
                    Q{i + 1}
                  </span>
                  <span className="pt-0.5">{item.q}</span>
                </h3>
                <div
                  itemProp="acceptedAnswer"
                  itemScope
                  itemType="https://schema.org/Answer"
                  className="pl-10 text-stone-700"
                >
                  <p itemProp="text" className="leading-relaxed">
                    <span className="font-semibold text-emerald-700">A.</span> {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER — citation card */}
        <footer className="mt-16">
          <div className="mb-6 rounded-2xl border border-stone-200/80 bg-gradient-to-br from-emerald-50/60 via-white to-rose-50/40 p-8 shadow-sm">
            <p className="mb-3 text-xs font-medium tracking-wider text-emerald-800 uppercase">
              원문 확인 · Citation
            </p>
            <p className="font-serif text-base leading-relaxed text-stone-800">
              <strong className="text-stone-900">Oh, Jeong-Joo et al.</strong>{' '}
              <em>
                &ldquo;Fungal melanin as a biocompatible broad-spectrum sunscreen with high
                antioxidant activity.&rdquo;
              </em>{' '}
              RSC Advances, 2021.
            </p>
            <p className="mt-3 text-sm text-stone-600">
              DOI:{' '}
              <a
                href={DOI_URL}
                className="font-mono text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-600"
              >
                {DOI}
              </a>
            </p>
          </div>

          <details className="mb-6 rounded-2xl border border-stone-200/80 bg-white p-6 shadow-sm">
            <summary className="cursor-pointer text-sm font-semibold text-stone-800">
              데이터 출처 &amp; 보조 참고 (5개)
            </summary>
            <ul className="mt-4 space-y-2 pl-2 text-sm text-stone-600">
              <li>· FDA Sunscreen Final Monograph (Broad-spectrum criteria, λc ≥ 370 nm)</li>
              <li>· EU Cosmetics Regulation 1223/2009 — UVA/UVB ratio ≥ 1/3 (0.33)</li>
              <li>· 식약처 화장품 원료 등재 가이드라인 (2024)</li>
              <li>
                · Cao et al., Pigment Cell &amp; Melanoma Research 2021 — Melanin photoprotection
                종설
              </li>
            </ul>
          </details>

          <div className="mb-6 rounded-2xl border border-stone-200/60 bg-stone-50/50 p-6">
            <h3 className="mb-2 text-sm font-semibold text-stone-800">방법론 / Disclaimer</h3>
            <p className="text-sm leading-relaxed text-stone-600">
              본 글은 RSC Advances 2021 논문의 공개 데이터를 정리·해설한 학술 브리프입니다. 상업적
              광고·의학적 진단·치료 권고가 아니며, 자외선 차단제 선택은 SPF·PA·임상 자료 기반의 개별
              판단이 필요합니다. 한국 화장품 OEM 에 진균 멜라닌 적용 가능성은{' '}
              <Link
                href="/"
                className="text-emerald-700 underline decoration-emerald-300 underline-offset-4 hover:decoration-emerald-600"
              >
                Totaro COS 매칭 상담
              </Link>{' '}
              을 통해 R&amp;D 능력 보유 공급사를 확인할 수 있습니다.
            </p>
          </div>

          <div className="flex items-start gap-4 rounded-2xl bg-gradient-to-br from-stone-900 to-stone-800 p-6 text-white">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-emerald-400 to-rose-400 font-serif text-xl font-bold">
              {AUTHOR_NAME.charAt(0)}
            </div>
            <div className="flex-1 text-sm">
              <p className="font-semibold">
                {AUTHOR_NAME} <span className="text-stone-400">· Totaro COS</span>
              </p>
              <p className="mt-1 text-xs text-stone-400">
                발행 <time dateTime={PUBLISHED}>2026년 5월 29일</time>
              </p>
              <p className="mt-3 leading-relaxed text-stone-300">
                Totaro COS는 한국 화장품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼입니다.
                원료·인증·R&amp;D 능력을 검증한 후 매칭합니다.
              </p>
            </div>
          </div>
        </footer>
      </article>
    </main>
  )
}

function SectionHeading({
  n,
  title,
  subtitle,
  tone = 'emerald',
}: {
  n: number
  title: string
  subtitle?: string
  tone?: 'emerald' | 'amber' | 'rose'
}): JSX.Element {
  const toneClasses = {
    emerald: 'from-emerald-100 to-emerald-50 text-emerald-700 ring-emerald-200/60',
    amber: 'from-amber-100 to-amber-50 text-amber-700 ring-amber-200/60',
    rose: 'from-rose-100 to-rose-50 text-rose-700 ring-rose-200/60',
  }[tone]

  return (
    <div className="mb-6 flex items-baseline gap-4">
      <span
        className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br ${toneClasses} font-serif text-lg font-bold shadow-sm ring-1`}
      >
        {n}
      </span>
      <div>
        <h2 className="text-2xl leading-tight font-bold tracking-tight text-stone-900 md:text-[1.75rem]">
          {title}
        </h2>
        {subtitle && (
          <p className="mt-0.5 font-serif text-sm tracking-wide text-stone-500 italic">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  )
}
