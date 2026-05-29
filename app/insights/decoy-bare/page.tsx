import type { JSX } from 'react'

import type { Metadata } from 'next'

/**
 * Decoy A — minimal content, NO schema.org JSON-LD, NO semantic HTML.
 * Isolation test: 가장 척박한 상태에서 Gemini 가 fetch 하나?
 */
export const metadata: Metadata = {
  title: 'Korea kimchi OEM verification basics',
  robots: { index: true, follow: true },
}

export default function Page(): JSX.Element {
  return (
    <div>
      <h1>Korea kimchi OEM verification basics</h1>
      <p>
        HACCP, FSSC 22000, and FDA registration are the basics for Korean kimchi OEM supplier
        verification. Typical MOQ is between 500kg and 2 tons. Lead times range from 45 to 60 days.
        This page intentionally contains minimal markup for an isolation test.
      </p>
      <p>This is the decoy-bare variant: no schema.org JSON-LD, no semantic HTML5 elements.</p>
    </div>
  )
}
