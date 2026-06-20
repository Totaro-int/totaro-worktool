/**
 * 카드 1장을 서버에서 1080² PNG 로 합성 — html-to-image(브라우저) 대체.
 *
 * 사진은 sharp 로 1080² cover 리사이즈, 그 위에 텍스트·스크림 SVG 오버레이.
 * 한글은 Pretendard(@font-face base64 임베드)로 렌더 → Vercel(시스템 폰트 없음)에서도 안전.
 */
import fs from 'node:fs'
import path from 'node:path'

import sharp from 'sharp'

export type RenderCardInput = {
  kicker: string
  headline: string
  sub: string
  photo: string | null
}

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')
let _bold = ''
let _reg = ''
function fonts(): { bold: string; reg: string } {
  if (!_bold) {
    _bold = fs.readFileSync(path.join(FONT_DIR, 'Pretendard-Bold.otf')).toString('base64')
    _reg = fs.readFileSync(path.join(FONT_DIR, 'Pretendard-Regular.otf')).toString('base64')
  }
  return { bold: _bold, reg: _reg }
}

const esc = (s: string): string =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

const W = 1080
const PAD = 88

function overlaySvg(card: RenderCardInput, hasPhoto: boolean): string {
  const { bold, reg } = fonts()
  const kC = hasPhoto ? '#F0E8DD' : '#7F7366'
  const hC = hasPhoto ? '#F7F1E8' : '#222222'
  const sC = hasPhoto ? '#EADFCF' : '#7F7366'

  const hLines = (card.headline || '').split('\n').slice(0, 3)
  const HS = 80
  const LH = 100

  // 하단 블록을 바닥에서 위로 쌓는다.
  const moneY = W - PAD
  const subY = moneY - 50
  const hBottom = subY - 58
  const hTexts = hLines
    .map((ln, i) => {
      const yy = hBottom - (hLines.length - 1 - i) * LH
      return `<text x="${PAD}" y="${yy}" font-family="P" font-weight="700" font-size="${HS}" fill="${hC}">${esc(ln)}</text>`
    })
    .join('')

  return `<svg width="${W}" height="${W}" xmlns="http://www.w3.org/2000/svg">
  <defs><style>
    @font-face{font-family:'P';font-weight:400;src:url("data:font/otf;base64,${reg}");}
    @font-face{font-family:'P';font-weight:700;src:url("data:font/otf;base64,${bold}");}
  </style></defs>
  ${hasPhoto ? `<rect width="${W}" height="${W}" fill="rgba(28,26,22,0.34)"/>` : ''}
  <text x="${PAD}" y="${PAD + 32}" font-family="P" font-weight="400" font-size="34" letter-spacing="10" fill="${kC}">${esc(card.kicker || '')}</text>
  ${hTexts}
  <text x="${PAD}" y="${subY}" font-family="P" font-weight="400" font-size="40" fill="${sC}">${esc(card.sub || '')}</text>
  <text x="${PAD}" y="${moneY}" font-family="P" font-weight="400" font-size="30" letter-spacing="12" fill="${kC}">MONÉ HOUSE</text>
</svg>`
}

/** 카드 → 1080² PNG 버퍼. */
export async function renderCard(card: RenderCardInput): Promise<Buffer> {
  const hasPhoto = Boolean(card.photo)
  let base: sharp.Sharp
  if (hasPhoto && card.photo) {
    const m = /^data:[^;]+;base64,(.+)$/.exec(card.photo)
    const buf = m ? Buffer.from(m[1], 'base64') : Buffer.alloc(0)
    base = sharp(buf).resize(W, W, { fit: 'cover' })
  } else {
    base = sharp({
      create: {
        width: W,
        height: W,
        channels: 4,
        background: { r: 240, g: 232, b: 221, alpha: 1 },
      },
    })
  }
  const svg = Buffer.from(overlaySvg(card, hasPhoto))
  return base
    .composite([{ input: svg }])
    .png()
    .toBuffer()
}
