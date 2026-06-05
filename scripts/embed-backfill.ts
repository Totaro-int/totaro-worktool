#!/usr/bin/env tsx
/**
 * 우편실 문서 일괄 임베딩(백필) — 의미 검색을 켜기 위한 1회성 작업.
 *
 * 흐름:
 *   1) inbox_documents 에서 살아있고(drive_file_id 있음, trashed/rejected/failed 아님)
 *      아직 embedding 이 비어있는 문서를 50건씩 가져온다.
 *   2) 텍스트형(pdf/docx/txt/md) 은 Drive 본문을 받아 발췌(~1500자)까지 붙인다.
 *   3) 메타데이터 + 발췌를 Vertex AI 로 임베딩(768차원).
 *   4) 각 행의 embedding 컬럼에 '[...]' 문자열로 저장(pgvector 캐스팅).
 *   5) 더 처리할 문서가 없을 때까지 반복.
 *
 * 멱등 + 재실행 안전: 이미 embedding 이 있는 문서는 건너뛴다.
 * 새 문서가 쌓이면 다시 돌리면 새것만 채운다.
 *
 * 사용:
 *   npm run embed:backfill
 *
 * 사전 준비(없으면 임베딩 단계에서 멈춤):
 *   - supabase/assistant-embeddings.sql 실행(embedding 컬럼/인덱스/함수)
 *   - GCP: Vertex AI API 활성화 + 서비스 계정에 "Vertex AI User" 역할
 *   - .env.local: GOOGLE_SERVICE_ACCOUNT_JSON (Drive 와 동일 키 재사용)
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { embedTexts } from '../lib/assistant/embedding'
import { getDriveClient } from '../lib/drive/client'
import { extractContent } from '../lib/mailroom/extract'

import type { SupabaseClient } from '@supabase/supabase-js'
import type { drive_v3 } from 'googleapis'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

const FETCH_LIMIT = 50 // 한 번에 가져올 미임베딩 문서 수
const EXCERPT_LEN = 1500 // 본문 발췌 길이(자)

const SELECT_COLS =
  'id, filename, description, doc_type, folder_path, ai_reasoning, drive_file_id, mime_type'

type DocRow = {
  id: string
  filename: string
  description: string | null
  doc_type: string | null
  folder_path: string | null
  ai_reasoning: string | null
  drive_file_id: string | null
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

/** Drive 본문 발췌(텍스트형만). 실패·비텍스트는 빈 문자열 → 메타데이터만 임베딩. */
async function fetchExcerpt(drive: drive_v3.Drive | null, d: DocRow): Promise<string> {
  if (!drive || !d.drive_file_id || !isTextual(d.filename, d.mime_type)) return ''
  try {
    const res = await drive.files.get(
      { fileId: d.drive_file_id, alt: 'media', supportsAllDrives: true },
      { responseType: 'arraybuffer' }
    )
    const buf = Buffer.from(res.data as ArrayBuffer)
    const extracted = await extractContent(buf, d.filename, d.mime_type ?? '')
    if (extracted.tier === 1 && extracted.text) return extracted.text.slice(0, EXCERPT_LEN)
  } catch {
    // 개별 파일 실패는 무시 — 나머지로 진행
  }
  return ''
}

/** 임베딩 입력 텍스트 = 메타데이터 + (가능하면) 본문 발췌. */
function buildText(d: DocRow, excerpt: string): string {
  return [d.filename, d.doc_type, d.folder_path, d.description, d.ai_reasoning, excerpt]
    .map((s) => (s ?? '').trim())
    .filter(Boolean)
    .join('\n')
}

async function main(): Promise<void> {
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요.')
  }
  const supabase: SupabaseClient = createSupabaseClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  let drive: drive_v3.Drive | null = null
  try {
    drive = getDriveClient()
  } catch {
    console.warn('[embed-backfill] Drive 미설정 — 본문 발췌 없이 메타데이터만 임베딩합니다.')
  }

  let total = 0
  let failed = 0
  for (;;) {
    const { data, error } = await supabase
      .from('inbox_documents')
      .select(SELECT_COLS)
      .not('drive_file_id', 'is', null)
      .not('status', 'in', '(trashed,rejected,failed)')
      .is('embedding', null)
      .limit(FETCH_LIMIT)
    if (error) throw new Error(`문서 조회 실패: ${error.message}`)
    const rows = (data ?? []) as DocRow[]
    if (rows.length === 0) break

    console.log(`[embed-backfill] ${rows.length}건 처리 중... (누적 ${total})`)

    // 1) 본문 발췌(병렬) → 2) 임베딩 입력 텍스트
    const excerpts = await Promise.all(rows.map((d) => fetchExcerpt(drive, d)))
    const texts = rows.map((d, i) => buildText(d, excerpts[i]))

    // 3) 임베딩(문서용 task). null 이면 키/권한/쿼터 문제 → 중단.
    const vecs = await embedTexts(texts, 'RETRIEVAL_DOCUMENT')
    if (!vecs) {
      throw new Error(
        '임베딩 실패 — Vertex AI 설정을 확인하세요. ' +
          '(GOOGLE_SERVICE_ACCOUNT_JSON / Vertex AI API 활성화 / "Vertex AI User" 역할 / 쿼터)'
      )
    }
    if (vecs.length !== rows.length) {
      throw new Error(`임베딩 개수 불일치: 기대 ${rows.length}, 수신 ${vecs.length}`)
    }

    // 4) 행별 업데이트 — pgvector 는 '[...]' 문자열로 넘긴다(JS 배열 직접 X)
    let batchUpdated = 0
    for (let i = 0; i < rows.length; i++) {
      const { error: upErr } = await supabase
        .from('inbox_documents')
        .update({ embedding: JSON.stringify(vecs[i]) })
        .eq('id', rows[i].id)
      if (upErr) {
        failed++
        console.error(`  - ${rows[i].filename} 업데이트 실패: ${upErr.message}`)
      } else {
        batchUpdated++
        total++
      }
    }

    // 이 배치에서 한 건도 못 채웠으면 같은 배치를 무한 재조회하는 걸 방지
    if (batchUpdated === 0) {
      console.error('[embed-backfill] 배치 갱신 0건 — 중단(무한루프 방지).')
      break
    }
  }

  console.log(`[embed-backfill] 완료 — ${total}건 임베딩${failed ? `, ${failed}건 실패` : ''}.`)
}

main().catch((e) => {
  console.error('[embed-backfill] 치명적 오류:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
