#!/usr/bin/env tsx
/**
 * Google Drive 토타로 루트 폴더 안에 8축 폴더 구조 일괄 생성 (v2, 2026-06).
 *
 * 8축:
 *   01 AI 소싱 플랫폼 (본진)   — 옛 01/02/03/04 통합
 *   05 마케팅·콘텐츠
 *   06 회사 운영
 *   07 에이전트 제작 외주       — 멜라누아 등
 *   08 E커머스                  — 베로티 · 청원농산 등
 *   99 휴지통
 *
 * 실행 전 필요:
 *   - .env.local 에 GOOGLE_SERVICE_ACCOUNT_JSON·GOOGLE_DRIVE_ROOT_FOLDER_ID
 *   - 루트 폴더가 service account 이메일에 "편집자" 권한으로 공유돼있어야 함
 *
 * 사용:
 *   npx tsx scripts/init-drive-folders.ts
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { ensureFolderPath, getDriveClient, getRootFolderId } from '../lib/drive/client'

const STRUCTURE = [
  // 01 AI 소싱 플랫폼 — 본진 (옛 01/02/03/04 통합)
  '/01 AI 소싱 플랫폼/워크허브 (internal)/',
  '/01 AI 소싱 플랫폼/totaro_web (공급사 측)/',
  '/01 AI 소싱 플랫폼/totaro_cos (바이어 측)/',
  '/01 AI 소싱 플랫폼/랜딩페이지·웹 자산/',
  '/01 AI 소싱 플랫폼/기획·spec·디자인/',
  '/01 AI 소싱 플랫폼/버그·이슈 트래킹 자료/',
  '/01 AI 소싱 플랫폼/AI 시스템/마케팅 에이전트/',
  '/01 AI 소싱 플랫폼/AI 시스템/AI 상담 (sj-company)/',
  '/01 AI 소싱 플랫폼/AI 시스템/추천·매칭 엔진/',
  '/01 AI 소싱 플랫폼/AI 시스템/견적 자동화/',
  '/01 AI 소싱 플랫폼/AI 시스템/시스템 프롬프트 archive/',
  '/01 AI 소싱 플랫폼/AI 시스템/평가·테스트 결과/',
  '/01 AI 소싱 플랫폼/공급사 운영/PoC 인포 시트/',
  '/01 AI 소싱 플랫폼/공급사 운영/모집 채널·게이트키퍼/',
  '/01 AI 소싱 플랫폼/공급사 운영/개별 공급사 기록/',
  '/01 AI 소싱 플랫폼/공급사 운영/식품 수출 도메인 자료 (KOTRA·aT 등)/',
  '/01 AI 소싱 플랫폼/바이어 운영/',
  // 05 마케팅·콘텐츠
  '/05 마케팅·콘텐츠/AEO·GEO 측정 데이터/',
  '/05 마케팅·콘텐츠/콘텐츠 draft/',
  '/05 마케팅·콘텐츠/인플루언서 협업/',
  '/05 마케팅·콘텐츠/언론·PR/',
  // 06 회사 운영
  '/06 회사 운영/인사·계약·근로/',
  '/06 회사 운영/회의록·전략 문서/',
  '/06 회사 운영/정부 지원사업/',
  '/06 회사 운영/재무·세무·인보이스/',
  '/06 회사 운영/브랜드·로고·CI/',
  // 07 에이전트 제작 외주
  '/07 에이전트 제작 외주/멜라누아 마케팅 에이전트/',
  // 08 E커머스 (베로티 · 청원농산)
  '/08 E커머스/베로티/',
  '/08 E커머스/청원농산/',
  // 99 휴지통
  '/99 휴지통/',
]

async function main(): Promise<void> {
  console.log('[init-drive-folders] 시작')
  let drive
  try {
    drive = getDriveClient()
    console.log(
      '[init-drive-folders] Drive 클라이언트 OK, root:',
      getRootFolderId().slice(0, 8) + '...'
    )
  } catch (e) {
    console.error('[init-drive-folders] 자격증명 에러:', e instanceof Error ? e.message : String(e))
    process.exit(1)
  }

  let created = 0
  let existing = 0
  for (const pathStr of STRUCTURE) {
    try {
      const before = await drive.files.list({
        q: `name='${pathStr.split('/').pop()}'`,
        fields: 'files(id)',
        pageSize: 1,
      })
      await ensureFolderPath(drive, pathStr)
      if ((before.data.files?.length ?? 0) === 0) {
        created++
        console.log(`  ✅ 생성: ${pathStr}`)
      } else {
        existing++
        console.log(`  ⏭  존재: ${pathStr}`)
      }
    } catch (e) {
      console.error(`  ❌ 실패: ${pathStr} — ${e instanceof Error ? e.message : String(e)}`)
    }
  }
  console.log(`\n[init-drive-folders] 완료. 생성 ${created}건, 기존 ${existing}건.`)
}

main().catch((e) => {
  console.error('[init-drive-folders] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
