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
import fs from 'node:fs'
import http from 'node:http'
import os from 'node:os'
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

// 환경변수에 client_id/secret 이 없으면 다운받은 OAuth JSON 에서 직접 읽기.
// 우선순위: argv 로 넘긴 .json 경로 → ~/Downloads/client_secret_*.json
function loadClientCredsFromJson(): { clientId: string; clientSecret: string } | null {
  const candidates: string[] = []
  const argPath = process.argv.slice(2).find((a) => a.endsWith('.json'))
  if (argPath) candidates.push(argPath)
  const downloads = path.join(os.homedir(), 'Downloads')
  try {
    for (const f of fs.readdirSync(downloads)) {
      if (f.startsWith('client_secret_') && f.endsWith('.json')) {
        candidates.push(path.join(downloads, f))
      }
    }
  } catch {
    // Downloads 폴더 없으면 무시
  }
  for (const file of candidates) {
    try {
      const parsed = JSON.parse(fs.readFileSync(file, 'utf-8')) as {
        installed?: { client_id?: string; client_secret?: string }
        web?: { client_id?: string; client_secret?: string }
      }
      const node = parsed.installed ?? parsed.web
      if (node?.client_id && node?.client_secret) {
        console.log(`[gmail-auth] client 자격증명 읽음: ${file}`)
        return { clientId: node.client_id, clientSecret: node.client_secret }
      }
    } catch {
      // 파싱 실패하면 다음 후보 시도
    }
  }
  return null
}

// .env.local 에 빠진 키만 골라서 추가 (이미 있으면 건드리지 않음).
function appendEnvIfMissing(entries: Record<string, string>): void {
  const envPath = path.join(repoRoot, '.env.local')
  let existing = ''
  try {
    existing = fs.readFileSync(envPath, 'utf-8')
  } catch {
    // .env.local 없으면 새로 생성됨
  }
  const toAdd: string[] = []
  for (const [key, value] of Object.entries(entries)) {
    if (!new RegExp(`^${key}=`, 'm').test(existing)) {
      toAdd.push(`${key}=${value}`)
    }
  }
  if (toAdd.length === 0) {
    console.log('[gmail-auth] .env.local 에 이미 모두 존재 — 변경 없음')
    return
  }
  const prefix = existing === '' || existing.endsWith('\n') ? '' : '\n'
  fs.appendFileSync(
    envPath,
    `${prefix}\n# Gmail OAuth (gmail-auth.ts 자동 추가)\n${toAdd.join('\n')}\n`
  )
  console.log(`[gmail-auth] .env.local 에 추가됨: ${toAdd.map((l) => l.split('=')[0]).join(', ')}`)
}

async function main(): Promise<void> {
  let clientId = process.env.GMAIL_CLIENT_ID
  let clientSecret = process.env.GMAIL_CLIENT_SECRET
  if (!clientId || !clientSecret) {
    const fromJson = loadClientCredsFromJson()
    if (fromJson) {
      clientId = fromJson.clientId
      clientSecret = fromJson.clientSecret
    }
  }
  if (!clientId || !clientSecret) {
    console.error('GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET 를 찾을 수 없습니다.')
    console.error('.env.local 에 넣거나, ~/Downloads 에 client_secret_*.json 을 두세요.')
    console.error('또는: npx tsx scripts/gmail-auth.ts /경로/client_secret.json')
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

  const refreshToken: string = tokens.refresh_token

  appendEnvIfMissing({
    GMAIL_CLIENT_ID: clientId,
    GMAIL_CLIENT_SECRET: clientSecret,
    GMAIL_REFRESH_TOKEN: refreshToken,
  })

  console.log('')
  console.log('='.repeat(70))
  console.log('✅ Gmail 인증 완료 — .env.local 자동 설정됨.')
  console.log('   이제 동기화 테스트:')
  console.log('   npx tsx scripts/gmail-sync.ts --days 1 --dry-run --max 3')
  console.log('='.repeat(70))
}

main().catch((e) => {
  console.error('[gmail-auth] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
