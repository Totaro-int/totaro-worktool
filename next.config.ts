import type { NextConfig } from 'next'

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // 문서 업로드를 위해 서버 액션 본문 크기 한도를 늘림
      bodySizeLimit: '50mb',
    },
  },
}

export default nextConfig
