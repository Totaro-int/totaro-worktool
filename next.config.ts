import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  // 카드 렌더 서버 함수에 Pretendard 폰트 파일 포함(Vercel 번들 트레이싱)
  outputFileTracingIncludes: {
    '/api/content/render-card': ['./assets/fonts/**'],
  },
  experimental: {
    serverActions: {
      // 문서 업로드를 위해 서버 액션 본문 크기 한도를 늘림
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
