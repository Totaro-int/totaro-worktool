#!/usr/bin/env tsx
/**
 * inbox_documents 의 body_excerpt 컬럼 1회 백필.
 *
 * 흐름:
 *   1) body_excerpt IS NULL + drive_file_id 있음 + status 살아있음 + 텍스트형 mime
 *      → 50건씩 가져옴
 *   2) 각 문서: Drive 에서 본문 다운로드 → extractContent → 1500자 발췌
 *   3) Supabase 업데이트: body_excerpt = <발췌>
 *   4) 더 처리할 문서가 없을 때까지 반복
 *
 * 멱등 + 재실행 안전: 이미 body_excerpt 가 있는 문서는 다시 안 받음.
 *
 * 사용:
 *   npm run backfill:excerpts
 *
 * 사전:
 *   - supabase/inbox-body-excerpt.sql 실행 (컬럼 추가)
 *   - .env.local: GOOGLE_SERVICE_ACCOUNT_JSON + Supabase 키
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { getDriveClient } from '../lib/drive/client'
import { extractContent } from '../lib/mailroom/extract'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { drive_v3 } from 'googleapis'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const FETCH_LIMIT = 50
const EXCERPT_LEN = 1500
const SELECT_COLS = 'id, filename, drive_file_id, mime_type'

type DocRow = {
  id: string
  filename: string
  drive_file_id: string
  mime_type: string | null
}

function isTextual(filename: string, mimeType: string | null): boolean {
  const mime = (mimeType ?? '').toLowerCase()
  const name = filename.toLowerCase()
  return (
    mime === 'application/pdf' ||
    mime.startsWith('text/') ||
    mime === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    /\.(pdf|docx|txt|md)$/.test(name)
  )
}

/** Drive 본문 발췌. 비텍스트/실패는 빈 문자열. */
async function fetchExcerpt(drive: drive_v3.Drive, d: DocRow): Promise<string> {
  if (!isTextual(d.filename, d.mime_type)) return ''
  try {
    const res = await drive.files.get(
      { fileId: d.drive_file_id, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    )
    const buf = Buffer.from(res.data as ArrayBuffer)
    const extracted = await extractContent(buf, d.filename, d.mime_type ?? '')
    if (extracted.tier === 1 && extracted.text) {
      return extracted.text.slice(0, EXCERPT_LEN)
    }
  } catch {
    // 개별 실패는 무시
  }
  return ''
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요.')
  }

  const supabase: SupabaseClient = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false },
  })
  const drive = getDriveClient()

  let totalProcessed = 0
  let totalUpdated = 0

  for (;;) {
    const { data, error } = await supabase
      .from('inbox_documents')
      .select(SELECT_COLS)
      .is('body_excerpt', null)
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .order('created_at', { ascending: false })
      .limit(FETCH_LIMIT)
    if (error) throw error
    const batch = (data ?? []) as DocRow[]
    if (batch.length === 0) break

    console.log(`[backfill] ${batch.length}건 처리 중... (누적 ${totalProcessed})`)

    // Drive 다운로드 + 추출은 병렬 (체감 속도 빠름)
    const results = await Promise.all(
      batch.map(async (d) => ({ id: d.id, excerpt: await fetchExcerpt(drive, d) }))
    )

    // Supabase 일괄 업데이트 — null 도 한 번씩 채워 다음 실행에서 재시도 안 함
    // 정확히는 빈 문자열로 저장해 "백필 시도했지만 없음" 표시 (NULL 과 구분).
    for (const r of results) {
      const { error: upErr } = await supabase
        .from('inbox_documents')
        .update({ body_excerpt: r.excerpt || '' })
        .eq('id', r.id)
      if (upErr) throw upErr
      if (r.excerpt) totalUpdated++
    }
    totalProcessed += batch.length
  }

  console.log(
    `[backfill] 완료 — 처리 ${totalProcessed}건 (그 중 본문 추출 성공 ${totalUpdated}건).`
  )
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
