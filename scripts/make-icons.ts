#!/usr/bin/env tsx
/**
 * PWA/파비콘 아이콘 생성 — 사이버펑크 네온 "T" 모노그램.
 * 다크 라디얼 배경 + 시안 글로우 헤일로 + 마젠타 색수차(글리치) + 화이트 핫코어.
 * SVG 를 sharp 로 래스터화. 디자인 바꾸려면 iconSvg 만 고치고 재실행.
 *
 * 사용: npx tsx scripts/make-icons.ts
 */
import path from 'node:path'

import sharp from 'sharp'

/** 512 기준 viewBox. 가운데 정렬된 네온 "T" (maskable 안전영역 안). */
function iconSvg(size: number): string {
  return `<svg width="${size}" height="${size}" viewBox="0 0 512 512" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <radialGradient id="bg" cx="50%" cy="40%" r="80%">
        <stop offset="0%" stop-color="#1c1146"/>
        <stop offset="62%" stop-color="#0a0a18"/>
        <stop offset="100%" stop-color="#05050c"/>
      </radialGradient>
      <filter id="glow" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="13"/>
      </filter>
      <filter id="soft" x="-60%" y="-60%" width="220%" height="220%">
        <feGaussianBlur stdDeviation="7"/>
      </filter>
    </defs>
    <rect width="512" height="512" fill="url(#bg)"/>
    <g transform="translate(8,7)" opacity="0.55">
      <rect x="110" y="150" width="292" height="58" rx="6" fill="#ff2bd6" filter="url(#soft)"/>
      <rect x="227" y="150" width="58" height="242" rx="6" fill="#ff2bd6" filter="url(#soft)"/>
    </g>
    <g filter="url(#glow)">
      <rect x="110" y="150" width="292" height="58" rx="6" fill="#00eaff"/>
      <rect x="227" y="150" width="58" height="242" rx="6" fill="#00eaff"/>
    </g>
    <g fill="#2ff4ff">
      <rect x="110" y="150" width="292" height="58" rx="6"/>
      <rect x="227" y="150" width="58" height="242" rx="6"/>
    </g>
    <g fill="#eafdff">
      <rect x="120" y="160" width="272" height="38" rx="4"/>
      <rect x="237" y="160" width="38" height="224" rx="4"/>
    </g>
  </svg>`
}

async function render(size: number, rel: string): Promise<void> {
  const out = path.resolve(process.cwd(), rel)
  await sharp(Buffer.from(iconSvg(size)))
    .png()
    .toFile(out)
  console.log('  ✓', rel, `(${size}px)`)
}

async function main(): Promise<void> {
  console.log('[make-icons] 생성 중...')
  await render(192, 'public/icon-192.png')
  await render(512, 'public/icon-512.png')
  await render(180, 'public/apple-touch-icon.png')
  console.log('[make-icons] 완료')
}

main().catch((e) => {
  console.error('[make-icons] 실패:', e)
  process.exit(1)
})
