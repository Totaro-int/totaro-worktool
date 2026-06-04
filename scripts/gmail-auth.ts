#!/usr/bin/env tsx
/**
 * Gmail OAuth 첫 인증 — 한 번만 실행.
 *
 * 준비:
 *   1) Google Cloud Console > APIs & Services
 *      - Gmail API "Enable"
 *      - OAuth consent screen 만들기 (External, scopes: gmail.readonly + gmail.modify)
 *      - Credentials > Create OAuth client > "Desktop app"
 *      - Client ID / Secret 받기
 *   2) .env.local 에 임시로 넣기:
 *      GMAIL_CLIENT_ID=...
 *      GMAIL_CLIENT_SECRET=...
 *   3) 이 스크립트 실행:
 *      npx tsx scripts/gmail-auth.ts
 *   4) 출력된 URL 브라우저에서 열기 → 동의 → 자동으로 localhost 콜백 → refresh_token 출력
 *   5) refresh_token 을 .env.local 의 GMAIL_REFRESH_TOKEN 에 박기
 */
import http from 'node:http'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'
import { google } from 'googleapis'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

const SCOPES = [
  'https://www.googleapis.com/auth/gmail.readonly',
  'https://www.googleapis.com/auth/gmail.modify', // 라벨 부착용
]

const PORT = 53682
const REDIRECT_URI = `http://localhost:${PORT}/oauth2callback`

async function main(): Promise<void> {
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    console.error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET 가 .env.local 에 없습니다.')
    console.error('Google Cloud Console > Credentials 에서 Desktop OAuth client 만들고 받으세요.')
    process.exit(1)
  }

  const oauth2 = new google.auth.OAuth2(clientId, clientSecret, REDIRECT_URI)

  const authUrl = oauth2.generateAuthUrl({
    access_type: 'offline', // refresh_token 발급
    prompt: 'consent', // 이미 동의했어도 refresh_token 다시 받기
    scope: SCOPES,
  })

  console.log('')
  console.log('='.repeat(70))
  console.log('🔐 Gmail OAuth 동의 URL — 브라우저에서 여세요:')
  console.log('')
  console.log(authUrl)
  console.log('')
  console.log('동의 후 자동으로 localhost 콜백이 떨어지면 refresh_token 이 여기 표시됩니다.')
  console.log('='.repeat(70))
  console.log('')

  // 콜백용 임시 서버
  const code = await new Promise<string>((resolve, reject) => {
    const server = http.createServer((req, res) => {
      try {
        const url = new URL(req.url ?? '/', `http://localhost:${PORT}`)
        if (url.pathname !== '/oauth2callback') {
          res.statusCode = 404
          res.end('Not Found')
          return
        }
        const err = url.searchParams.get('error')
        if (err) {
          res.statusCode = 400
          res.end(`OAuth error: ${err}`)
          server.close()
          reject(new Error(err))
          return
        }
        const c = url.searchParams.get('code')
        if (!c) {
          res.statusCode = 400
          res.end('No code parameter')
          return
        }
        res.statusCode = 200
        res.setHeader('Content-Type', 'text/html; charset=utf-8')
        res.end(
          '<html><body style="font-family:system-ui;padding:40px"><h2>✅ 인증 완료</h2><p>터미널로 돌아가세요.</p></body></html>'
        )
        server.close()
        resolve(c)
      } catch (e) {
        reject(e)
      }
    })
    server.listen(PORT, () => {
      console.log(`[gmail-auth] localhost:${PORT} 대기 중...`)
    })
    server.on('error', reject)
  })

  console.log('[gmail-auth] code 받음, token 교환 중...')
  const { tokens } = await oauth2.getToken(code)
  if (!tokens.refresh_token) {
    console.error(
      '⚠️  refresh_token 이 없습니다. consent screen 에서 이미 승인한 적이 있으면 일어남.'
    )
    console.error('   Google 계정 > 보안 > 타사 앱 권한 에서 이 앱 권한 제거 후 다시 시도하세요.')
    process.exit(1)
  }

  console.log('')
  console.log('='.repeat(70))
  console.log('✅ refresh_token 발급 완료. .env.local 에 다음을 추가하세요:')
  console.log('')
  console.log(`GMAIL_REFRESH_TOKEN=${tokens.refresh_token}`)
  console.log('')
  console.log('='.repeat(70))
}

main().catch((e) => {
  console.error('[gmail-auth] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
