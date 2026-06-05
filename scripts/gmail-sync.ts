#!/usr/bin/env tsx
/**
 * Gmail 받은편지함 → 우편실 자동 동기화.
 *
 * 흐름:
 *   1) 받은편지함 최근 N일 + "토타로:동기화됨" 라벨 없는 메일만
 *   2) 각 메일: 본문 markdown 으로 만들기 + 첨부 추출
 *   3) Claude 분류기로 target_folder 결정
 *   4) Drive 에 본문 .md + 첨부 파일들 업로드 + Supabase inbox_documents 에 인덱스
 *   5) Gmail 에 "토타로:동기화됨" 라벨 부착 (중복 방지)
 *
 * 사용:
 *   npx tsx scripts/gmail-sync.ts                  # 7일치
 *   npx tsx scripts/gmail-sync.ts --days 30        # 30일치
 *   npx tsx scripts/gmail-sync.ts --dry-run        # 분류 결과만 출력, 실제 저장 X
 *   npx tsx scripts/gmail-sync.ts --max 5          # 5개만
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { ensureFolderPath, getDriveClient, getFolderTree, uploadFile } from '../lib/drive/client'
import {
  applyLabel,
  downloadAttachment,
  ensureLabel,
  getGmailClient,
  getMessage,
  listRecentMessages,
} from '../lib/gmail/client'
import { classifyDocument } from '../lib/mailroom/classify'

import type { ExtractedContent } from '../lib/mailroom/extract'

const SYNC_LABEL = '토타로:동기화됨'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

// 팀 멤버 (분류기 입력)
const MEMBERS = ['태준', '준빈', '승주']

type Args = {
  days: number
  maxResults: number
  dryRun: boolean
}

function parseArgs(): Args {
  const argv = process.argv.slice(2)
  let days = 7
  let max = 50
  let dryRun = false
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a === '--days') days = parseInt(argv[++i] ?? '7', 10)
    else if (a === '--max') max = parseInt(argv[++i] ?? '50', 10)
    else if (a === '--dry-run') dryRun = true
  }
  return { days, maxResults: max, dryRun }
}

async function main(): Promise<void> {
  const args = parseArgs()
  console.log(`[gmail-sync] 시작 — days=${args.days} max=${args.maxResults} dryRun=${args.dryRun}`)

  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요.')
  }

  const gmail = getGmailClient()
  const drive = getDriveClient()

  // 동기화 라벨 미리 만들거나 ID 받기
  const syncLabelId = await ensureLabel(gmail, SYNC_LABEL)
  console.log(`[gmail-sync] sync 라벨 ID: ${syncLabelId}`)

  // 이미 동기화된 메일 제외 (검색 쿼리 1차 + 라벨 ID 백스톱 2차).
  // 주의: 라벨 이름에 콜론(":")이 있으면 Gmail 검색에서 따옴표로 감싸면 안 된다.
  //   -label:"토타로:동기화됨"  → 콜론이 label: 연산자와 충돌해 아무것도 매칭 못함(전부 반환)
  //   -label:토타로:동기화됨    → 정상 (검증: label ID 매칭 20건과 동일)
  const query = `-label:${SYNC_LABEL}`
  const listed = await listRecentMessages(gmail, {
    days: args.days,
    maxResults: args.maxResults,
    query,
  })
  // 백스톱: 검색 쿼리가 혹시 놓쳐도 라벨 ID 로 한 번 더 거른다 (cron 중복 폭발 방지).
  const messages = listed.filter((m) => !m.labelIds.includes(syncLabelId))
  const dedupSkipped = listed.length - messages.length
  if (dedupSkipped > 0) {
    console.log(`[gmail-sync] 이미 동기화됨 ${dedupSkipped}건 제외 (라벨 ID 백스톱)`)
  }
  console.log(`[gmail-sync] 처리 대상: ${messages.length}건`)

  if (messages.length === 0) {
    console.log('[gmail-sync] 새 메일 없음. 끝.')
    return
  }

  // 폴더 트리 한 번만 가져오기 (분류기 입력)
  const availableFolders = await getFolderTree(drive)
  console.log(`[gmail-sync] 폴더 후보 ${availableFolders.length}개`)

  let okCount = 0
  let skipCount = 0
  let errCount = 0

  for (const msg of messages) {
    try {
      console.log(`\n[gmail-sync] 처리: "${msg.subject}" from ${msg.from}`)

      const full = await getMessage(gmail, msg.id)

      // 본문 markdown 생성
      const bodyMd = buildBodyMarkdown(full)

      // 분류기 입력: 본문 텍스트 (요약은 Claude 가 알아서)
      const extracted: ExtractedContent = {
        tier: 1,
        text: bodyMd.slice(0, 4000),
        useVision: false,
        method: 'gmail-body',
      }
      const filenameForClassify = `[Gmail] ${full.subject || '제목없음'}`

      const classification = await classifyDocument({
        filename: filenameForClassify,
        userDescription: `Gmail 받은편지함: ${full.from} 가 보낸 메일`,
        extracted,
        availableFolders,
        members: MEMBERS,
      })

      console.log(
        `   → 분류: ${classification.target_folder_path} (${classification.method}, conf=${classification.confidence})`
      )
      console.log(`   doc_type: ${classification.doc_type}`)
      console.log(`   summary: ${classification.summary.slice(0, 100)}...`)

      if (args.dryRun) {
        console.log(`   [DRY-RUN] 실제 업로드 안 함`)
        skipCount++
        continue
      }

      // 폴더 확보
      const folderId = await ensureFolderPath(drive, classification.target_folder_path)

      // 1) 본문 markdown 업로드
      const bodyFilename = `${sanitizeFilename(full.subject || 'untitled')}.md`
      const bodyUploaded = await uploadFile(
        drive,
        folderId,
        bodyFilename,
        bodyMd,
        'text/markdown; charset=utf-8'
      )
      console.log(`   ✓ 본문 업로드: ${bodyFilename} (${bodyUploaded.id})`)

      await indexInSupabase({
        driveFileId: bodyUploaded.id,
        driveFolderId: folderId,
        filename: bodyFilename,
        mimeType: 'text/markdown',
        folderPath: classification.target_folder_path,
        description: classification.summary,
        docType: classification.doc_type,
        aiReasoning: `Gmail: ${full.from} | ${full.subject}`,
        sizeBytes: Buffer.byteLength(bodyMd, 'utf-8'),
        confidence: classification.confidence,
      })

      // 2) 첨부도 같은 폴더에
      for (const att of full.attachments) {
        const buf = await downloadAttachment(gmail, msg.id, att.attachmentId)
        const attUploaded = await uploadFile(drive, folderId, att.filename, buf, att.mimeType)
        console.log(`   ✓ 첨부 업로드: ${att.filename} (${attUploaded.id})`)
        await indexInSupabase({
          driveFileId: attUploaded.id,
          driveFolderId: folderId,
          filename: att.filename,
          mimeType: att.mimeType,
          folderPath: classification.target_folder_path,
          description: `[첨부] ${full.subject}`,
          docType: classification.doc_type,
          aiReasoning: `Gmail 첨부: ${full.from} | ${full.subject}`,
          sizeBytes: att.sizeBytes,
          confidence: classification.confidence,
        })
      }

      // 3) Gmail 라벨 부착 (중복 방지)
      await applyLabel(gmail, msg.id, syncLabelId)

      okCount++
    } catch (e) {
      errCount++
      console.error(`   ❌ 실패: ${e instanceof Error ? e.message : String(e)}`)
    }
  }

  console.log('')
  console.log('='.repeat(60))
  console.log(`[gmail-sync] 완료: 성공=${okCount} 건너뜀=${skipCount} 실패=${errCount}`)
  console.log('='.repeat(60))
}

function buildBodyMarkdown(m: {
  from: string
  to: string
  subject: string
  date: Date | null
  bodyText: string
  attachments: { filename: string; mimeType: string; sizeBytes: number }[]
}): string {
  const lines: string[] = []
  lines.push(`# ${m.subject || '제목 없음'}`)
  lines.push('')
  lines.push(`- **From:** ${m.from}`)
  lines.push(`- **To:** ${m.to}`)
  lines.push(`- **Date:** ${m.date ? m.date.toISOString() : '-'}`)
  if (m.attachments.length) {
    lines.push(`- **첨부:** ${m.attachments.map((a) => a.filename).join(', ')}`)
  }
  lines.push('')
  lines.push('---')
  lines.push('')
  lines.push(m.bodyText)
  return lines.join('\n')
}

function sanitizeFilename(s: string): string {
  return s
    .replace(/[/\\?%*:|"<>]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 100)
}

async function indexInSupabase(row: {
  driveFileId: string
  driveFolderId: string
  filename: string
  mimeType: string
  folderPath: string
  description: string
  docType: string
  aiReasoning: string
  sizeBytes: number
  confidence: number
}): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/inbox_documents`, {
    method: 'POST',
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      drive_file_id: row.driveFileId,
      drive_folder_id: row.driveFolderId,
      filename: row.filename,
      mime_type: row.mimeType,
      folder_path: row.folderPath,
      description: row.description,
      doc_type: row.docType,
      ai_reasoning: row.aiReasoning,
      classification_confidence: row.confidence,
      classified_by_ai: true,
      size_bytes: row.sizeBytes,
      source: 'gmail',
      status: 'classified',
    }),
  })
  if (!res.ok) {
    const txt = await res.text()
    throw new Error(`Supabase 인덱스 실패: ${res.status} ${txt}`)
  }
}

main().catch((e) => {
  console.error('[gmail-sync] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
