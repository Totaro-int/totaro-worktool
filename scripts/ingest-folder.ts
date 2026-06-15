#!/usr/bin/env tsx
/**
 * 로컬 폴더 → 우편실 일괄 수신 (카카오톡 클라우드 등 외부 자료 마이그레이션용).
 *
 * 흐름:
 *   1) 지정 폴더 재귀 walk
 *   2) 각 파일: 추출 → 분류(Gemini → Claude CLI → 파일명) → Drive 업로드
 *      → inbox_documents 행(status=confirmed, source=bulk-ingest) 생성
 *   3) 같은 파일명·크기 가 이미 들어가 있으면 자동 skip (멱등)
 *
 * 사용:
 *   npm run ingest:folder -- <폴더 경로>              # dry-run (분류 결과만 출력)
 *   npm run ingest:folder -- <폴더 경로> --commit     # 실제 업로드
 *   npm run ingest:folder -- <폴더 경로> --limit=5    # 처음 N개만
 *
 * 사전 (.env.local):
 *   - GOOGLE_SERVICE_ACCOUNT_JSON, GOOGLE_DRIVE_ROOT_FOLDER_ID
 *   - NEXT_PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY
 *
 * 끝나고:
 *   npm run embed:backfill   # 새로 들어온 문서 임베딩 갱신
 */
import fs from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { loadEnvConfig } from '@next/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { getVertexAccess, vertexUrl } from '../lib/assistant/vertex'
import { ensureFolderPath, getDriveClient, getFolderTree, uploadFile } from '../lib/drive/client'
import { classifyDocument } from '../lib/mailroom/classify'
import { extractContent } from '../lib/mailroom/extract'

import type { ClassificationResult } from '../lib/mailroom/classify'

/** Gemini 가 멀티모달로 직접 처리 가능한 이미지 MIME — 카톡 사진·스크린샷 분류용 */
const VISION_MIMES = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic', 'image/heif'])
const VISION_MODEL = 'gemini-2.5-flash'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

/** 무시할 시스템·잡 파일 */
const IGNORE_NAMES = new Set(['.DS_Store', 'Thumbs.db', '.keep', '.gitkeep'])

/** 확장자 → MIME (Drive 메타 + extract 분기용) */
const MIME_BY_EXT: Record<string, string> = {
  pdf: 'application/pdf',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  doc: 'application/msword',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  xls: 'application/vnd.ms-excel',
  pptx: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
  ppt: 'application/vnd.ms-powerpoint',
  txt: 'text/plain',
  md: 'text/markdown',
  csv: 'text/csv',
  hwp: 'application/x-hwp',
  hwpx: 'application/x-hwpx',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  heic: 'image/heic',
  zip: 'application/zip',
}

/**
 * --docs-only 시 허용할 확장자.
 *
 * 정책: 개발 문서(.md/.json/code) 는 GitHub 단일 소스, Drive 에 넣지 않는다.
 * → .md 는 의도적으로 제외. (예외: Gmail 메일룸은 메일 본문을 .md 로 저장하는데
 *   그건 별도 경로 — `source='gmail'` — 라 여기 영향 받지 않음.)
 */
const DOC_EXTS = new Set(['pdf', 'docx', 'doc', 'txt', 'hwp', 'hwpx', 'xlsx', 'xls', 'pptx', 'ppt'])

type Args = { dir: string; commit: boolean; limit: number; docsOnly: boolean }

function parseArgs(argv: string[]): Args {
  const args = argv.slice(2)
  let dir = ''
  let commit = false
  let limit = 0
  let docsOnly = false
  for (const a of args) {
    if (a === '--commit') commit = true
    else if (a === '--docs-only') docsOnly = true
    else if (a.startsWith('--limit=')) limit = parseInt(a.split('=')[1] ?? '0', 10) || 0
    else if (!a.startsWith('--')) dir ||= a
  }
  return { dir, commit, limit, docsOnly }
}

async function walk(dir: string): Promise<string[]> {
  const out: string[] = []
  for (const entry of await fs.readdir(dir, { withFileTypes: true })) {
    if (IGNORE_NAMES.has(entry.name) || entry.name.startsWith('.')) continue
    const p = path.join(dir, entry.name)
    if (entry.isDirectory()) out.push(...(await walk(p)))
    else if (entry.isFile()) out.push(p)
  }
  return out
}

function detectMime(filename: string): string {
  const ext = path.extname(filename).slice(1).toLowerCase()
  return MIME_BY_EXT[ext] ?? 'application/octet-stream'
}

/**
 * 이미지를 Gemini Vision 으로 직접 분류. 카톡 스크린샷·사진처럼
 * 파일명에 정보가 없는 경우에 유일하게 내용 기반 분류가 가능한 경로.
 * 지원 안 되는 MIME 이거나 호출 실패면 null 반환 → 일반 경로로 폴백.
 */
async function classifyImageWithVision(
  filename: string,
  buffer: Buffer,
  mime: string,
  availableFolders: string[],
  members: string[]
): Promise<ClassificationResult | null> {
  if (!VISION_MIMES.has(mime)) return null
  const access = await getVertexAccess()
  if (!access) return null

  const folderList = availableFolders.map((f) => `  - ${f}`).join('\n')
  const prompt = `토타로 팀 (한국 식품 OEM ↔ 해외 바이어 매칭) 의 이미지 자동 분류기.

[가능한 폴더 트리]
${folderList || '  (비어있음 — 새 폴더 제안)'}

[입력 이미지]
- 파일명: ${filename}
- 첨부된 이미지를 직접 분석해서 내용 기반으로 판단할 것.

[멤버 목록 (notify_users 후보)]
${members.join(', ')}

[작업]
1. 이미지 내용을 보고 가장 적합한 7-axis 폴더 결정 (01~07 + 99).
   기존 폴더에 안 맞으면 새 폴더 제안.
2. 알림 받을 멤버 (있으면).
3. 한 줄 요약 (40자 내외, 이미지에 무엇이 있는지).
4. doc_type (계약서/견적서/회의록/PoC 인포 시트/리서치 자료/디자인/지원사업/마케팅/명함/제품 사진/스크린샷/기타).
5. confidence (0~1). 추측 약하면 낮춰. 0.7 미만이면 alternatives 2개.

[출력]
JSON 한 덩어리만. 마크다운·설명·코드블록 없이 순수 JSON.

{"target_folder_path":"/...","create_folder_if_missing":false,"notify_users":["..."],"summary":"...","doc_type":"...","confidence":0.0,"alternatives":[{"folder":"...","confidence":0.0}]}`

  try {
    const res = await fetch(vertexUrl(access.project, VISION_MODEL, 'generateContent'), {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${access.token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [
          {
            role: 'user',
            parts: [
              { text: prompt },
              { inlineData: { mimeType: mime, data: buffer.toString('base64') } },
            ],
          },
        ],
        generationConfig: {
          maxOutputTokens: 1024,
          temperature: 0.3,
          thinkingConfig: { thinkingBudget: 0 },
          responseMimeType: 'application/json',
        },
      }),
    })
    if (!res.ok) return null
    const json = (await res.json()) as {
      candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>
    }
    const text = json.candidates?.[0]?.content?.parts?.[0]?.text ?? ''
    if (!text) return null
    const cleaned = text
      .replace(/^```json\s*/i, '')
      .replace(/^```\s*/i, '')
      .replace(/```$/i, '')
      .trim()
    const parsed = JSON.parse(cleaned)
    return {
      target_folder_path: String(parsed.target_folder_path ?? ''),
      create_folder_if_missing: Boolean(parsed.create_folder_if_missing ?? false),
      notify_users: Array.isArray(parsed.notify_users)
        ? parsed.notify_users.map((u: unknown) => String(u))
        : [],
      summary: String(parsed.summary ?? ''),
      doc_type: String(parsed.doc_type ?? ''),
      confidence: Number(parsed.confidence ?? 0),
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((a: { folder?: unknown; confidence?: unknown }) => ({
            folder: String(a.folder ?? ''),
            confidence: Number(a.confidence ?? 0),
          }))
        : undefined,
      method: 'gemini',
      raw: text.slice(0, 1000),
    }
  } catch {
    return null
  }
}

async function main(): Promise<void> {
  const { dir, commit, limit, docsOnly } = parseArgs(process.argv)
  if (!dir) {
    console.error('사용: npm run ingest:folder -- <폴더 경로> [--commit] [--limit=N]')
    process.exit(1)
  }
  if (!SUPABASE_URL || !SERVICE_KEY) {
    throw new Error('NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY 가 .env.local 에 필요.')
  }

  const absDir = path.resolve(dir)
  const stat = await fs.stat(absDir).catch(() => null)
  if (!stat?.isDirectory()) throw new Error(`폴더가 아닙니다: ${absDir}`)

  console.log(`[ingest] 폴더: ${absDir}`)
  console.log(
    `[ingest] 모드: ${commit ? '🚀 COMMIT (Drive 업로드 + DB 행 생성)' : '🔍 DRY-RUN (분류만)'}`
  )
  if (limit > 0) console.log(`[ingest] 제한: 처음 ${limit} 개`)

  const supabase = createSupabaseClient(SUPABASE_URL, SERVICE_KEY)
  const drive = getDriveClient()
  const availableFolders = await getFolderTree(drive).catch(() => [] as string[])

  // 중복 skip 용 — 이미 Drive 에 들어가있는(살아있는) 문서의 filename+size
  const { data: existing } = await supabase
    .from('inbox_documents')
    .select('filename, size_bytes')
    .not('drive_file_id', 'is', null)
  const existingKeys = new Set((existing ?? []).map((r) => `${r.filename}::${r.size_bytes}`))

  // 멤버 (notify_users 매핑용)
  const { data: members } = await supabase.from('members').select('id, name')
  const memberNames = (members ?? []).map((m) => String(m.name)).filter(Boolean)
  const nameToId = new Map((members ?? []).map((m) => [String(m.name), String(m.id)]))

  let files = await walk(absDir)
  if (docsOnly) {
    const before = files.length
    files = files.filter((f) => DOC_EXTS.has(path.extname(f).slice(1).toLowerCase()))
    console.log(
      `[ingest] --docs-only: ${before} → ${files.length} 개 (PDF/DOCX/TXT/MD/HWP/XLSX/PPT 만)`
    )
  }
  if (limit > 0) files = files.slice(0, limit)
  console.log(`[ingest] 처리할 파일: ${files.length} 개\n`)

  let ok = 0
  let skipped = 0
  let failed = 0

  for (const filepath of files) {
    const filename = path.basename(filepath)
    const stats = await fs.stat(filepath)
    const key = `${filename}::${stats.size}`
    if (existingKeys.has(key)) {
      console.log(`  ⏭️  ${filename} (중복)`)
      skipped++
      continue
    }

    try {
      const buffer = await fs.readFile(filepath)
      const mime = detectMime(filename)

      // 이미지: Vision 으로 내용 기반 분류 우선 (카톡 사진·스크린샷은 파일명에 정보 0)
      let cls: ClassificationResult | null = null
      if (VISION_MIMES.has(mime)) {
        cls = await classifyImageWithVision(filename, buffer, mime, availableFolders, memberNames)
      }

      // 그 외 또는 Vision 실패 → 기존 텍스트 추출 + 분류기 체인
      if (!cls) {
        const extracted = await extractContent(buffer, filename, mime)
        cls = await classifyDocument({
          filename,
          userDescription: '',
          extracted,
          availableFolders,
          members: memberNames,
          recentTasks: [],
        })
      }

      console.log(`  ${commit ? '📤' : '🔍'} ${filename}`)
      console.log(`     → ${cls.target_folder_path}`)
      console.log(`     · ${cls.doc_type} · conf=${cls.confidence.toFixed(2)} · via ${cls.method}`)
      if (cls.summary) console.log(`     · ${cls.summary}`)

      if (!commit) {
        ok++
        continue
      }

      const folderId = await ensureFolderPath(drive, cls.target_folder_path)
      const { id: driveFileId, webViewLink } = await uploadFile(
        drive,
        folderId,
        filename,
        buffer,
        mime
      )
      const notifyIds = cls.notify_users
        .map((n) => nameToId.get(n))
        .filter((v): v is string => Boolean(v))

      const { error } = await supabase.from('inbox_documents').insert({
        filename,
        size_bytes: buffer.length,
        mime_type: mime,
        drive_file_id: driveFileId,
        drive_folder_id: folderId,
        folder_path: cls.target_folder_path,
        doc_type: cls.doc_type,
        ai_reasoning: webViewLink ?? cls.summary,
        classification_confidence: cls.confidence,
        classified_by_ai: cls.method === 'gemini' || cls.method === 'claude',
        notify_users: notifyIds,
        status: 'confirmed',
        source: 'bulk-ingest',
      })
      if (error) throw error

      console.log(`     ✅ Drive: ${webViewLink ?? '(링크 없음)'}`)
      ok++
      existingKeys.add(key)
    } catch (e) {
      console.error(`  ❌ ${filename}: ${e instanceof Error ? e.message : String(e)}`)
      failed++
    }
  }

  console.log(`\n[ingest] 완료 — OK ${ok}, skip ${skipped}, fail ${failed}`)
  if (!commit && ok > 0) {
    console.log(`\n💡 결과 괜찮으면 --commit 붙여 다시 실행하세요.`)
  }
  if (commit && ok > 0) {
    console.log(`\n💡 새 문서 임베딩 갱신: npm run embed:backfill`)
  }
}

main().catch((e) => {
  console.error('FATAL:', e)
  process.exit(1)
})
