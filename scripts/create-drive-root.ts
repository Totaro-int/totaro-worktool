#!/usr/bin/env tsx
/**
 * Service Account 가 자기 Drive에 "토타로" 루트 폴더를 만들고,
 * 사용자(YOUR_EMAIL)에게 편집자 권한으로 공유한다.
 *
 * 결과로 출력된 폴더 ID 를 .env.local 의 GOOGLE_DRIVE_ROOT_FOLDER_ID 에 넣는다.
 *
 * 사용:
 *   npx tsx scripts/create-drive-root.ts your@email.com
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { getDriveClient } from '../lib/drive/client'

const FOLDER_MIME = 'application/vnd.google-apps.folder'
const FOLDER_NAME = '토타로'

async function main(): Promise<void> {
  const userEmail = process.argv[2]
  if (!userEmail || !userEmail.includes('@')) {
    console.error('사용법: npx tsx scripts/create-drive-root.ts your@email.com')
    process.exit(1)
  }

  console.log(
    `[create-drive-root] service account 로 '${FOLDER_NAME}' 폴더 생성 + ${userEmail} 공유`
  )
  const drive = getDriveClient()

  // 이미 만들어진 게 있나 (중복 방지)
  const existing = await drive.files.list({
    q: `name='${FOLDER_NAME}' and mimeType='${FOLDER_MIME}' and trashed=false`,
    fields: 'files(id, name, webViewLink)',
  })
  let folderId: string
  let webViewLink: string | null = null
  if ((existing.data.files?.length ?? 0) > 0) {
    folderId = existing.data.files![0].id ?? ''
    webViewLink = existing.data.files![0].webViewLink ?? null
    console.log(`[create-drive-root] 이미 존재: ${folderId}`)
  } else {
    const created = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: FOLDER_MIME },
      fields: 'id, webViewLink',
    })
    folderId = created.data.id ?? ''
    webViewLink = created.data.webViewLink ?? null
    console.log(`[create-drive-root] 새로 생성: ${folderId}`)
  }
  if (!folderId) throw new Error('폴더 ID 못 받음')

  // 사용자 권한 — 편집자
  try {
    await drive.permissions.create({
      fileId: folderId,
      requestBody: { type: 'user', role: 'writer', emailAddress: userEmail },
      sendNotificationEmail: false,
    })
    console.log(`[create-drive-root] ✅ ${userEmail} 에게 편집자 권한 부여`)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes('alreadyExists') || msg.includes('already exists')) {
      console.log(`[create-drive-root] ⏭  ${userEmail} 이미 권한 있음`)
    } else {
      throw e
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log('✅ 완료. 다음 명령으로 .env.local 에 박기:')
  console.log('')
  console.log(`  echo "GOOGLE_DRIVE_ROOT_FOLDER_ID=${folderId}" >> .env.local`)
  console.log('')
  if (webViewLink) {
    console.log(`Drive 에서 보기: ${webViewLink}`)
    console.log('(공유 문서함 → "토타로" 또는 위 링크로 접근)')
  }
  console.log('='.repeat(60))
}

main().catch((e) => {
  console.error('[create-drive-root] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
