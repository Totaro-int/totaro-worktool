import type { JSX } from 'react'

import Link from 'next/link'

import { pretendard } from '@/app/fonts'

import type { Metadata } from 'next'

// ─── 회사: 멜라누아 (Melanoir). 콘텐츠 핀트: 정보성 (playbook 식 Authority Building).
//     디자인: 흑백 프리미엄 (임시 — DNA는 에이전트 질문으로 추후 확정). ───
const SITE_BASE = 'https://totaro-worktool.vercel.app'
const SLUG = 'pmu-pigment-safety-guide'
const CANONICAL = `${SITE_BASE}/insights/${SLUG}`
const PUBLISHED = '2026-05-29T13:00:00+09:00'
const MODIFIED = '2026-05-29T13:00:00+09:00'
const AUTHOR_NAME = 'Melanoir Lab'
const AUTHOR_URL = `${SITE_BASE}/about`
const ORG_NAME = 'Melanoir'
const ORG_URL = SITE_BASE
const LOGO = `${SITE_BASE}/favicon.ico`

const TITLE = '반영구 색소 안전하게 고르는 법 — 시술 아티스트가 시험성적서에서 봐야 할 5가지'
const SUBTITLE_EN = 'How to Choose Safe PMU Pigments — 5 Safety Criteria Every Artist Should Verify'
const DESCRIPTION =
  '반영구 시술 클레임의 상당수는 색감이 아닌 색소 안전성에서 시작된다. 색소를 고를 때 시험성적서에서 확인해야 할 5가지 기준 — 유해물질·무균·자극인자·멸균포장·이력추적 — 과 통과 기준값을 정리한다.'

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

// 색소 안전 검증 5대 기준 (핵심 정보 — 지식)
const CRITERIA = [
  {
    title: '유해물질 불검출',
    why: '중금속·보존제·잔류용매·알러젠이 피부 진피층에 영구 잔류하면 만성 염증·색소 변색의 원인이 된다.',
    verify: '공인기관 시험성적서에서 항목별 결과가 N.D.(불검출)인지 확인. 28종 이상 시험이 이상적.',
  },
  {
    title: '무균성 (Sterility)',
    why: '진피에 직접 주입되므로 미생물 오염은 감염·육아종으로 직결된다.',
    verify: '무균 시험(Sterility Test) 결과가 Negative 인지, 일회용 멸균팩 단위인지 확인.',
  },
  {
    title: '자극 유발 인자',
    why: '산화질소(NO) 같은 염증 매개 인자가 높으면 시술 직후 발적·부종이 길어진다.',
    verify: 'NO assay 등 자극 인자 수치가 대조군 대비 낮게 측정됐는지 확인.',
  },
  {
    title: '일회용 멸균 포장',
    why: '다회 사용 용기는 농도 불균일 + 교차 오염 위험. 시술 정밀도와 안전성을 동시에 떨어뜨린다.',
    verify: '1회분 개별 멸균팩 단위로 출고되는지, 온도 안정성 시험을 통과했는지 확인.',
  },
  {
    title: '정품·이력 추적',
    why: '클레임 발생 시 어느 배치·시점 제품인지 추적 못 하면 원인 규명이 불가능하다.',
    verify: '제품별 고유 보증서 등록 번호로 정품·사용 이력이 추적되는지 확인.',
  },
] as const

// 기준별 통과 기준값 (데이터 — 시험성적서 읽는 법)
const BENCHMARK = [
  { item: '유해물질 (28종)', pass: '전 항목 N.D.', risk: '미량이라도 검출' },
  { item: '무균 (Sterility)', pass: 'Negative', risk: '미검사 또는 Positive' },
  { item: '자극 인자 (NO assay)', pass: '대조군 대비 낮음', risk: '대조군 이상 / 미측정' },
  { item: '멸균 포장', pass: '일회용 개별팩', risk: '다회 사용 용기' },
  { item: '이력 추적', pass: '보증번호 등록', risk: '추적 불가' },
] as const

const FAQS = [
  {
    q: '색소 안전성은 어떻게 확인하나요?',
    a: '발색 샘플이 아니라 공인기관 시험성적서를 먼저 받아 5가지 — 유해물질 불검출·무균·자극 인자·멸균 포장·이력 추적 — 을 확인하는 게 정석입니다. 항목별 PDF로 수치를 직접 보는 것이 안전합니다.',
  },
  {
    q: '"28-FREE" 같은 표현은 무슨 의미인가요?',
    a: '28종 유해물질을 공인기관에서 시험해 전 항목 불검출(N.D.) 판정을 받았다는 뜻입니다. 다만 표현 자체보다 항목별 시험성적서 원본을 확인하는 것이 중요합니다. 같은 종류 색소는 평균 3~5종이 미량이라도 검출되는 경우가 일반적입니다.',
  },
  {
    q: '무균 시험은 왜 그렇게 중요한가요?',
    a: '반영구 색소는 피부 진피층에 직접 주입됩니다. 미생물에 오염된 색소는 감염·육아종(이물 반응)으로 이어질 수 있어, 무균 시험 Negative 와 일회용 멸균 포장이 안전의 핵심입니다.',
  },
  {
    q: '자극 인자가 낮으면 시술 결과가 좋아지나요?',
    a: '실험실 지표상 자극 유발 인자(NO)가 낮으면 시술 직후 발적·부종 회복이 빠른 경향이 있습니다. 단 회복은 개인차가 크고 시술자 숙련도·위생·사후관리가 함께 작용하므로 단정적 효과로 보기는 어렵습니다.',
  },
  {
    q: '시험성적서는 어디서 받을 수 있나요?',
    a: '색소 공급사에 항목별 공인기관 시험성적서 PDF를 요청하세요. 정품 색소라면 유해물질·무균·자극 인자 시험 결과를 제공할 수 있어야 합니다. 제공을 꺼리는 색소는 도입을 재고하는 것이 안전합니다.',
  },
] as const

// 시술 아티스트 체크리스트 (독자 가치 — Lead Magnet)
const CHECKLIST = [
  '발색 샘플보다 시험성적서 PDF를 먼저 요청했는가',
  '유해물질 28종 항목이 전부 N.D.(불검출)인가',
  '무균 시험(Sterility) 결과가 Negative 인가',
  '자극 인자(NO assay)가 대조군 대비 낮게 측정됐는가',
  '1회분 일회용 멸균팩 단위로 공급되는가',
  '정품 보증서 등록 번호로 이력이 추적되는가',
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
      { '@type': 'Thing', name: '반영구 시술 색소 안전성' },
      { '@type': 'Thing', name: 'PMU Pigment Safety' },
      { '@type': 'Thing', name: '시험성적서 검증' },
    ],
  })
}

function jsonLdHowTo(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'HowTo',
    name: '반영구 색소 안전성 검증하는 법',
    description: '시험성적서에서 5가지 기준을 확인해 안전한 PMU 색소를 고르는 방법.',
    step: CRITERIA.map((c, i) => ({
      '@type': 'HowToStep',
      position: i + 1,
      name: c.title,
      text: c.verify,
    })),
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
      { '@type': 'ListItem', position: 3, name: '반영구 색소 안전 검증 가이드', item: CANONICAL },
    ],
  })
}

export default function Page(): JSX.Element {
  return (
    <main className={`${pretendard.className} bg-white text-black`}>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdArticle() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdHowTo() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdFaqPage() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: jsonLdBreadcrumb() }} />

      {/* HERO — 독자 문제 중심 (제품명 X). 흑백 프리미엄. */}
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
            <span className="text-neutral-300">반영구 색소 안전 가이드</span>
          </nav>

          <div className="mb-8 inline-flex items-center gap-2 border border-white/25 px-4 py-1.5 text-[11px] font-medium tracking-[0.2em] text-neutral-300 uppercase">
            <span className="h-1 w-1 rounded-full bg-white" />
            시술 아티스트 가이드
          </div>

          <h1
            itemProp="headline"
            className="text-4xl leading-[1.15] font-bold tracking-tight text-white md:text-[2.75rem]"
          >
            반영구 색소,
            <br />
            <span className="text-neutral-400">안전하게 고르는 법</span>
          </h1>
          <p className="mt-5 text-lg leading-relaxed text-neutral-300 md:text-xl" lang="en">
            {SUBTITLE_EN}
          </p>

          {/* 독자 문제 공감 lede (제품 소개 X) */}
          <p className="mt-10 max-w-2xl text-lg leading-relaxed font-light text-neutral-300">
            <strong className="font-medium text-white">
              반영구 시술 클레임의 상당수는 색감이 아니라 색소 안전성에서 시작된다.
            </strong>{' '}
            트러블이 생기면 책임은 결국 아티스트에게 돌아온다. 그래서 새 색소를 고를 때 발색
            샘플보다 먼저 봐야 할 건 시험성적서다. 이 글은 색소 안전을 판단하는{' '}
            <strong className="font-medium text-white">5가지 기준</strong>과, 시험성적서에서 무엇을
            확인해야 하는지 정리한다.
          </p>

          <dl className="mt-12 grid grid-cols-2 gap-x-6 gap-y-3 border-t border-white/15 pt-6 text-sm md:grid-cols-4">
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">주제</dt>
              <dd className="mt-1 text-neutral-300">PMU 색소 안전</dd>
            </div>
            <div>
              <dt className="text-[10px] tracking-[0.15em] text-neutral-600 uppercase">대상</dt>
              <dd className="mt-1 text-neutral-300">시술 아티스트</dd>
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
              <dd className="mt-1 text-neutral-300">약 6분</dd>
            </div>
          </dl>
        </div>
      </div>

      <article
        itemScope
        itemType="https://schema.org/Article"
        className="mx-auto max-w-3xl px-6 py-20"
      >
        {/* SECTION 1 — 문제 (왜 안전 검증이 먼저인가) */}
        <section className="mb-20">
          <SectionHeading n={1} title="왜 색감보다 안전 검증이 먼저인가" subtitle="The Real Risk" />
          <p className="mb-6 leading-relaxed text-neutral-700">
            반영구 시술의 본질은 발색이 아니라{' '}
            <strong className="text-black">안전 검증의 추적 가능성</strong>이다. 색소는 피부
            진피층에 영구적으로 남는다. 유해물질이 잔류하거나 미생물에 오염된 색소는 만성
            염증·변색·감염으로 이어질 수 있고, 그 책임은 시술한 아티스트에게 돌아온다.
          </p>
          <p className="leading-relaxed text-neutral-700">
            그래서 베테랑 아티스트일수록 색소를 고를 때 색감 카탈로그가 아니라{' '}
            <strong className="text-black">시험성적서부터 요청</strong>한다. 어떤 기관에서 어떤
            방법으로 무엇을 측정했는지 — 이 추적 가능성이 시술 운영의 안정성을 결정한다.
          </p>
        </section>

        {/* SECTION 2 — 5가지 기준 (핵심 정보·지식) */}
        <section className="mb-20">
          <SectionHeading n={2} title="색소 안전 검증 5가지 기준" subtitle="The 5 Criteria" />
          <p className="mb-8 leading-relaxed text-neutral-700">
            시험성적서에서 다음 5가지를 확인한다. 각 기준이{' '}
            <strong className="text-black">왜 중요한지</strong>와{' '}
            <strong className="text-black">어떻게 확인하는지</strong>를 함께 본다.
          </p>
          <div className="divide-y divide-neutral-200 border-y border-neutral-200">
            {CRITERIA.map((c, i) => (
              <div key={c.title} className="py-7">
                <h3 className="mb-3 flex items-baseline gap-4 text-lg font-bold text-black">
                  <span className="text-base text-neutral-400 tabular-nums">
                    {String(i + 1).padStart(2, '0')}
                  </span>
                  {c.title}
                </h3>
                <div className="space-y-2 pl-10 text-sm leading-relaxed text-neutral-700">
                  <p>
                    <span className="font-medium text-black">왜 중요한가 — </span>
                    {c.why}
                  </p>
                  <p>
                    <span className="font-medium text-black">확인하는 법 — </span>
                    {c.verify}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* SECTION 3 — 데이터로 읽기 (통과 기준값) */}
        <section className="mb-20">
          <SectionHeading
            n={3}
            title="시험성적서, 어떤 값이 통과인가"
            subtitle="Reading the Report"
          />
          <p className="mb-8 leading-relaxed text-neutral-700">
            시험성적서를 받으면 아래 기준값과 대조한다.{' '}
            <strong className="text-black">통과 기준</strong>에 못 미치거나{' '}
            <strong className="text-black">위험 신호</strong>가 보이면 도입을 재고한다.
          </p>
          <div className="overflow-hidden border border-neutral-900">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-black text-white">
                  <th className="px-4 py-3 text-left font-medium tracking-wide">검증 항목</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide">통과 기준</th>
                  <th className="px-4 py-3 text-left font-medium tracking-wide text-neutral-400">
                    위험 신호
                  </th>
                </tr>
              </thead>
              <tbody>
                {BENCHMARK.map((row, i) => (
                  <tr
                    key={row.item}
                    className={`border-t border-neutral-200 ${i % 2 === 0 ? 'bg-white' : 'bg-neutral-50'}`}
                  >
                    <td className="px-4 py-3 font-medium text-black">{row.item}</td>
                    <td className="px-4 py-3 font-medium text-black">{row.pass}</td>
                    <td className="px-4 py-3 text-neutral-500">{row.risk}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* SECTION 4 — 실제 검증 사례 (브랜드 소프트 등장) */}
        <section className="mb-20">
          <SectionHeading n={4} title="실제 검증 사례" subtitle="A Verified Example" />
          <p className="mb-6 leading-relaxed text-neutral-700">
            위 5가지 기준을 모두 공인기관 데이터로 충족한 사례를 보면 기준이 더 구체적으로 와닿는다.
            한 예로 <strong className="text-black">멜라누아 엠보</strong>는 다음과 같이 검증됐다.
          </p>
          <div className="border-l-2 border-black pl-6">
            <ul className="space-y-3 text-neutral-700">
              <li>
                <strong className="text-black">유해물질 28종 전 항목 N.D.</strong> —
                중금속·보존제·잔류용매·알러젠
              </li>
              <li>
                <strong className="text-black">무균 시험 Negative</strong> — 일회용 멸균팩 단위
              </li>
              <li>
                <strong className="text-black">자극 인자(NO) 51% 감소</strong> — 대조군 14.32 → 6.90
              </li>
              <li>
                <strong className="text-black">정품 보증서 등록 번호</strong>로 배치·이력 추적
              </li>
            </ul>
          </div>
          <p className="mt-6 text-sm leading-relaxed text-neutral-600">
            중요한 건 브랜드 이름이 아니라,{' '}
            <strong className="text-black">이 수치들을 시험성적서로 직접 확인할 수 있는가</strong>
            다. 어떤 색소를 고르든 위 5가지 기준의 원본 데이터를 요청하는 습관이 안전한 시술의
            출발점이다.
          </p>
        </section>

        {/* SECTION 5 — 체크리스트 (독자 가치) */}
        <section className="mb-20">
          <SectionHeading n={5} title="색소 도입 전 체크리스트" subtitle="Before You Buy" />
          <p className="mb-8 leading-relaxed text-neutral-700">
            새 색소를 들이기 전, 아래 6가지를 시험성적서로 확인한다. 하나라도 답하지 못하는 색소는
            보류하는 것이 안전하다.
          </p>
          <ul className="divide-y divide-neutral-200 border-y border-neutral-200">
            {CHECKLIST.map((item) => (
              <li key={item} className="flex items-start gap-4 py-4 text-neutral-700">
                <span className="mt-0.5 flex h-5 w-5 flex-shrink-0 items-center justify-center border border-neutral-900 text-xs">
                  ✓
                </span>
                <span>{item}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* SECTION 6 — FAQ */}
        <section className="mb-20">
          <SectionHeading n={6} title="자주 묻는 질문" subtitle="FAQ" />
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

        {/* 마무리 — 독자 가치로 닫기 (구매 유도 X) */}
        <footer className="mt-20 border-t border-neutral-200 pt-10">
          <p className="text-xl leading-relaxed font-bold text-black">
            안전한 색소가 안전한 시술의 시작이다.
          </p>
          <p className="mt-4 leading-relaxed text-neutral-700">
            발색은 그 다음이다. 새 색소를 검토할 때 발색 샘플보다 시험성적서 PDF를 먼저 받아, 위
            5가지 기준의 원본 데이터를 확인하는 습관 — 그것이 시술 클레임을 줄이는 가장 확실한
            방법이다.
          </p>

          <div className="mt-10 flex items-start gap-5 bg-black p-8 text-white">
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
                연구·공급합니다. 색소 안전 데이터는 공인기관 시험성적서로 확인할 수 있습니다.
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
