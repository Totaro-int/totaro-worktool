import type { JSX } from 'react'

import type { Metadata } from 'next'

/**
 * Decoy B — minimal content + FULL schema.org JSON-LD.
 * Isolation test: schema 풍부도가 단독으로 fetch 게이트를 통과시키나?
 */
export const metadata: Metadata = {
  title: 'Korea kimchi OEM verification minimal+schema',
  description: 'Minimal content with full schema.org markup for isolation test.',
  robots: { index: true, follow: true },
}

const SITE = 'https://totaro-worktool.vercel.app'
const CANONICAL = `${SITE}/insights/decoy-schema-only`
const PUBLISHED = '2026-05-28T10:00:00+09:00'

function articleJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: 'Korea kimchi OEM verification — minimal content with full schema',
    description: 'Minimal content + full schema for isolation test.',
    datePublished: PUBLISHED,
    dateModified: PUBLISHED,
    inLanguage: 'en',
    author: { '@type': 'Person', name: '윤태준', url: `${SITE}/about` },
    publisher: {
      '@type': 'Organization',
      name: 'Totaro',
      url: SITE,
      logo: { '@type': 'ImageObject', url: `${SITE}/favicon.ico` },
    },
    mainEntityOfPage: { '@type': 'WebPage', '@id': CANONICAL },
  })
}

function faqJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: 'What is required for Korea kimchi OEM verification?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'HACCP, FSSC 22000, and FDA registration are the three minimum requirements.',
        },
      },
    ],
  })
}

function orgJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'Organization',
    name: 'Totaro',
    url: SITE,
  })
}

function breadcrumbJsonLd(): string {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Totaro', item: SITE },
      { '@type': 'ListItem', position: 2, name: 'Insights', item: `${SITE}/insights` },
      { '@type': 'ListItem', position: 3, name: 'Decoy B', item: CANONICAL },
    ],
  })
}

export default function Page(): JSX.Element {
  return (
    <div>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: articleJsonLd() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: faqJsonLd() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: orgJsonLd() }} />
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: breadcrumbJsonLd() }} />

      <h1>Korea kimchi OEM verification — minimal content with full schema</h1>
      <p>
        HACCP, FSSC 22000, and FDA registration are the basics for Korean kimchi OEM supplier
        verification. Typical MOQ is between 500kg and 2 tons. Lead times range from 45 to 60 days.
        This page intentionally contains minimal content but a full schema.org JSON-LD payload for
        isolation test.
      </p>
      <p>This is the decoy-schema-only variant.</p>
    </div>
  )
}
