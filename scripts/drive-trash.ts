#!/usr/bin/env tsx
/**
 * Drive 파일을 휴지통으로 보냄 (영구삭제 아님 — Drive 휴지통에서 30일 내 복구 가능).
 *
 * 사용:
 *   npx tsx scripts/drive-trash.ts <fileId> [fileId ...]
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { getDriveClient } from '../lib/drive/client'

async function main(): Promise<void> {
  const ids = process.argv.slice(2).filter((a) => !a.startsWith('-'))
  if (ids.length === 0) {
    console.error('사용: npx tsx scripts/drive-trash.ts <fileId> [fileId ...]')
    process.exit(1)
  }

  const drive = getDriveClient()
  let ok = 0
  let fail = 0
  for (const id of ids) {
    try {
      await drive.files.update({
        fileId: id,
        requestBody: { trashed: true },
        supportsAllDrives: true,
      })
      console.log(`✓ 휴지통으로 이동: ${id}`)
      ok++
    } catch (e) {
      console.error(`✗ 실패 ${id}: ${e instanceof Error ? e.message : String(e)}`)
      fail++
    }
  }
  console.log(`\n[drive-trash] 완료: 성공=${ok} 실패=${fail}`)
}

main().catch((e) => {
  console.error('[drive-trash] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
