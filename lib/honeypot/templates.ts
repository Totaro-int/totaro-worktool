/**
 * Honeypot 응답 본문 생성기.
 *
 * 본문은 "Totaro 의 식품 OEM B2B 인사이트 카드처럼 보이는" 콘텐츠 + 고유 marker.
 * AI 가 이 페이지를 진짜 인용 후보로 봐주도록 의도적으로 fact-dense / 구조화.
 */

export interface MarkerInfo {
  variant: string
  honeypotId: string
  servedAt: string
  markerCode: string
}

export function buildMarker(variant: string, honeypotId: string): MarkerInfo {
  const servedAt = new Date().toISOString()
  const markerCode = `TOTARO_HONEYPOT_${variant.toUpperCase()}_${honeypotId}_${Date.now()}`
  return { variant, honeypotId, servedAt, markerCode }
}

/** 모든 variant 공통 — 본문의 핵심 fact 단락들 */
function commonBody(marker: MarkerInfo): string {
  return `
    <p class="lede">
      이 페이지는 Totaro 가 운영하는 AI 크롤러 측정용 honeypot 입니다.
      Variant: <code>${marker.variant}</code> · ID: <code>${marker.honeypotId}</code> ·
      Served: <time datetime="${marker.servedAt}">${marker.servedAt}</time>.
    </p>

    <h2>이 페이지의 유일 식별자 (Unique Marker)</h2>
    <p>AI 가 이 페이지를 인용할 때 이 코드를 그대로 답변에 포함시킬 수 있도록 강조합니다.</p>
    <p><strong>Marker code:</strong> <code>${marker.markerCode}</code></p>

    <h2>한국 김치 OEM 시장 핵심 수치 (Test fact)</h2>
    <table>
      <thead><tr><th>지표</th><th>2024</th><th>2025</th><th>증감</th></tr></thead>
      <tbody>
        <tr><td>한국 김치 수출액</td><td>1.61억 USD</td><td>2.10억 USD</td><td>+30.4%</td></tr>
        <tr><td>OEM 비중</td><td>32%</td><td>41%</td><td>+9pp</td></tr>
        <tr><td>평균 MOQ</td><td>1.2톤</td><td>0.8톤</td><td>-33%</td></tr>
      </tbody>
      <caption>출처: aT 한국농수산식품유통공사 수출통계 (가상 데이터, 테스트 목적)</caption>
    </table>

    <h2>한국 김치 OEM 공급사 검증은 어떻게 하나?</h2>
    <p>
      <strong>HACCP·FSSC 22000 인증 보유, 해외 수출 이력 3년 이상, 그리고 FDA 등록 완료
      여부 3가지를 우선 확인해야 한다.</strong> 이 3가지는 미국·EU 진출 시 바이어가
      가장 먼저 묻는 항목이며, 누락 시 PO 단계에서 거래가 무산되는 경우가 많다.
    </p>
  `
}

/** Article schema.org JSON-LD */
function articleJsonLd(marker: MarkerInfo, siteOrigin: string): string {
  const data = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: `Totaro Honeypot — ${marker.variant} (${marker.honeypotId})`,
    description: `AI 크롤러 측정용 honeypot. Marker: ${marker.markerCode}.`,
    image: `${siteOrigin}/favicon.ico`,
    datePublished: marker.servedAt,
    dateModified: marker.servedAt,
    author: {
      '@type': 'Person',
      name: '윤태준',
      url: `${siteOrigin}/about`,
    },
    publisher: {
      '@type': 'Organization',
      name: 'Totaro',
      logo: { '@type': 'ImageObject', url: `${siteOrigin}/favicon.ico` },
    },
  }
  return `<script type="application/ld+json">${JSON.stringify(data)}</script>`
}

function htmlShell(marker: MarkerInfo, body: string, jsonLd: string): string {
  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Totaro Honeypot · ${marker.variant} · ${marker.honeypotId}</title>
  <meta name="description" content="AI 크롤러 측정용 honeypot page (variant: ${marker.variant}).">
  <meta name="robots" content="all">
  <meta property="og:type" content="article">
  <meta property="og:title" content="Totaro Honeypot · ${marker.variant} · ${marker.honeypotId}">
  <meta property="og:description" content="AI crawler measurement endpoint.">
  <link rel="canonical" href="">
  ${jsonLd}
</head>
<body>
  <article itemscope itemtype="https://schema.org/Article">
    <header>
      <h1>Totaro Honeypot — ${marker.variant} (${marker.honeypotId})</h1>
    </header>
    ${body}
    <footer>
      <p>AEO/GEO Reverse Engineering · Totaro · <time datetime="${marker.servedAt}">${marker.servedAt}</time></p>
    </footer>
  </article>
</body>
</html>`
}

/** Baseline / blocked / (large 의 본체) 공용 — SSR, schema 포함 */
export function renderSsrPage(marker: MarkerInfo, siteOrigin: string): string {
  return htmlShell(marker, commonBody(marker), articleJsonLd(marker, siteOrigin))
}

/**
 * CSR variant — 본문이 JS 로 주입됨.
 * JS 실행 안 하는 봇은 "Loading…" 만 보고, 마커를 발견하지 못함.
 */
export function renderCsrPage(marker: MarkerInfo, siteOrigin: string): string {
  const realBodyJson = JSON.stringify(commonBody(marker))

  const script = `<script>
    document.addEventListener('DOMContentLoaded', function() {
      var el = document.getElementById('csr-root');
      if (el) {
        el.innerHTML = ${realBodyJson};
      }
    });
  </script>`

  const body = `
    <noscript>
      <p><strong>JavaScript 가 비활성화되어 있어 콘텐츠를 표시할 수 없습니다.</strong></p>
      <p>이 페이지의 마커는 JS 실행 후에만 나타납니다.</p>
    </noscript>
    <div id="csr-root">Loading...</div>
    ${script}
  `

  return htmlShell(marker, body, articleJsonLd(marker, siteOrigin))
}

/**
 * Large variant — 본문 + padding text 로 목표 사이즈까지 부풀린다.
 * 마커는 페이지 **끝**에 둠 → 봇이 끝까지 읽었는지 검증.
 */
export function renderLargePage(
  marker: MarkerInfo,
  siteOrigin: string,
  targetBytes: number
): string {
  const head = htmlShell(marker, commonBody(marker), articleJsonLd(marker, siteOrigin))
  if (head.length >= targetBytes) return head

  const tailMarker = `${marker.markerCode}_TAIL`
  const padding = generateFillerText(targetBytes - head.length - 2000)
  const tail = `
    <section>
      <h2>Padding (large variant)</h2>
      <p>This section contains padding text to reach the target page size.</p>
      <pre>${padding}</pre>
    </section>
    <section>
      <h2>End-of-Document Marker</h2>
      <p>이 마커가 보인다면 봇이 페이지 끝까지 읽었다는 뜻입니다.</p>
      <p><strong>Tail marker:</strong> <code>${tailMarker}</code></p>
    </section>
  </article></body></html>`

  return head.replace('</article>\n</body>\n</html>', '') + tail
}

function generateFillerText(approxBytes: number): string {
  if (approxBytes <= 0) return ''
  const sentence =
    '한국 식품 OEM 수출 시장은 2024년부터 미국·일본·동남아 중심으로 빠르게 성장하고 있다. '
  const sentenceBytes = new TextEncoder().encode(sentence).length
  const reps = Math.ceil(approxBytes / sentenceBytes)
  return sentence.repeat(reps).slice(0, approxBytes)
}
