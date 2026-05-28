import type { MetadataRoute } from 'next'

/**
 * AEO/GEO 정책 — 11개 AI 봇 명시 허용 + honeypot/blocked/ 만 차단.
 * honeypot/blocked/ 를 fetch 하는 봇은 robots.txt 위반.
 */
export default function robots(): MetadataRoute.Robots {
  const aiBots = [
    'GPTBot',
    'ChatGPT-User',
    'OAI-SearchBot',
    'ClaudeBot',
    'Claude-User',
    'Claude-SearchBot',
    'PerplexityBot',
    'Perplexity-User',
    'Google-Extended',
    'Google-NotebookLM',
    'Google-CloudVertexBot',
    'Googlebot',
    'Bingbot',
  ]

  const aiRules = aiBots.map((userAgent) => ({
    userAgent,
    allow: ['/'],
    disallow: ['/honeypot/blocked/'],
  }))

  return {
    rules: [
      ...aiRules,
      {
        userAgent: '*',
        allow: ['/'],
        disallow: ['/honeypot/blocked/', '/admin/'],
      },
    ],
  }
}
