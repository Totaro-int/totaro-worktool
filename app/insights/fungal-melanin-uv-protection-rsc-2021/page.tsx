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
        {/* HEADER */}
        <header className="mb-10 border-b border-slate-200 pb-8">
          <nav className="mb-4 text-xs text-slate-500">
            <Link href="/" className="hover:underline">
              Totaro
            </Link>
            {' / '}
            <Link href="/insights" className="hover:underline">
              Insights
            </Link>
            {' / 진균 멜라닌 자외선 차단 데이터'}
          </nav>

          <p className="mb-3 text-xs font-medium tracking-wider text-emerald-700 uppercase">
            RSC Advances 2021 · Peer-Reviewed · Data Brief
          </p>

          <h1
            itemProp="headline"
            className="text-3xl leading-tight font-bold tracking-tight text-slate-900 md:text-4xl"
          >
            진균 멜라닌 자외선 차단 데이터
          </h1>
          <p className="mt-2 text-lg text-slate-700" itemProp="alternativeHeadline" lang="en">
            {SUBTITLE_EN}
          </p>
          <p className="mt-1 text-sm text-slate-500">
            2021 RSC 논문이 정리한 SPF·UVA/UVB·항산화·세포 안전성
          </p>

          {/* INVERTED PYRAMID LEDE — 모든 핵심 fact 첫 단락 */}
          <p itemProp="description" className="mt-6 text-base leading-relaxed text-slate-800">
            <strong>
              Amorphotheca resinae 유래 진균 멜라닌 5% 크림이 in vitro SPF 2.5, 임계파장 388 nm,
              UVA/UVB 0.87을 기록하며 FDA·EU 광역차단 기준을 모두 충족했다.
            </strong>{' '}
            ORAC 항산화 활성은 비타민 C(아스코르브산) 동등 수준이었고, HaCaT 인간 각질세포 4 mg/mL ×
            72시간 노출에서 통계적 세포독성이 검출되지 않았다. 본 글은 RSC Advances 2021 (DOI{' '}
            <a href={DOI_URL} className="text-emerald-700 underline">
              {DOI}
            </a>
            )의 정량 데이터를 그대로 정리하면서, 한계까지 함께 공개한다.
          </p>

          {/* QUICK FACTS (3-bullet) */}
          <ul className="mt-6 space-y-2 text-sm text-slate-800">
            <li>
              · 5% 멜라닌 크림 <strong>in vitro SPF 2.5</strong>, λc 388 nm, UVA/UVB 0.87
            </li>
            <li>
              · <strong>ORAC 비타민 C 동등</strong>, 환원 글루타치온(GSH) 초과
            </li>
            <li>
              · <strong>HaCaT 4 mg/mL × 72h 무독성</strong> (MTT, p &gt; 0.05)
            </li>
          </ul>

          <dl className="mt-8 grid grid-cols-2 gap-4 text-sm md:grid-cols-4">
            <div>
              <dt className="text-slate-500">발행</dt>
              <dd className="font-medium">
                <time itemProp="datePublished" dateTime={PUBLISHED}>
                  2026년 5월 29일
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
                <span itemProp="name">{AUTHOR_NAME}</span> · Totaro COS
              </dd>
            </div>
            <div>
              <dt className="text-slate-500">원논문</dt>
              <dd className="font-medium">RSC Advances 2021</dd>
            </div>
            <div>
              <dt className="text-slate-500">읽는 시간</dt>
              <dd className="font-medium">약 7분</dd>
            </div>
          </dl>
        </header>

        {/* SECTION 1 — KEY DATA TABLE */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            1. 핵심 수치 — 멜라닌 함량별 자외선 차단 성능
          </h2>
          <p className="mb-4 text-slate-800">
            <strong>5% 농도에서 in vitro SPF 2.5, λc 388 nm, UVA/UVB 0.87.</strong> 0.5%부터 5%까지
            모든 농도에서 FDA·EU 광역차단 기준(λc ≥ 370 nm + UVA/UVB ≥ 0.81)을 통과했다. 농도 증가에
            비례한 SPF 상승은 명확했지만, 단일 성분 SPF 절대값은 상업 기준에 미달한다.
          </p>

          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom pt-2 text-left text-xs text-slate-500">
                출처: Oh et al., RSC Advances 2021 — Table 1 데이터 재구성
              </caption>
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">멜라닌 함량</th>
                  <th className="px-3 py-2 text-right font-semibold">in vitro SPF</th>
                  <th className="px-3 py-2 text-right font-semibold">임계파장 λc</th>
                  <th className="px-3 py-2 text-right font-semibold">UVA/UVB</th>
                  <th className="px-3 py-2 text-right font-semibold">광역차단 기준</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {SPF_DATA.map((row) => (
                  <tr key={row.melanin}>
                    <td className="px-3 py-2">{row.melanin}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.spf}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.lambdaC}</td>
                    <td className="px-3 py-2 text-right font-mono">{row.uvaUvb}</td>
                    <td className="px-3 py-2 text-right">{row.broadSpectrum}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 2 — 논문 한 줄 요약 + 방법론 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">2. 논문 한 줄 요약 — RSC Advances 2021</h2>
          <p className="mb-4 text-slate-800">
            <strong>
              Oh, Jeong-Joo 등은 Amorphotheca resinae KUC2024 균주에서 추출한 진균 멜라닌을 시판
              무향 크림에 0.5~5% 혼합 후 자외선·항산화·세포 안전성 3축 종합 평가를 수행했다.
            </strong>{' '}
            원료 처리는 알칼리 추출 → 산 침전 → 세척 → 동결건조 → 30분 가수분해 → 동결 보관 → 크림
            혼합 순. 사용 균주(KUC2024)는 폴리유전체학 항산화 진균으로 알려진 종이며, 본 논문은 동일
            균주의 멜라닌 분획만 분리해 화장품 소재 잠재력을 정량화했다.
          </p>
        </section>

        {/* SECTION 3 — 자외선 차단 성능 (해설) */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">3. 자외선 차단 성능 — SPF·λc·광역 기준</h2>
          <p className="mb-4 text-slate-800">
            in vitro SPF는 농도에 비례해 1.4(0.5%) → 2.5(5%)로 증가했다. 동시에{' '}
            <strong>UV-Vis 365 nm 부근에서 멜라닌 π → π* 전이</strong>가 광범위한 흡수를 형성해
            UVA·UVB 양쪽을 동시에 흡수한다. 이게 광역 차단 기준 충족의 분자적 이유다.
          </p>
          <ol className="list-inside list-decimal space-y-2 text-slate-800">
            <li>
              <strong>임계파장 λc 388 nm</strong> — FDA 광역 기준 (370 nm) 초과
            </li>
            <li>
              <strong>UVA/UVB 비율 0.84~0.90</strong> — EU 광역 기준 (≥ 0.81) 충족
            </li>
            <li>
              <strong>광역 흡수 메커니즘</strong> — 멜라닌 indolyl 단량체 π 공액 시스템
            </li>
            <li>
              <strong>UV-B 흡수 + ROS 항산화 dual</strong> — 2차 광손상 방어 동시
            </li>
          </ol>
        </section>

        {/* SECTION 4 — 항산화·세포 안전성 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">4. 항산화·세포 안전성 — ORAC 와 MTT</h2>

          <h3 className="mt-6 mb-2 text-lg font-semibold">4-1. ORAC — 비타민 C 동등 수준</h3>
          <p className="mb-4 text-slate-800">
            <strong>ORAC(Oxygen Radical Absorbance Capacity)는</strong> AAPH 라디칼이 유도한
            플루오레세인 형광 감쇠를 Trolox 등가량으로 환산하는 표준 항산화 측정법이다. 진균
            멜라닌의 ORAC 값은 <strong>아스코르브산(비타민 C)과 유사하게 측정</strong>됐고, 환원
            글루타치온(GSH)을 초과했다. 자유라디칼 소거 기전은 FTIR에서 확인된 퀴논(C=O, 1629 cm⁻¹)
            + 페놀 C-OH(1339 cm⁻¹) 작용기에 의한 수소 공여로 추정된다.
          </p>

          <h3 className="mt-6 mb-2 text-lg font-semibold">4-2. MTT — HaCaT 무독성</h3>
          <p className="mb-4 text-slate-800">
            <strong>
              HaCaT 인간 각질세포에서 멜라닌 함량 0~4 mg/mL × 24·48·72시간 노출 후 MTT 어세이로 세포
              생존율 측정 → 모든 농도·시간 조건에서 통계적으로 유의한 세포독성이 검출되지 않았다.
            </strong>{' '}
            (p &gt; 0.05) 단, 96시간·만성 노출 데이터는 본 논문 범위 밖.
          </p>

          {/* PULL QUOTE — LLM-quotable unit */}
          <blockquote className="my-6 border-l-4 border-emerald-500 bg-emerald-50 px-5 py-4 text-base italic">
            &ldquo;안전하다는 결론보다는, <strong>검출되지 않았다는 메시지가 더 정확합니다.</strong>{' '}
            본 논문은 SPF·λc·UVA/UVB·ORAC·MTT 5개 측정 모두 수치로 제시했어요.&rdquo;
          </blockquote>
        </section>

        {/* SECTION 5 — 비교 unit (Naver 글에 없던 추가) */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">
            5. 시판 자외선 차단 성분 비교 — 옥시벤존 vs ZnO/TiO₂ vs 진균 멜라닌
          </h2>
          <p className="mb-4 text-slate-800">
            진균 멜라닌을 기존 자외선 차단제와 6개 축으로 비교했다. 단일 차단제로는 부족하지만{' '}
            <strong>항산화·환경 부담·생체적합성 3축에서 명확한 강점</strong>이 있다.
          </p>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-slate-300 bg-slate-50">
                  <th className="px-3 py-2 text-left font-semibold">항목</th>
                  <th className="px-3 py-2 text-left font-semibold">옥시벤존 (유기)</th>
                  <th className="px-3 py-2 text-left font-semibold">ZnO·TiO₂ (무기)</th>
                  <th className="px-3 py-2 text-left font-semibold">진균 멜라닌 (RSC 2021)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {COMPARISON.map((row) => (
                  <tr key={row.spec}>
                    <td className="px-3 py-2 font-medium">{row.spec}</td>
                    <td className="px-3 py-2">{row.oxybenzone}</td>
                    <td className="px-3 py-2">{row.zincTitanium}</td>
                    <td className="px-3 py-2">{row.fungalMelanin}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 6 — 한계 */}
        <section className="mb-12">
          <h2 className="mb-4 text-2xl font-semibold">6. 한계 — 솔직히 짚어야 할 3가지</h2>
          <div className="space-y-4">
            {LIMITATIONS.map((item) => (
              <div
                key={item.title}
                className="rounded-lg border border-amber-200 bg-amber-50/50 p-5"
              >
                <h3 className="mb-2 text-base font-semibold text-amber-900">⚠️ {item.title}</h3>
                <p className="text-sm text-slate-800">{item.detail}</p>
              </div>
            ))}
          </div>

          <blockquote className="my-6 border-l-4 border-slate-400 bg-slate-50 px-5 py-4 text-base italic">
            &ldquo;데이터를 멀리까지 보는 습관이 안전한 선택의 시작입니다. 멜라닌 → 화장품 인용은
            모두 출처·DOI 까지 추적 가능해야 합니다.&rdquo;
          </blockquote>
        </section>

        {/* SECTION 7 — FAQ */}
        <section className="mb-12">
          <h2 className="mb-6 text-2xl font-semibold">7. 자주 묻는 질문 (FAQ)</h2>
          <div className="space-y-6">
            {FAQS.map((item, i) => (
              <div key={item.q} itemScope itemType="https://schema.org/Question">
                <h3 itemProp="name" className="mb-2 text-lg font-semibold text-slate-900">
                  Q{i + 1}. {item.q}
                </h3>
                <div
                  itemProp="acceptedAnswer"
                  itemScope
                  itemType="https://schema.org/Answer"
                  className="text-slate-800"
                >
                  <p itemProp="text" className="leading-relaxed">
                    <span className="font-semibold text-slate-700">A. </span>
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* FOOTER — citation + author */}
        <footer className="mt-16 border-t border-slate-200 pt-8">
          <h2 className="mb-3 text-xl font-semibold">원문 확인</h2>
          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <p className="text-sm text-slate-800">
              <strong>Oh, Jeong-Joo et al.</strong> &ldquo;Fungal melanin as a biocompatible
              broad-spectrum sunscreen with high antioxidant activity.&rdquo; <em>RSC Advances</em>{' '}
              2021. DOI:{' '}
              <a href={DOI_URL} className="text-emerald-700 underline">
                {DOI}
              </a>
            </p>
            <p className="mt-2 text-sm text-slate-700">
              <a href={DOI_URL} className="text-emerald-700 underline">
                {DOI_URL}
              </a>
            </p>
          </div>

          <h2 className="mb-3 text-xl font-semibold">데이터 출처 & 보조 참고</h2>
          <ul className="mb-8 list-inside list-disc space-y-1 text-sm text-slate-700">
            <li>FDA Sunscreen Final Monograph (Broad-spectrum criteria, λc ≥ 370 nm)</li>
            <li>EU Cosmetics Regulation 1223/2009 — UVA/UVB ratio ≥ 1/3 (0.33)</li>
            <li>식약처 화장품 원료 등재 가이드라인 (2024)</li>
            <li>
              Cao et al., Pigment Cell &amp; Melanoma Research 2021 — Melanin photoprotection 종설
            </li>
          </ul>

          <div className="mb-8 rounded-lg border border-slate-200 bg-slate-50 p-5">
            <h3 className="mb-2 text-base font-semibold">방법론 / Disclaimer</h3>
            <p className="text-sm text-slate-700">
              본 글은 RSC Advances 2021 논문의 공개 데이터를 정리·해설한 학술 브리프입니다. 상업적
              광고·의학적 진단·치료 권고가 아니며, 자외선 차단제 선택은 SPF·PA·임상 자료 기반의 개별
              판단이 필요합니다. 한국 화장품 OEM 에 진균 멜라닌 적용 가능성은{' '}
              <Link href="/" className="text-emerald-700 underline">
                Totaro COS 매칭 상담
              </Link>{' '}
              을 통해 R&D 능력 보유 공급사를 확인할 수 있습니다.
            </p>
          </div>

          <div className="text-sm text-slate-600">
            <p>
              작성: <strong className="text-slate-900">{AUTHOR_NAME}</strong> · Totaro COS · 발행{' '}
              <time dateTime={PUBLISHED}>2026년 5월 29일</time>
            </p>
            <p className="mt-2">
              Totaro COS는 한국 화장품 OEM 공급사와 해외 바이어를 연결하는 B2B 매칭 플랫폼이다.
              원료·인증·R&D 능력을 검증한 후 매칭한다.
            </p>
          </div>
        </footer>
      </article>
    </main>
  )
}
