#!/usr/bin/env tsx
/**
 * 내부 AI 우편실 MCP 서버 — Claude Code/Desktop 에 우편실 검색·읽기·업로드 도구 노출.
 *
 * Claude Code 등록 (한 번만):
 *   claude mcp add mailroom /Users/yuntaejun/dev/totaro-worktool/scripts/mailroom-mcp.ts
 *
 * 또는 ~/.claude.json 의 mcpServers 에 직접:
 *   "mailroom": {
 *     "command": "npx",
 *     "args": ["tsx", "/Users/yuntaejun/dev/totaro-worktool/scripts/mailroom-mcp.ts"]
 *   }
 *
 * 노출하는 도구:
 *   - mailroom_search: 파일명·설명·요약·doc_type·폴더로 검색
 *   - mailroom_read: 본문 텍스트 추출 (PDF·docx·txt)
 *   - mailroom_list: 폴더 안 파일 목록
 *   - mailroom_upload: 텍스트를 새 파일로 우편실에 저장
 */
import path from 'node:path'
import { fileURLToPath } from 'node:url'

import { Server } from '@modelcontextprotocol/sdk/server/index.js'
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js'
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js'
import { loadEnvConfig } from '@next/env'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

import { ensureFolderPath, getDriveClient, uploadFile } from '../lib/drive/client'
import { extractContent } from '../lib/mailroom/extract'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function svcHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }
}

async function sbGet(pathQuery: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, { headers: svcHeaders() })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

async function sbPost(pathQuery: string, body: unknown): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, {
    method: 'POST',
    headers: {
      ...svcHeaders(),
      'Content-Type': 'application/json',
      Prefer: 'return=representation',
    },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// ─────────────────────────────────────────────────────────────
// 도구 핸들러
// ─────────────────────────────────────────────────────────────

type SearchInput = { query?: string; axis?: string; doc_type?: string; limit?: number }
async function handleSearch(input: SearchInput): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
  // 살아있는(휴지통/반려/실패 아님) + 실제 Drive 에 있는 문서만. Gmail 문서는
  // status='classified' 라 confirmed 로 거르면 148건이 통째로 안 보인다(웹 AI 직원과 동일 필터).
  const conditions: string[] = [
    'drive_file_id=not.is.null',
    'status=not.in.(trashed,rejected,failed)',
  ]
  if (input.axis) conditions.push(`folder_path=ilike.*${encodeURIComponent(input.axis)}*`)
  if (input.doc_type) conditions.push(`doc_type=ilike.*${encodeURIComponent(input.doc_type)}*`)
  // query 는 OR 매칭 — filename·description·ai_reasoning·doc_type 어디든 부분일치
  let queryClause = ''
  if (input.query) {
    const q = encodeURIComponent(input.query)
    queryClause = `&or=(filename.ilike.*${q}*,description.ilike.*${q}*,ai_reasoning.ilike.*${q}*,doc_type.ilike.*${q}*,folder_path.ilike.*${q}*)`
  }
  const url =
    `inbox_documents?select=id,filename,description,doc_type,folder_path,classification_confidence,ai_reasoning,drive_file_id,size_bytes,created_at,uploaded_by` +
    `&${conditions.join('&')}` +
    queryClause +
    `&order=created_at.desc&limit=${limit}`
  const rows = (await sbGet(url)) as Array<Record<string, unknown>>
  if (rows.length === 0) return '검색 결과 없음.'

  return rows
    .map((r, i) => {
      const id = String(r.id ?? '')
      const fn = String(r.filename ?? '')
      const fp = String(r.folder_path ?? '')
      const dt = String(r.doc_type ?? '')
      const desc = String(r.description ?? '')
      const sum = String(r.ai_reasoning ?? '')
      const date = String(r.created_at ?? '').slice(0, 16)
      const conf = Number(r.classification_confidence ?? 0)
      return [
        `[${i + 1}] ${fn}`,
        `    id: ${id}`,
        `    경로: ${fp}`,
        `    종류: ${dt}  ·  자신도: ${Math.round(conf * 100)}%  ·  ${date}`,
        desc && `    설명: ${desc}`,
        sum && `    요약: ${sum.split('\n')[0].slice(0, 200)}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

type ReadInput = { file_id: string }
async function handleRead(input: ReadInput): Promise<string> {
  if (!input.file_id) throw new Error('file_id 필요')
  const rows = (await sbGet(
    `inbox_documents?id=eq.${encodeURIComponent(input.file_id)}&select=id,filename,mime_type,drive_file_id,folder_path,description,ai_reasoning`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) throw new Error('해당 file_id 없음 (Supabase 인덱스 미존재)')
  const doc = rows[0]
  const driveFileId = String(doc.drive_file_id ?? '')
  if (!driveFileId) throw new Error('Drive 파일 ID 없음 (저장 미완료?)')

  // Drive 에서 본문 다운로드
  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  const buf = Buffer.from(res.data as ArrayBuffer)
  const filename = String(doc.filename ?? '')
  const mime = String(doc.mime_type ?? '')
  const extracted = await extractContent(buf, filename, mime)

  const header = [
    `파일: ${filename}`,
    `경로: ${doc.folder_path}`,
    `설명: ${doc.description ?? '(없음)'}`,
    `AI 요약: ${doc.ai_reasoning ?? '(없음)'}`,
    `추출 방식: tier ${extracted.tier} (${extracted.method})`,
    '─'.repeat(40),
    '',
  ].join('\n')

  if (extracted.tier === 1 && extracted.text) {
    return (
      header +
      extracted.text.slice(0, 8000) +
      (extracted.text.length > 8000 ? '\n... [생략, 8000자 초과]' : '')
    )
  }
  if (extracted.tier === 2) {
    return header + '(이미지·스캔 PDF — 본문 텍스트 추출 안 됨. Vision 분석은 v1)'
  }
  return header + '(본문 추출 불가 — 파일 종류상 메타만 사용 가능)'
}

type ListInput = { folder_path: string; limit?: number }
async function handleList(input: ListInput): Promise<string> {
  if (!input.folder_path) throw new Error('folder_path 필요')
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100)
  const fp = encodeURIComponent(input.folder_path)
  const rows = (await sbGet(
    `inbox_documents?folder_path=ilike.*${fp}*&drive_file_id=not.is.null&status=not.in.(trashed,rejected,failed)&select=id,filename,doc_type,size_bytes,created_at&order=created_at.desc&limit=${limit}`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) return `폴더 '${input.folder_path}' 안에 파일 없음.`
  return rows
    .map((r, i) => {
      const date = String(r.created_at ?? '').slice(0, 16)
      const size = Number(r.size_bytes ?? 0)
      const sizeStr =
        size < 1024
          ? `${size} B`
          : size < 1024 * 1024
            ? `${(size / 1024).toFixed(1)} KB`
            : `${(size / 1024 / 1024).toFixed(1)} MB`
      return `[${i + 1}] ${r.filename}  ·  ${r.doc_type}  ·  ${sizeStr}  ·  ${date}\n    id: ${r.id}`
    })
    .join('\n')
}

type UploadInput = { text: string; target_path: string; filename?: string; description?: string }
async function handleUpload(input: UploadInput): Promise<string> {
  if (!input.text) throw new Error('text 필요')
  if (!input.target_path) throw new Error('target_path 필요')
  const filename =
    input.filename ?? `claude-${new Date().toISOString().slice(0, 19).replace(/:/g, '-')}.md`
  const description = input.description ?? 'Claude 가 생성·저장한 문서'
  const drive = getDriveClient()
  const folderId = await ensureFolderPath(drive, input.target_path)
  const { id: driveFileId, webViewLink } = await uploadFile(
    drive,
    folderId,
    filename,
    Buffer.from(input.text, 'utf-8'),
    'text/markdown'
  )
  const inserted = (await sbPost('inbox_documents', {
    filename,
    description,
    drive_file_id: driveFileId,
    drive_folder_id: folderId,
    folder_path: input.target_path,
    size_bytes: Buffer.byteLength(input.text, 'utf-8'),
    mime_type: 'text/markdown',
    classified_by_ai: true,
    classification_confidence: 1.0,
    ai_reasoning: description,
    doc_type: 'Claude 생성 문서',
    status: 'confirmed',
  })) as Array<Record<string, unknown>>
  const docId = inserted[0]?.id ?? ''
  return `✅ 저장됨\n  파일: ${filename}\n  경로: ${input.target_path}\n  id: ${docId}\n  Drive: ${webViewLink ?? '(링크 없음)'}`
}

// ─────────────────────────────────────────────────────────────
// MCP 서버
// ─────────────────────────────────────────────────────────────

const server = new Server(
  { name: 'totaro-mailroom', version: '0.1.0' },
  { capabilities: { tools: {} } }
)

server.setRequestHandler(ListToolsRequestSchema, async () => ({
  tools: [
    {
      name: 'mailroom_search',
      description:
        '토타로 내부 AI 우편실에서 문서 검색. 파일명·설명·AI 요약·문서종류·폴더경로 어디든 부분 일치. axis 로 7-axis 영역 필터링 가능 (예: "03 공급사" → 공급사 폴더만).',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: '검색어 (한국어/영어 모두 가능)' },
          axis: { type: 'string', description: '폴더 영역 필터 (예: "01 제품", "03 공급사")' },
          doc_type: {
            type: 'string',
            description: '문서 종류 필터 (예: "계약서", "PoC 인포 시트")',
          },
          limit: { type: 'number', description: '결과 개수 (기본 10, 최대 50)' },
        },
      },
    },
    {
      name: 'mailroom_read',
      description: '문서 본문 텍스트 추출 (PDF·docx·txt·md 등). file_id 는 search 결과에 나옴.',
      inputSchema: {
        type: 'object',
        required: ['file_id'],
        properties: { file_id: { type: 'string', description: 'Supabase 문서 id (UUID)' } },
      },
    },
    {
      name: 'mailroom_list',
      description: '폴더 안 파일 목록. 폴더 경로 부분일치.',
      inputSchema: {
        type: 'object',
        required: ['folder_path'],
        properties: {
          folder_path: {
            type: 'string',
            description: '경로 또는 부분 (예: "모네 하우스", "/03 공급사")',
          },
          limit: { type: 'number', description: '결과 개수 (기본 30, 최대 100)' },
        },
      },
    },
    {
      name: 'mailroom_upload',
      description:
        'Claude 가 생성한 텍스트/마크다운을 우편실에 새 파일로 저장. Drive 업로드 + Supabase 인덱싱 + 폴더 자동 생성.',
      inputSchema: {
        type: 'object',
        required: ['text', 'target_path'],
        properties: {
          text: { type: 'string', description: '저장할 본문 (마크다운 권장)' },
          target_path: {
            type: 'string',
            description:
              '저장 폴더 경로 (예: "/02 AI 시스템/마케팅 에이전트/", "/03 공급사 운영 (sourcing 측)/PoC 인포 시트/")',
          },
          filename: {
            type: 'string',
            description: '파일명 (기본 claude-YYYY-MM-DDTHH-MM-SS.md)',
          },
          description: { type: 'string', description: '한 줄 설명' },
        },
      },
    },
  ],
}))

server.setRequestHandler(CallToolRequestSchema, async (req) => {
  const { name, arguments: args = {} } = req.params
  try {
    let text = ''
    if (name === 'mailroom_search') text = await handleSearch(args as SearchInput)
    else if (name === 'mailroom_read') text = await handleRead(args as ReadInput)
    else if (name === 'mailroom_list') text = await handleList(args as ListInput)
    else if (name === 'mailroom_upload') text = await handleUpload(args as UploadInput)
    else throw new Error(`알 수 없는 도구: ${name}`)
    return { content: [{ type: 'text', text }] }
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    return { content: [{ type: 'text', text: `❌ 에러: ${msg}` }], isError: true }
  }
})

async function main(): Promise<void> {
  const transport = new StdioServerTransport()
  await server.connect(transport)
  // stderr 에 시작 로그 (stdout 은 MCP 프로토콜 전용이라 절대 출력 금지)
  process.stderr.write('[mailroom-mcp] 시작됨 — Supabase + Drive 도구 4개 노출\n')
}

main().catch((e) => {
  process.stderr.write(
    `[mailroom-mcp] 치명적 오류: ${e instanceof Error ? e.message : String(e)}\n`
  )
  process.exit(1)
})
