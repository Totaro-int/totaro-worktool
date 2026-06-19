import type { JSX } from 'react'

import { Geist, Geist_Mono } from 'next/font/google'

import type { Metadata, Viewport } from 'next'
import './globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Totaro 업무관리',
  description: '토타로 팀의 모든 업무를 한 곳에서 관리하는 대시보드',
  applicationName: 'Totaro',
  manifest: '/manifest.webmanifest',
  // iOS '홈 화면에 추가' → 풀스크린 standalone 앱
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black',
    title: 'Totaro',
  },
  icons: {
    icon: '/icon-192.png',
    apple: '/apple-touch-icon.png',
  },
  // Next 16 은 표준 mobile-web-app-capable 만 냄 → 구형 iOS standalone 위해 레거시 태그도 명시
  other: {
    'apple-mobile-web-app-capable': 'yes',
  },
}

export const viewport: Viewport = {
  themeColor: '#222222',
  viewportFit: 'cover', // 노치 대응(standalone)
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>): JSX.Element {
  return (
    <html lang="ko" className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
      <body className="font-sans">{children}</body>
    </html>
  )
}
