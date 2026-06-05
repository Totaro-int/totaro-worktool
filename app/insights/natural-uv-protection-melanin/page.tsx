import type { JSX } from 'react'

import Link from 'next/link'

import { pretendard } from '@/app/fonts'

import type { Metadata } from 'next'

// ─── 회사: 멜라누아 (Melanoir). 핀트: 정보성 (천연 자외선 차단 지식 → 멜라누아 소프트).
//     디자인: 흑백 프리미엄 + Pretendard. 근거: RSC Advances 2021. ───
const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'natural-uv-protection-melanin'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-29T14:00:00+09:00'
const MODIFIED = '2026-05-29T14:00:00+09:00'
const AUTHOR_NAME = 'Melanoir Lab'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Melanoir'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`
const DOI = '10.1039/d1ra02583j'
const DOI_URL = `https://doi.org/${DOI}`

const TITLE = '천연 자외선 차단 성분, 멜라닌은 어디까지 왔나 — 화학 차단제 대안 연구 정리'
const SUBTITLE_EN = 'Natural UV Protection — What Melanin Research Reveals (and Its Limits)'
const DESCRIPTION =
  '옥시벤존 등 화학 자외선 차단제의 환경·피부 부담 논란 속에서 천연 차단 성분이 주목받는다. 천연 차단 성분의 3대 조건과, 멜라닌이 자외선을 막는 원리, 진균 멜라닌 연구(RSC Advances 2021)가 보여준 가능성과 한계를 정리한다.'

// 천연 자외선 차단 성분의 3대 조건 (핵심 지식)
const CRITERIA = [
  {
    title: '광역 차단 (Broad-spectrum)',
    detail:
      'UVA·UVB 양쪽을 모두 흡수해야 한다. 임계파장(λc)이 370 nm를 넘고 UVA/UVB 비율이 일정 기준 이상이어야 FDA·EU 광역 차단 기준을 충족한다.',
  },
  {
    title: '항산화 (2차 광손상 방어)',
    detail:
      '자외선이 피부에 만드는 활성산소(ROS)를 소거해야 한다. 차단(1차)과 항산화(2차)를 동시에 하는 성분이 이상적이다.',
  },
  {
    title: '세포 안전성',
    detail:
      '피부 각질세포에 독성이 없어야 한다. MTT 어세이 등으로 농도·시간별 세포 생존율을 검증한다.',
  },
] as const

// 천연 vs 화학 비교
const COMPARISON = [
  {
    spec: '메커니즘',
    chemical: '유기 흡수 (옥시벤존)',
    mineral: '무기 반사·산란 (ZnO·TiO₂)',
    melanin: '광역 흡수 + ROS 항산화',
  },
  {
    spec: '항산화 활성',
    chemical: '없음',
    mineral: '없음',
    melanin: '있음 (비타민 C 수준 보고)',
  },
  {
    spec: '환경 부담',
    chemical: '산호초 백화·내분비 교란 우려',
    mineral: '나노 입자 논쟁',
    melanin: '생체적합·생분해',
  },
  {
    spec: '단독 차단력',
    chemical: '높음 (SPF 15~30)',
    mineral: '높음 (SPF 20~50+)',
    melanin: '낮음 (보조·부스터 단계)',
  },
] as const

const FAQS = [
  {
    q: '화학 자외선 차단제는 정말 위험한가요?',
    a: '옥시벤존 등 일부 유기 차단 성분은 산호초 백화·내분비 교란 가능성으로 하와이 등 일부 지역에서 규제됩니다. 다만 "위험하다"기보다 환경·민감 피부 측면의 우려가 제기되는 단계이며, 규제·연구가 진행 중입니다. 무기(ZnO·TiO₂) 차단제나 천연 대안이 보완재로 연구됩니다.',
  },
  {
    q: '멜라닌은 어떻게 자외선을 막나요?',
    a: '멜라닌은 분자 내 π-공액 구조가 넓은 파장의 빛을 흡수하고, 동시에 활성산소(ROS)를 소거하는 항산화 작용을 합니다. 즉 차단(흡수)과 항산화를 동시에 하는 것이 합성 차단 성분과 다른 점입니다.',
  },
  {
    q: '진균 멜라닌으로 만든 선크림을 지금 살 수 있나요?',
    a: '아직 상용 완제품 단계가 아닙니다. RSC Advances 2021 연구에서 5% 진균 멜라닌 크림이 in vitro SPF 2.5로 측정됐는데, 이는 광역 차단 기준은 충족하지만 상업 선스크린 최소 SPF 15+에는 미달합니다. 현재는 보조 차단·항산화 부스터 소재로 평가되는 R&D 단계입니다.',
  },
  {
    q: '천연 자외선 차단 소재를 고를 때 무엇을 봐야 하나요?',
    a: '① 광역 차단(λc·UVA/UVB) 데이터, ② 항산화 활성(ORAC 등) 수치, ③ 세포 안전성(MTT) 데이터 — 이 세 가지를 공인 시험 데이터나 peer-review 논문으로 확인하는 것이 핵심입니다. "천연"이라는 단어보다 정량 데이터가 우선입니다.',
  },
] as const

// 천연 차단 소재 평가 체크리스트 (독자 가치)
const CHECKLIST = [
  '광역 차단(λc ≥ 370 nm, UVA/UVB 비율) 데이터가 있는가',
  '항산화 활성(ORAC 등) 정량 수치가 공개됐는가',
  '세포 안전성(MTT 등) 시험 데이터가 있는가',
  '단독 차단력인가, 보조·부스터 용도인가가 명확한가',
  '근거가 peer-review 논문 또는 공인기관 시험인가',
] as const

// 목차 (relate.kr 스타일 TOC)
const TOC = [
  { id: 'problem', title: '화학 자외선 차단제의 고민' },
  { id: 'criteria', title: '천연 차단 성분의 3대 조건' },
  { id: 'science', title: '멜라닌은 어떻게 자외선을 막나' },
  { id: 'comparison', title: '천연 멜라닌 vs 화학·무기 차단제' },
  { id: 'limits', title: '아직 남은 한계' },
  { id: 'faq', title: '자주 묻는 질문' },
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
    author: { '@type': 'Organization', name: AUTHOR_NAME, url: AUTHOR_URL },
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
      { '@type': 'Thing', name: '천연 자외선 차단 성분' },
      { '@type': 'Thing', name: 'Melanin photoprotection' },
      { '@type': 'Thing', name: '화학 자외선 차단제 대안' },
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

function jsonLdBreadcrumb(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Melanoir', item: ORG_URL },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE_BASE}/insights` },
      { '@type': 'ListItem', position: 3, name: '천연 자외선 차단 멜라닌 연구', item: CANONICAL },
    ],
  })
}

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
    locale: 'ko_KR',
    alternateLocale: ['en_US'],
  },
  twitter: { card: 'summary_large_image', title: TITLE, description: DESCRIPTION },
  robots: { index: true, follow: true },
}

export default function Page(): JSX.Element {
  return (
    <main className={`${pretendard.className} bg-white text-black`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdArticle() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaqPage() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb() }} />

      {/* HERO — 독자 문제 중심. 흑백 프리미엄. */}
      <div className="bg-black text-white">
        <div className="mx-auto max-w-3xl px-6 pt-12 pb-20">
          <nav className="mb-12 text-xs tracking-wide text-neutral-500">
            <Link href="/" className="transition-colors hover:text-white">
              Melanoir
            </Link>
            <span className="mx-2 text-neutral-700">/</span>
            <Link href="/insights" className="transition-colors hover:text-white">
              Insights
            </Link>
            <span className="mx-2 text-neutral-700">/</span>
            <span className="text-neutral-300">천연 자외선 차단 멜라닌</span>
          </nav>

          <div className="mb-8 inline-flex items-center gap-2 border border-white/25 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
            <span className="h-1 w-1 rounded-full bg-white" />
            소재 연구 리뷰 · Peer-Reviewed
          </div>

          <h1
            itemProp="headline"
            className="text-4xl leading-[1.15] font-bold tracking-tight text-white md:text-[2.75rem]"
          >
            천연 자외선 차단 성분,
            <br />
            <span className="text-neutral-400">멜라닌은 어디까지 왔나</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-neutral-300 md:text-xl" lang="en">
            {SUBTITLE_EN}
          </p>

          <p className="mt-10 max-w-2xl text-lg leading-relaxed font-light text-neutral-300">
            <strong className="font-medium text-white">
              옥시벤존 등 화학 자외선 차단제의 환경·피부 부담 논란 속에서, 천연 차단 성분이 주목받고
              있다.
            </strong>{' '}
            그중 멜라닌은 차단과 항산화를 동시에 하는 독특한 분자다. 이 글은 천연 차단 성분의 3대
            조건과, 멜라닌이 자외선을 막는 원리, 그리고 진균 멜라닌 연구(RSC Advances 2021)가 보여준
            가능성과 한계를 정리한다.
          </p>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">주제</dt>
              <dd className="mt-1 text-neutral-300">천연 자외선 차단</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">근거</dt>
              <dd className="mt-1 text-neutral-300">RSC Advances 2021</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">발행</dt>
              <dd className="mt-1 text-neutral-300">
                <time itemProp="datePublished" dateTime={PUBLISHED}>
                  2026년 5월 29일
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">
                읽는 시간
              </dt>
              <dd className="mt-1 text-neutral-300">약 7분</dd>
            </div>
          </dl>
        </div>
      </div>

      <article
        itemScope
        itemType="https://schema.org/Article"
        className="mx-auto max-w-2xl px-6 py-20"
      >
        {/* 목차 — relate 스타일 TOC */}
        <nav aria-label="목차" className="mb-16 border border-neutral-300 p-6">
          <p className="mb-4 text-[11px] font-medium tracking-[0.2em] text-neutral-500 uppercase">
            목차 · Table of Contents
          </p>
          <ol className="space-y-2.5 text-sm">
            {TOC.map((t, i) => (
              <li key={t.id}>
                <a
                  href={`#${t.id}`}
                  className="group flex items-baseline gap-3 text-neutral-700 transition-colors hover:text-black"
                >
                  <span className="text-neutral-400 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  <span className="group-hover:underline">{t.title}</span>
                </a>
              </li>
            ))}
          </ol>
        </nav>

        {/* SECTION 1 — 문제 */}
        <section className="mb-20">
          <SectionHeading
            n={1}
            id="problem"
            title="화학 자외선 차단제의 고민"
            subtitle="The Problem"
          />
          <p className="mb-6 leading-relaxed text-neutral-700">
            옥시벤존·옥티노세이트 같은 유기 자외선 차단 성분은 차단력이 강하지만,{' '}
            <strong className="text-black">산호초 백화와 내분비 교란 가능성</strong>으로
            하와이·팔라우 등 일부 지역에서 규제됐다. 무기 차단제(ZnO·TiO₂)는 환경 부담이 덜하지만
            백탁과 나노 입자 논쟁이 따른다.
          </p>
          <p className="leading-relaxed text-neutral-700">
            그 결과{' '}
            <strong className="text-black">
              차단력을 유지하면서 환경·피부 부담이 적은 천연 대안
            </strong>
            에 대한 연구가 활발하다. 그 후보 중 하나가 자연이 이미 쓰고 있는 분자 — 멜라닌이다.
          </p>
        </section>

        {/* SECTION 2 — 천연 차단 성분 3대 조건 (지식) */}
        <section className="mb-20">
          <SectionHeading
            n={2}
            id="criteria"
            title="천연 차단 성분의 3대 조건"
            subtitle="The 3 Criteria"
          />
          <p className="mb-8 leading-relaxed text-neutral-700">
            천연이라고 다 좋은 건 아니다. 자외선 차단 소재로 쓰이려면 다음 3가지를 정량 데이터로
            입증해야 한다.
          </p>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {CRITERIA.map((c, i) => (
              <div key={c.title} className="py-7">
                <h3 className="mb-2 flex items-baseline gap-4 text-lg font-bold text-black">
                  <span className="text-base text-neutral-400 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {c.title}
                </h3>
                <p className="pl-10 text-sm leading-relaxed text-neutral-700">{c.detail}</p>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 — 멜라닌 메커니즘 + 연구 데이터 (근거) */}
        <section className="mb-20">
          <SectionHeading
            n={3}
            id="science"
            title="멜라닌은 어떻게 자외선을 막나"
            subtitle="The Science"
          />
          <p className="mb-6 leading-relaxed text-neutral-700">
            멜라닌은 분자 내 <strong className="text-black">π-공액 구조</strong>가 넓은 파장의 빛을
            흡수하고, 동시에 활성산소(ROS)를 소거하는 항산화 작용을 한다. 즉{' '}
            <strong className="text-black">차단(1차)과 항산화(2차)를 한 분자가 동시에</strong> 하는
            것이 합성 차단 성분과 결정적으로 다른 점이다.
          </p>
          <blockquote className="my-9 border-l-2 border-black pl-6 text-xl leading-relaxed font-medium text-black">
            빛을 막으면서 동시에 산화 손상을 줄인다 — 멜라닌이 다른 천연 후보와 구분되는 지점이다.
          </blockquote>
          <p className="mb-8 leading-relaxed text-neutral-700">
            실제 데이터는 어떨까. <strong className="text-black">RSC Advances 2021</strong> 연구는
            Amorphotheca resinae 유래 진균 멜라닌을 크림에 5% 혼합해 정량 측정했다:
          </p>
          <div className="overflow-hidden border border-neutral-900">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-left text-xs text-neutral-500">
                출처: Oh et al., RSC Advances 2021 ·{' '}
                <a href={DOI_URL} className="underline">
                  {DOI}
                </a>
              </caption>
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-4 py-3 text-left font-medium tracking-wide">측정 항목</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide">결과 (5% 농도)</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide text-neutral-400">
                    의미
                  </th>
                </tr>
              </thead>
              <tbody>
                <tr className="border-t border-neutral-200 bg-white">
                  <td className="px-4 py-3 font-medium text-black">임계파장 λc</td>
                  <td className="px-4 py-3 font-medium text-black">388 nm</td>
                  <td className="px-4 py-3 text-neutral-500">광역 차단 기준(370 nm) 충족</td>
                </tr>
                <tr className="border-t border-neutral-200 bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-black">UVA/UVB 비율</td>
                  <td className="px-4 py-3 font-medium text-black">0.87</td>
                  <td className="px-4 py-3 text-neutral-500">UVA·UVB 균형 차단</td>
                </tr>
                <tr className="border-t border-neutral-200 bg-white">
                  <td className="px-4 py-3 font-medium text-black">항산화 (ORAC)</td>
                  <td className="px-4 py-3 font-medium text-black">비타민 C 동등</td>
                  <td className="px-4 py-3 text-neutral-500">2차 광손상 방어</td>
                </tr>
                <tr className="border-t border-neutral-200 bg-neutral-50">
                  <td className="px-4 py-3 font-medium text-black">세포 안전성</td>
                  <td className="px-4 py-3 font-medium text-black">HaCaT 72h 무독성</td>
                  <td className="px-4 py-3 text-neutral-500">각질세포 독성 미검출</td>
                </tr>
                <tr className="border-t border-neutral-200 bg-white">
                  <td className="px-4 py-3 font-medium text-black">in vitro SPF</td>
                  <td className="px-4 py-3 font-medium text-black">2.5</td>
                  <td className="px-4 py-3 text-neutral-500">보조 차단 수준 (상업 기준 미달)</td>
                </tr>
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4 — 천연 vs 화학 비교 */}
        <section className="mb-20">
          <SectionHeading
            n={4}
            id="comparison"
            title="천연 멜라닌 vs 화학·무기 차단제"
            subtitle="Comparison"
          />
          <div className="overflow-hidden border border-neutral-900">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-4 py-3 text-left font-medium tracking-wide">항목</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide text-neutral-400">
                    화학 (옥시벤존)
                  </th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide text-neutral-400">
                    무기 (ZnO·TiO₂)
                  </th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide">멜라닌</th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON.map((row, i) => (
                  <tr
                    key={row.spec}
                    className={`border-t border-neutral-200 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                  >
                    <td className="px-4 py-3 font-medium text-black">{row.spec}</td>
                    <td className="px-4 py-3 text-neutral-500">{row.chemical}</td>
                    <td className="px-4 py-3 text-neutral-500">{row.mineral}</td>
                    <td className="bg-neutral-100 px-4 py-3 font-medium text-black">
                      {row.melanin}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-neutral-600">
            멜라닌의 강점은 <strong className="text-black">항산화·환경 부담·생체적합성</strong>이고,
            약점은 <strong className="text-black">단독 차단력</strong>이다. 그래서 현재 연구는
            멜라닌을 기존 차단제를 대체하기보다{' '}
            <strong className="text-black">보조·항산화 부스터</strong>로 결합하는 방향에 무게를
            둔다.
          </p>
        </section>

        {/* SECTION 5 — 한계 (솔직히) */}
        <section className="mb-20">
          <SectionHeading n={5} id="limits" title="아직 남은 한계" subtitle="The Limits" />
          <div className="space-y-5 leading-relaxed text-neutral-700">
            <p>
              <strong className="text-black">SPF가 상업 기준에 못 미친다.</strong> 5% 멜라닌 크림의
              in vitro SPF는 2.5로, 광역 차단 기준은 충족하지만 상업 선스크린 최소 SPF 15+에는
              미달한다. 단독 차단제가 되긴 어렵다.
            </p>
            <p>
              <strong className="text-black">항산화 절대값이 미공개다.</strong> &ldquo;비타민 C
              동등&rdquo;은 정성적 비교일 뿐, μM Trolox equivalent/g 같은 절대 수치가 논문에
              명시되지 않았다.
            </p>
            <p>
              <strong className="text-black">장기 안전성 데이터가 부족하다.</strong> 세포독성 시험은
              72시간까지만 다뤘고, 만성 노출(96시간·장기) 데이터는 범위 밖이다.
            </p>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-neutral-600">
            천연 소재라고 무조건 신뢰할 게 아니라,{' '}
            <strong className="text-black">한계까지 데이터로 확인하는 습관</strong>이 안전한 소재
            선택의 출발점이다. 참고로 <strong className="text-black">멜라누아(Melanoir)</strong>는
            이런 멜라닌 기반 소재를 시험 데이터 기반으로 연구·검증하는 곳이다.
          </p>
        </section>

        {/* SECTION 6 — FAQ */}
        <section className="mb-20">
          <SectionHeading n={6} id="faq" title="자주 묻는 질문" subtitle="FAQ" />
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {FAQS.map((item, i) => (
              <div key={item.q} itemScope itemType="https://schema.org/Question" className="py-7">
                <h3
                  itemProp="name"
                  className="mb-3 flex items-start gap-4 text-base font-medium text-black md:text-lg"
                >
                  <span className="text-sm font-medium text-neutral-400 tabular-nums">
                    Q{i + 1}
                  </span>
                  <span>{item.q}</span>
                </h3>
                <div
                  itemProp="acceptedAnswer"
                  itemScope
                  itemType="https://schema.org/Answer"
                  className="pl-9 text-neutral-700"
                >
                  <p itemProp="text" className="leading-relaxed">
                    {item.a}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* 점 구분 — relate 스타일 */}
        <div
          className="my-4 text-center text-xl tracking-[0.6em] text-neutral-300"
          aria-hidden="true"
        >
          · · ·
        </div>

        {/* 마무리 — 독자 가치 (체크리스트) */}
        <footer className="mt-12 border-t border-neutral-200 pt-10">
          <p className="text-xl leading-relaxed font-bold text-black">
            &lsquo;천연&rsquo;이라는 단어가 아니라, 데이터를 보라.
          </p>
          <p className="mt-4 mb-8 leading-relaxed text-neutral-700">
            천연 자외선 차단 소재를 평가할 때 아래 5가지를 데이터로 확인하면, 마케팅 문구에 휘둘리지
            않고 진짜 가치를 가릴 수 있다.
          </p>
          <ul className="mb-10 divide-y divide-neutral-200 border-y border-neutral-200">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-4 py-4 text-neutral-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border border-neutral-900 text-xs">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-start gap-5 bg-black p-8 text-white">
            <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full bg-white text-xl font-medium text-black">
              M
            </div>
            <div className="flex-1 text-sm">
              <p className="font-medium tracking-wide">
                Melanoir Lab <span className="text-neutral-500">· 멜라누아</span>
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                발행 <time dateTime={PUBLISHED}>2026년 5월 29일</time>
              </p>
              <p className="mt-4 leading-relaxed text-neutral-400">
                Melanoir(멜라누아)는 멜라닌 기반 뷰티 소재를 peer-review 연구와 공인기관 시험 데이터
                기반으로 연구·검증합니다.
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
  id,
}: {
  n: number
  title: string
  subtitle?: string
  id?: string
}): JSX.Element {
  return (
    <div id={id} className="mb-8 scroll-mt-8 border-t-2 border-black pt-5">
      <div className="flex items-baseline gap-4">
        <span className="text-2xl font-bold text-black tabular-nums">
          {String(n).padStart(2, '0')}
        </span>
        <div>
          <h2 className="text-2xl leading-tight font-bold tracking-tight text-black md:text-[1.75rem]">
            {title}
          </h2>
          {subtitle && (
            <p className="mt-1 text-xs tracking-[0.15em] text-neutral-500 uppercase">{subtitle}</p>
          )}
        </div>
      </div>
    </div>
  )
}
