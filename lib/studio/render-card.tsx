/**
 * 카드 1장을 1080² PNG 로 렌더 — next/og(Satori).
 *
 * Satori 는 공급한 폰트 버퍼로 글자를 직접 그린다(시스템 폰트 무관) → Vercel(리눅스)에서도
 * 한글이 두부(ㅁ)로 안 깨진다. sharp+SVG @font-face 는 Vercel 에서 폰트를 못 먹어 폐기.
 */
import fs from 'node:fs'
import path from 'node:path'

import { ImageResponse } from 'next/og'

export type RenderCardInput = {
  kicker: string
  headline: string
  sub: string
  photo: string | null
}

const FONT_DIR = path.join(process.cwd(), 'assets', 'fonts')
let _reg: Buffer | null = null
let _bold: Buffer | null = null
function fonts(): { reg: Buffer; bold: Buffer } {
  if (!_reg || !_bold) {
    _reg = fs.readFileSync(path.join(FONT_DIR, 'Pretendard-Regular.otf'))
    _bold = fs.readFileSync(path.join(FONT_DIR, 'Pretendard-Bold.otf'))
  }
  return { reg: _reg, bold: _bold }
}

function CardView({ card }: { card: RenderCardInput }): React.JSX.Element {
  const hasPhoto = Boolean(card.photo)
  const kC = hasPhoto ? '#F0E8DD' : '#7F7366'
  const hC = hasPhoto ? '#F7F1E8' : '#222222'
  const sC = hasPhoto ? '#EADFCF' : '#7F7366'
  const hLines = (card.headline || '').split('\n').slice(0, 3)
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        position: 'relative',
        fontFamily: 'Pretendard',
        backgroundColor: hasPhoto ? '#C9B8A3' : '#F0E8DD',
      }}
    >
      {hasPhoto && card.photo ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={card.photo}
          width={1080}
          height={1080}
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1080,
            height: 1080,
            objectFit: 'cover',
          }}
          alt=""
        />
      ) : null}
      {hasPhoto ? (
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: 1080,
            height: 1080,
            display: 'flex',
            backgroundColor: 'rgba(28,26,22,0.34)',
          }}
        />
      ) : null}
      <div
        style={{
          position: 'absolute',
          top: 84,
          left: 88,
          display: 'flex',
          fontSize: 34,
          letterSpacing: 10,
          color: kC,
        }}
      >
        {card.kicker || ''}
      </div>
      <div
        style={{
          position: 'absolute',
          left: 88,
          bottom: 84,
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {hLines.map((ln, i) => (
          <div
            key={i}
            style={{ display: 'flex', fontSize: 80, fontWeight: 700, lineHeight: 1.24, color: hC }}
          >
            {ln}
          </div>
        ))}
        <div style={{ display: 'flex', fontSize: 40, color: sC, marginTop: 16 }}>
          {card.sub || ''}
        </div>
        <div style={{ display: 'flex', fontSize: 30, letterSpacing: 12, color: kC, marginTop: 20 }}>
          MONÉ HOUSE
        </div>
      </div>
    </div>
  )
}

/** 카드 → 1080² PNG (ImageResponse). 라우트가 그대로 반환. */
export function renderCardImage(card: RenderCardInput): ImageResponse {
  const { reg, bold } = fonts()
  return new ImageResponse(<CardView card={card} />, {
    width: 1080,
    height: 1080,
    fonts: [
      { name: 'Pretendard', data: reg, weight: 400, style: 'normal' },
      { name: 'Pretendard', data: bold, weight: 700, style: 'normal' },
    ],
  })
}
