/**
 * User-Agent 문자열을 AI 봇 카테고리로 분류한다.
 * AEO/GEO bot intelligence 문서의 11개 봇 목록 기반.
 */

export type BotType = 'training' | 'search' | 'user' | 'human' | 'other'

export interface BotIdentity {
  name: string
  type: BotType
  provider: string
  /** 공식 user-agent token (robots.txt 에 적는 그 이름) */
  token: string | null
}

interface BotRule {
  pattern: RegExp
  name: string
  type: BotType
  provider: string
  token: string
}

const RULES: BotRule[] = [
  // OpenAI
  { pattern: /GPTBot/i, name: 'GPTBot', type: 'training', provider: 'OpenAI', token: 'GPTBot' },
  {
    pattern: /ChatGPT-User/i,
    name: 'ChatGPT-User',
    type: 'user',
    provider: 'OpenAI',
    token: 'ChatGPT-User',
  },
  {
    pattern: /OAI-SearchBot/i,
    name: 'OAI-SearchBot',
    type: 'search',
    provider: 'OpenAI',
    token: 'OAI-SearchBot',
  },

  // Anthropic
  {
    pattern: /ClaudeBot/i,
    name: 'ClaudeBot',
    type: 'training',
    provider: 'Anthropic',
    token: 'ClaudeBot',
  },
  {
    pattern: /Claude-User/i,
    name: 'Claude-User',
    type: 'user',
    provider: 'Anthropic',
    token: 'Claude-User',
  },
  {
    pattern: /Claude-SearchBot/i,
    name: 'Claude-SearchBot',
    type: 'search',
    provider: 'Anthropic',
    token: 'Claude-SearchBot',
  },
  {
    pattern: /anthropic-ai/i,
    name: 'anthropic-ai (legacy)',
    type: 'training',
    provider: 'Anthropic',
    token: 'anthropic-ai',
  },
  {
    pattern: /Claude-Web/i,
    name: 'Claude-Web (legacy)',
    type: 'user',
    provider: 'Anthropic',
    token: 'Claude-Web',
  },

  // Perplexity
  {
    pattern: /PerplexityBot/i,
    name: 'PerplexityBot',
    type: 'search',
    provider: 'Perplexity',
    token: 'PerplexityBot',
  },
  {
    pattern: /Perplexity-User/i,
    name: 'Perplexity-User',
    type: 'user',
    provider: 'Perplexity',
    token: 'Perplexity-User',
  },

  // Google (AI 관련 우선)
  {
    pattern: /Google-Extended/i,
    name: 'Google-Extended',
    type: 'training',
    provider: 'Google',
    token: 'Google-Extended',
  },
  {
    pattern: /Google-NotebookLM/i,
    name: 'Google-NotebookLM',
    type: 'user',
    provider: 'Google',
    token: 'Google-NotebookLM',
  },
  {
    pattern: /Google-CloudVertexBot/i,
    name: 'Google-CloudVertexBot',
    type: 'training',
    provider: 'Google',
    token: 'Google-CloudVertexBot',
  },
  {
    pattern: /Googlebot-Image/i,
    name: 'Googlebot-Image',
    type: 'search',
    provider: 'Google',
    token: 'Googlebot-Image',
  },
  {
    pattern: /Googlebot/i,
    name: 'Googlebot',
    type: 'search',
    provider: 'Google',
    token: 'Googlebot',
  },
  {
    pattern: /Google-InspectionTool/i,
    name: 'Google-InspectionTool',
    type: 'other',
    provider: 'Google',
    token: 'Google-InspectionTool',
  },

  // 기타 AI / 검색
  {
    pattern: /Bingbot/i,
    name: 'Bingbot',
    type: 'search',
    provider: 'Microsoft',
    token: 'Bingbot',
  },
  {
    pattern: /Bytespider/i,
    name: 'Bytespider',
    type: 'training',
    provider: 'ByteDance',
    token: 'Bytespider',
  },
  {
    pattern: /Meta-ExternalAgent/i,
    name: 'Meta-ExternalAgent',
    type: 'user',
    provider: 'Meta',
    token: 'Meta-ExternalAgent',
  },
  {
    pattern: /Amazonbot/i,
    name: 'Amazonbot',
    type: 'training',
    provider: 'Amazon',
    token: 'Amazonbot',
  },
  {
    pattern: /DuckAssistBot/i,
    name: 'DuckAssistBot',
    type: 'search',
    provider: 'DuckDuckGo',
    token: 'DuckAssistBot',
  },
]

const HUMAN_BROWSER = /Mozilla.*(?:Chrome|Safari|Firefox|Edge|Brave)/i
const BOT_HINT = /bot|crawler|spider|fetcher/i

export function identifyBot(userAgent: string | null | undefined): BotIdentity {
  if (!userAgent) {
    return { name: '(no user-agent)', type: 'other', provider: 'unknown', token: null }
  }

  for (const rule of RULES) {
    if (rule.pattern.test(userAgent)) {
      return {
        name: rule.name,
        type: rule.type,
        provider: rule.provider,
        token: rule.token,
      }
    }
  }

  // 사람 브라우저 추정
  if (HUMAN_BROWSER.test(userAgent) && !BOT_HINT.test(userAgent)) {
    return { name: 'Browser', type: 'human', provider: 'human', token: null }
  }

  return {
    name: userAgent.split('/')[0]?.slice(0, 30) ?? 'Unknown',
    type: 'other',
    provider: 'unknown',
    token: null,
  }
}
