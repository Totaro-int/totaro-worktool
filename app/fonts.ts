import localFont from 'next/font/local'

/**
 * Pretendard — 멜라누아(Melanoir) 콘텐츠 기본 폰트.
 * 한국어 웹 표준. Bold(제목) / Medium(라벨·부제) / Regular(본문).
 */
export const pretendard = localFont({
  src: [
    { path: './fonts/Pretendard-Regular.otf', weight: '400', style: 'normal' },
    { path: './fonts/Pretendard-Medium.otf', weight: '500', style: 'normal' },
    { path: './fonts/Pretendard-Bold.otf', weight: '700', style: 'normal' },
  ],
  variable: '--font-pretendard',
  display: 'swap',
})
