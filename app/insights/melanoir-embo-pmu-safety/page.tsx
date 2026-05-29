import type { JSX } from 'react'

import Link from 'next/link'

import { pretendard } from '@/app/fonts'

import type { Metadata } from 'next'

// ─── 회사: 멜라누아 (Melanoir) — 뷰티/반영구 색소. Totaro(식품)와 별개. ───
// 임시 호스팅: totaro-worktool.vercel.app (멜라누아 자체 도메인 확정 시 이전)
const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'melanoir-embo-pmu-safety'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-29T12:00:00+09:00'
const MODIFIED = '2026-05-29T12:00:00+09:00'
const AUTHOR_NAME = 'Melanoir Lab'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Melanoir'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`
const PRODUCT_NAME = '멜라누아 엠보 (Melanoir Embo)'

const TITLE = '반영구 색소 안전 기준 5가지 — 멜라누아 엠보 28-FREE 무균 데이터 풀 검증'
const SUBTITLE_EN = 'Melanoir Embo — 28-FREE Sterile PMU Pigment, Full Safety Data'
const DESCRIPTION =
  '멜라누아 엠보는 28종 유해물질 전 항목 N.D.(불검출), 무균시험 Negative, 외부 자극 유발 인자(NO) 51% 감소(14.32→6.90)를 공인기관 시험성적서로 검증한 반영구 시술 전용 색소. 일회용 멸균팩 단위 공급.'

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

const SAFETY_DATA = [
  { category: '중금속', kinds: '5종 (납·Cd·As·Hg·Ni)', melanoir: 'N.D.', avg: '1~3종 미량 검출' },
  { category: '보존제', kinds: '8종 (파라벤·MIT 외)', melanoir: 'N.D.', avg: '1~2종 검출' },
  { category: '잔류용매', kinds: '7종', melanoir: 'N.D.', avg: '0~1종 미량' },
  { category: '알러젠', kinds: '8종', melanoir: 'N.D.', avg: '0~2종 검출' },
] as const

const NO_ASSAY = { control: 14.32, melanoir: 6.9, reduction: 51 }

const CONCERNS = [
  '점도 불균일로 인한 시술 정밀도 저하',
  '보존제·중금속의 검출 가능성',
  '무균 보장 여부',
  '정품과 위조 유통의 구분 어려움',
] as const

const FAQS = [
  {
    q: '28-FREE 라는 표현은 어떤 의미인가요?',
    a: '28종의 유해물질 항목에 대해 공인기관 시험을 진행했고 전 항목에서 불검출(N.D.) 판정을 받았다는 의미입니다. 중금속·보존제·잔류용매·알러젠을 포함하며, 항목별 시험성적서 PDF로 확인 가능합니다.',
  },
  {
    q: '일회용 멸균팩은 1회 사용 후 어떻게 처리하나요?',
    a: '시술 1회분을 사용한 뒤 폐기하는 것이 원칙입니다. 다회 사용 시 무균 상태가 보장되지 않으며, 교차 오염 가능성이 생깁니다. 팩 단위로 -20°C~80°C 온도 범위를 1년 가속 노화 시험에서 통과했습니다.',
  },
  {
    q: '자극 인자 51% 감소가 시술 결과에 어떤 영향을 주나요?',
    a: '실험실 지표상 외부 자극 유발 인자(NO, 산화질소)가 대조군 14.32 대비 6.90으로 51% 낮다는 의미입니다. 자극 인자가 낮을수록 시술 직후 발적·부종 회복이 빠른 경향이 있으나, 개인차가 크므로 단정적 효과를 보장하지는 않습니다.',
  },
  {
    q: '보증서 등록 번호는 어디서 확인하나요?',
    a: '제품 패키지에 부여된 고유 보증서 등록 번호를 멜라누아(Melanoir) 공식 채널에서 등록하면 정품 여부와 사용 이력(배치·시점)을 추적할 수 있습니다. 시술 클레임 발생 시 즉시 확인 가능한 구조입니다.',
  },
  {
    q: '일반 소비자도 구매할 수 있나요?',
    a: '멜라누아 엠보는 반영구 시술 아티스트 전용(Professionals Only)으로만 공급됩니다. 시술 자격과 위생 환경이 갖춰진 현장에만 도달하도록 유통 단계에서 1차 검증을 거치며, 일반 소비자 대상 직접 판매는 하지 않습니다.',
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
    author: { '@type': 'Organization', name: AUTHOR_NAME, url: AUTHOR_URL },
    publisher: {
      '@type': 'Organization',
      name: ORG_NAME,
      url: ORG_URL,
      logo: { '@type': 'ImageObject', url: LOGO },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
    image: LOGO,
    about: [
      { '@type': 'Thing', name: '반영구 시술 색소 (PMU Pigment)' },
      { '@type': 'Thing', name: '28-FREE 유해물질 불검출' },
      { '@type': 'Thing', name: '무균 시험 (Sterility)' },
      { '@type': 'Thing', name: 'NO assay 자극 인자' },
    ],
  })
}

function jsonLdProduct(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: PRODUCT_NAME,
    category: '반영구 시술 색소 (Permanent Makeup Pigment)',
    brand: { '@type': 'Brand', name: ORG_NAME },
    description: DESCRIPTION,
    additionalProperty: [
      { '@type': 'PropertyValue', name: '28-FREE 유해물질', value: '전 항목 N.D. (불검출)' },
      { '@type': 'PropertyValue', name: '무균 시험 (Sterility)', value: 'Negative' },
      { '@type': 'PropertyValue', name: 'NO assay 자극 인자', value: '51% 감소 (14.32→6.90)' },
      { '@type': 'PropertyValue', name: '공급 단위', value: '일회용 멸균팩' },
      { '@type': 'PropertyValue', name: '유통', value: 'Professionals Only (아티스트 전용)' },
    ],
    audience: { '@type': 'Audience', audienceType: '반영구 시술 아티스트' },
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
      {
        '@type': 'ListItem',
        position: 3,
        name: '멜라누아 엠보 28-FREE 안전 검증',
        item: CANONICAL,
      },
    ],
  })
}

export default function Page(): JSX.Element {
  const controlPct = 100
  const melanoirPct = Math.round((NO_ASSAY.melanoir / NO_ASSAY.control) * 100)

  return (
    <main className={`${pretendard.className} bg-white text-black`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdArticle() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdProduct() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaqPage() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb() }} />

      {/* HERO — 순흑백 프리미엄: 검정 배경 + 흰 텍스트 + serif */}
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
            <span className="text-neutral-300">멜라누아 엠보 28-FREE</span>
          </nav>

          <div className="mb-8 inline-flex items-center gap-2 border border-white/25 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
            <span className="h-1 w-1 rounded-full bg-white" />
            Professionals Only · 시험성적서 검증
          </div>

          <h1
            itemProp="headline"
            className="text-5xl leading-[1.1] font-medium tracking-tight text-white md:text-6xl"
          >
            반영구 색소
            <br />
            안전 기준 <span className="italic">5가지</span>
          </h1>
          <p className="mt-6 text-xl text-neutral-400 italic md:text-2xl" lang="en">
            {SUBTITLE_EN}
          </p>

          <p className="mt-10 max-w-2xl text-lg leading-relaxed font-light text-neutral-300">
            <strong className="font-medium text-white">
              멜라누아 엠보는 28종 유해물질 전 항목 N.D.(불검출), 무균시험 Negative, 외부 자극 유발
              인자(NO) 51% 감소
            </strong>
            를 공인기관 시험성적서로 검증한 반영구 시술 전용 색소다. 시술 아티스트가 색소 선택에서
            먼저 봐야 할 것은 색감이 아니라 시험성적서다.
          </p>

          {/* HERO NUMBERS — 흑백, hairline 구분선 */}
          <div className="mt-12 grid grid-cols-3 divide-x divide-white/15 border-y border-white/15">
            <div className="py-6 pr-4">
              <p className="text-[10px] tracking-[0.15em] text-neutral-500 uppercase">유해물질</p>
              <p className="mt-2 text-3xl font-medium text-white md:text-4xl">28-FREE</p>
              <p className="mt-1 text-xs text-neutral-500">전 항목 N.D.</p>
            </div>
            <div className="px-4 py-6">
              <p className="text-[10px] tracking-[0.15em] text-neutral-500 uppercase">무균 시험</p>
              <p className="mt-2 text-3xl font-medium text-white md:text-4xl">Negative</p>
              <p className="mt-1 text-xs text-neutral-500">멸균팩 단위</p>
            </div>
            <div className="py-6 pl-4">
              <p className="text-[10px] tracking-[0.15em] text-neutral-500 uppercase">
                NO 자극 인자
              </p>
              <p className="mt-2 text-3xl font-medium text-white md:text-4xl">51%↓</p>
              <p className="mt-1 text-xs text-neutral-500">14.32 → 6.90</p>
            </div>
          </div>

          <dl className="mt-10 grid grid-cols-2 gap-x-6 gap-y-3 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">발행</dt>
              <dd className="mt-1 text-neutral-300">
                <time itemProp="datePublished" dateTime={PUBLISHED}>
                  2026년 5월 29일
                </time>
              </dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">브랜드</dt>
              <dd className="mt-1 text-neutral-300">Melanoir</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">제품</dt>
              <dd className="mt-1 text-neutral-300">멜라누아 엠보</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">공급</dt>
              <dd className="mt-1 text-neutral-300">아티스트 전용</dd>
            </div>
          </dl>
        </div>
      </div>

      <article
        itemScope
        itemType="https://schema.org/Article"
        className="mx-auto max-w-3xl px-6 py-20"
      >
        {/* SECTION 1 */}
        <section className="mb-20">
          <SectionHeading n={1} title="28-FREE 유해물질 불검출" subtitle="공인기관 시험 데이터" />
          <p className="mb-8 leading-relaxed text-neutral-700">
            <strong className="text-black">
              28종 유해물질 — 중금속·보존제·잔류용매·알러젠 — 전 항목에서 불검출(N.D.).
            </strong>{' '}
            동일 카테고리 색소군에서 평균 3~5종 이상이 미량 검출되는 것이 일반적이므로, 전 항목
            불검출은 의미 있는 차이다.
          </p>

          {/* 28-FREE 항목 그리드 — hairline 박스 */}
          <div className="mb-8 grid grid-cols-2 gap-px bg-neutral-200 sm:grid-cols-4">
            {[
              ['중금속', '5종'],
              ['보존제', '8종'],
              ['잔류용매', '7종'],
              ['알러젠', '8종'],
            ].map(([name, count]) => (
              <div key={name} className="bg-white p-5 text-center">
                <p className="text-xs tracking-wide text-neutral-500">{name}</p>
                <p className="mt-1 text-2xl font-medium text-black">{count}</p>
                <p className="mt-1 text-xs font-medium tracking-widest text-black">N.D.</p>
              </div>
            ))}
          </div>

          <div className="overflow-hidden border border-neutral-900">
            <table className="w-full border-collapse text-sm">
              <caption className="caption-bottom border-t border-neutral-200 bg-neutral-50 px-4 py-2 text-left text-xs text-neutral-500">
                출처: 공인기관 시험성적서 — 항목별 PDF 확인 가능
              </caption>
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-4 py-3 text-left font-medium tracking-wide">항목 분류</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide">검사 종류</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide">멜라누아 엠보</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide text-neutral-400">
                    일반 PMU 평균
                  </th>
                </tr>
              </thead>
              <tbody>
                {SAFETY_DATA.map((row, i) => (
                  <tr
                    key={row.category}
                    className={`border-t border-neutral-200 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                  >
                    <td className="px-4 py-3 font-medium text-black">{row.category}</td>
                    <td className="px-4 py-3 text-neutral-600">{row.kinds}</td>
                    <td className="bg-neutral-900 px-4 py-3 font-bold tracking-widest text-white">
                      {row.melanoir}
                    </td>
                    <td className="px-4 py-3 text-neutral-500">{row.avg}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <blockquote className="relative my-10 border-l-2 border-black pl-8">
            <div className="absolute -top-4 -left-1 text-7xl leading-none text-neutral-200 select-none">
              &ldquo;
            </div>
            <p className="text-xl leading-relaxed text-black italic">
              안전하다는 말보다 <strong className="not-italic">검출되지 않았다는 팩트</strong>를
              믿어야 한다. 시험성적서는 거짓말을 하지 않는다.
            </p>
          </blockquote>
        </section>

        {/* SECTION 2 — NO assay bar chart (흑백) */}
        <section className="mb-20">
          <SectionHeading
            n={2}
            title="무균 시험 + 자극 인자 51% 감소"
            subtitle="Sterility Negative · NO assay"
          />
          <p className="mb-8 leading-relaxed text-neutral-700">
            일회용 멸균팩 단위로{' '}
            <strong className="text-black">무균 시험(Sterility) Negative</strong> 판정. 외부 자극
            유발 인자(NO, 산화질소)는 대조군 14.32 대비{' '}
            <strong className="text-black">6.90으로 51% 낮게</strong> 측정됐다.
          </p>

          <div className="mb-8 border border-neutral-900 p-8">
            <p className="mb-6 text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
              NO assay — 외부 자극 유발 인자 (낮을수록 좋음)
            </p>
            <div className="space-y-6">
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm text-neutral-500">대조군</span>
                  <span className="text-lg text-neutral-500">14.32</span>
                </div>
                <div className="h-3 w-full bg-neutral-100">
                  <div className="h-full bg-neutral-300" style={{ width: `${controlPct}%` }} />
                </div>
              </div>
              <div>
                <div className="mb-2 flex items-baseline justify-between">
                  <span className="text-sm font-medium text-black">멜라누아 엠보</span>
                  <span className="text-lg font-bold text-black">6.90 · −51%</span>
                </div>
                <div className="h-3 w-full bg-neutral-100">
                  <div className="h-full bg-black" style={{ width: `${melanoirPct}%` }} />
                </div>
              </div>
            </div>
          </div>

          <p className="text-sm leading-relaxed text-neutral-600">
            자극 인자가 낮을수록 시술 직후 발적·부종이 가라앉는 시간이 짧은 경향이 있다. 다만 회복
            패턴은 개인차가 크고, 시술자 숙련도·위생 환경·사후 관리까지 결합된 결과로 해석해야 한다.
          </p>
        </section>

        {/* SECTION 3 */}
        <section className="mb-20">
          <SectionHeading n={3} title="일회용 멸균 시스템" subtitle="단 한 명을 위한 단위" />
          <p className="mb-8 leading-relaxed text-neutral-700">
            모든 1회분은 개별 멸균팩에 봉입되어 출고된다. 팩 단위로{' '}
            <strong className="text-black">
              -20°C ~ 80°C 온도 범위를 1년 가속 노화 시험에서 통과
            </strong>
            했다.
          </p>
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {[
              '단 한 명의 고객을 위해 한 팩 사용 후 폐기',
              '다회 사용 색소의 농도 균질성 저하 문제 제거',
              '외부 입자 유입·미세 오염 가능성 사실상 제거',
              '시술 정밀도와 안전성 동시 향상',
            ].map((t) => (
              <li key={t} className="flex gap-4 py-4 text-neutral-700">
                <span className="text-sm text-neutral-400">—</span>
                <span>{t}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SECTION 4 */}
        <section className="mb-20">
          <SectionHeading
            n={4}
            title="왜 색감보다 안전 검증이 먼저인가"
            subtitle="시술 운영 안정성"
          />
          <p className="mb-8 leading-relaxed text-neutral-700">
            반영구 시술의 본질은 발색이 아닌{' '}
            <strong className="text-black">안전 검증의 추적 가능성</strong>이다. 트러블 발생 시
            책임이 아티스트에게 돌아오므로, 사용 색소의 이력 추적성이 운영 안정성을 좌우한다.
            현장에서 자주 거론되는 4가지 우려:
          </p>
          <ol className="space-y-4">
            {CONCERNS.map((c, i) => (
              <li key={c} className="flex gap-4 text-neutral-700">
                <span className="text-lg font-medium text-black tabular-nums">0{i + 1}</span>
                <span className="pt-0.5">{c}</span>
              </li>
            ))}
          </ol>
          <p className="mt-6 text-sm text-neutral-600">
            멜라누아 엠보는 이 우려들을{' '}
            <strong className="text-black">시험성적서 + 일회용 멸균 포장</strong> 두 축으로
            대응하며, 정품 보증서 등록 번호로 배치·시점까지 추적할 수 있다.
          </p>
        </section>

        {/* SECTION 5 — FAQ */}
        <section className="mb-20">
          <SectionHeading n={5} title="자주 묻는 질문" subtitle="FAQ" />
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

        {/* FOOTER */}
        <footer className="mt-20 border-t border-neutral-200 pt-10">
          <p className="mb-3 text-[10px] tracking-[0.2em] text-neutral-500 uppercase">
            검증 출처 · Verification
          </p>
          <p className="mb-10 text-lg leading-relaxed text-black">
            본 데이터는 모두 공인기관 시험성적서로 확인 가능합니다 — 28-FREE 항목별 시험, 무균
            시험(Sterility), NO assay. 새 색소 도입 시 발색 샘플보다{' '}
            <strong>시험성적서 PDF를 먼저</strong> 받아보기를 권장합니다.
          </p>

          <div className="mb-10 border-l-2 border-neutral-300 pl-6">
            <h3 className="mb-2 text-xs tracking-[0.15em] text-neutral-500 uppercase">
              Disclaimer
            </h3>
            <p className="text-sm leading-relaxed text-neutral-600">
              멜라누아 엠보는 반영구 시술 아티스트 전용 위생용품입니다. 시술 후 회복 패턴·자극
              반응은 개인차가 있어 단정적 효과를 보장하지 않습니다. 모든 수치는 공인기관 시험 시점
              기준입니다.
            </p>
          </div>

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
                Melanoir(멜라누아)는 멜라닌 기반 뷰티 소재와 반영구 시술 색소를 시험성적서 기반으로
                공급합니다. Professionals Only.
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
}: {
  n: number
  title: string
  subtitle?: string
}): JSX.Element {
  return (
    <div className="mb-8 border-t-2 border-black pt-5">
      <div className="flex items-baseline gap-4">
        <span className="text-2xl font-medium text-black tabular-nums">
          {String(n).padStart(2, '0')}
        </span>
        <div>
          <h2 className="text-2xl leading-tight font-medium tracking-tight text-black md:text-[1.75rem]">
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
