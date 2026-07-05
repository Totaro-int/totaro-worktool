/**
 * 토타로 워크툴 MCP 핸들러 — stdio (Claude Desktop) 와 HTTP (claude.ai Custom Connector)
 * 양쪽 transport 가 공유하는 단일 진실의 원천.
 *
 * 핸들러는 입력을 받아 사람이 읽을 수 있는 텍스트를 돌려준다.
 * 실패 시 Error throw → 호출 측이 isError: true 로 감싸 반환.
 */
import { embedText } from '../assistant/embedding'
import { ensureFolderPath, getDriveClient, uploadFile } from '../drive/client'
import { ghListDir, ghReadFile, ghRecentCommits, ghSearchCode } from '../github'
import {
  handleAgentActionsRecent,
  handleEntityLink,
  handleEntitySearch,
  handleLabelAttach,
  handleLabelList,
  handleMemorySearch,
  handleMemoryWrite,
  handleTasksCreate,
  type EntityLinkInput,
  type LabelAttachInput,
  type MemorySearchInput,
  type MemoryWriteInput,
  type TasksCreateInput,
} from './agent-handlers'
import { handleBrainGet, handleBrainSearch } from './brain-handlers'
import { extractContent } from '../mailroom/extract'
import { notifyNewDocuments } from '../notifications/notify-new-doc'

import type { BrainGetInput, BrainSearchInput } from './brain-handlers'

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''

function svcHeaders(): Record<string, string> {
  return {
    apikey: SERVICE_KEY,
    Authorization: `Bearer ${SERVICE_KEY}`,
  }
}

export async function sbGet(pathQuery: string): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, { headers: svcHeaders() })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

export async function sbPost(pathQuery: string, body: unknown): Promise<unknown> {
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

export async function sbPatch(pathQuery: string, body: unknown): Promise<void> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/${pathQuery}`, {
    method: 'PATCH',
    headers: { ...svcHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`Supabase ${res.status}: ${(await res.text()).slice(0, 200)}`)
}

/** PostgREST RPC 호출(service_role). 함수 없음/실패는 throw → 호출부가 폴백. */
export async function sbRpc(fn: string, args: Record<string, unknown>): Promise<unknown> {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: 'POST',
    headers: { ...svcHeaders(), 'Content-Type': 'application/json' },
    body: JSON.stringify(args),
  })
  if (!res.ok)
    throw new Error(`Supabase rpc ${fn} ${res.status}: ${(await res.text()).slice(0, 200)}`)
  return res.json()
}

// ─────────────────────────────────────────────────────────────
// 핸들러: 검색·읽기·목록 (mailroom_search / read / list)
// ─────────────────────────────────────────────────────────────

export type SearchInput = {
  query?: string
  axis?: string
  doc_type?: string
  limit?: number
}

export async function handleSearch(input: SearchInput): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 50)
  const conditions: string[] = [
    'drive_file_id=not.is.null',
    'status=not.in.(trashed,rejected,failed)',
  ]
  if (input.axis) conditions.push(`folder_path=ilike.*${encodeURIComponent(input.axis)}*`)
  if (input.doc_type) conditions.push(`doc_type=ilike.*${encodeURIComponent(input.doc_type)}*`)
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

export type ReadInput = { file_id: string }

/** 디스패치 결과 — 텍스트 한 줄이거나, 이미지 컨텐츠(텍스트 헤더 + base64 이미지). */
export type ToolResult =
  | string
  | {
      kind: 'mixed'
      text: string
      images?: Array<{ mimeType: string; base64: string }>
    }

const IMAGE_MIMES = new Set([
  'image/png',
  'image/jpeg',
  'image/jpg',
  'image/webp',
  'image/gif',
  'image/heic',
  'image/heif',
])
const MAX_IMAGE_BYTES = 4 * 1024 * 1024 // 4MB 원본 (base64 후 ~5.3MB) — claude 한도 보호

export async function handleRead(input: ReadInput): Promise<ToolResult> {
  if (!input.file_id) throw new Error('file_id 필요')
  const rows = (await sbGet(
    `inbox_documents?id=eq.${encodeURIComponent(input.file_id)}&select=id,filename,mime_type,drive_file_id,folder_path,description,ai_reasoning`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) throw new Error('해당 file_id 없음 (Supabase 인덱스 미존재)')
  const doc = rows[0]
  const driveFileId = String(doc.drive_file_id ?? '')
  if (!driveFileId) throw new Error('Drive 파일 ID 없음 (저장 미완료?)')

  const drive = getDriveClient()
  const res = await drive.files.get(
    { fileId: driveFileId, alt: 'media', supportsAllDrives: true },
    { responseType: 'arraybuffer' }
  )
  const buf = Buffer.from(res.data as ArrayBuffer)
  const filename = String(doc.filename ?? '')
  let mime = String(doc.mime_type ?? '').toLowerCase()
  // mime 비어있으면 확장자에서 추정 (이미지일 가능성 대비)
  if (!mime) {
    const ext = filename.toLowerCase().split('.').pop() ?? ''
    if (['jpg', 'jpeg'].includes(ext)) mime = 'image/jpeg'
    else if (ext === 'png') mime = 'image/png'
    else if (ext === 'webp') mime = 'image/webp'
    else if (ext === 'gif') mime = 'image/gif'
    else if (['heic', 'heif'].includes(ext)) mime = 'image/heic'
  }

  const header = [
    `파일: ${filename}`,
    `경로: ${doc.folder_path}`,
    `설명: ${doc.description ?? '(없음)'}`,
    `AI 요약: ${doc.ai_reasoning ?? '(없음)'}`,
    `mime: ${mime || '(불명)'}`,
    `크기: ${buf.length.toLocaleString()} 바이트`,
    '─'.repeat(40),
  ].join('\n')

  // 이미지 — base64 로 인코딩해 직접 보여줌 (Claude 가 비전으로 봄)
  if (IMAGE_MIMES.has(mime)) {
    if (buf.length > MAX_IMAGE_BYTES) {
      return (
        header +
        `\n(⚠️ 이미지가 ${(buf.length / 1024 / 1024).toFixed(1)}MB 로 한도 4MB 초과. ` +
        `Drive 에서 직접 열어주세요.)`
      )
    }
    return {
      kind: 'mixed',
      text: header + '\n(이미지 본문 첨부됨 — 아래 이미지 참조)',
      images: [{ mimeType: mime, base64: buf.toString('base64') }],
    }
  }

  // 텍스트형 — 기존 추출 경로
  const extracted = await extractContent(buf, filename, mime)
  const textHeader = header + `\n추출 방식: tier ${extracted.tier} (${extracted.method})\n`

  if (extracted.tier === 1 && extracted.text) {
    return (
      textHeader +
      extracted.text.slice(0, 8000) +
      (extracted.text.length > 8000 ? '\n... [생략, 8000자 초과]' : '')
    )
  }
  if (extracted.tier === 2) {
    return textHeader + '(이미지·스캔 PDF — 본문 텍스트 추출 안 됨. Drive 에서 직접 열기 권장.)'
  }
  return textHeader + '(본문 추출 불가 — 파일 종류상 메타만 사용 가능)'
}

export type ListInput = { folder_path: string; limit?: number }

export async function handleList(input: ListInput): Promise<string> {
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

// ─────────────────────────────────────────────────────────────
// 핸들러: 의미 검색 (mailroom_search_semantic)
// ─────────────────────────────────────────────────────────────

export type SearchSemanticInput = { question: string; limit?: number }

export async function handleSearchSemantic(input: SearchSemanticInput): Promise<string> {
  if (!input.question) throw new Error('question 필요')
  const limit = Math.min(Math.max(input.limit ?? 8, 1), 20)
  const embedding = await embedText(input.question, 'RETRIEVAL_QUERY')
  if (!embedding) {
    return '⚠️ 임베딩 실패 (Vertex 미설정 또는 일시 오류). mailroom_search 로 키워드 검색 시도하세요.'
  }
  const rows = (await sbPost('rpc/match_inbox_documents', {
    query_embedding: embedding,
    match_limit: limit,
  })) as Array<Record<string, unknown>>
  if (!rows || rows.length === 0) return '의미 검색 결과 없음.'
  return rows
    .map((r, i) => {
      const fn = String(r.filename ?? '')
      const fp = String(r.folder_path ?? '')
      const dt = String(r.doc_type ?? '')
      const id = String(r.id ?? '')
      const desc = String(r.description ?? '')
      const sum = String(r.ai_reasoning ?? '')
      return [
        `[${i + 1}] ${fn}`,
        `    id: ${id}`,
        `    경로: ${fp}`,
        `    종류: ${dt}`,
        desc && `    설명: ${desc}`,
        sum && `    요약: ${sum.split('\n')[0].slice(0, 200)}`,
      ]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

// ─────────────────────────────────────────────────────────────
// 핸들러: 태스크·멤버 (tasks_list, members_list)
// ─────────────────────────────────────────────────────────────

export type TasksListInput = {
  status?: 'todo' | 'doing' | 'done'
  assignee?: string
  limit?: number
}

export async function handleTasksList(input: TasksListInput): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 30, 1), 100)
  const conditions: string[] = []
  if (input.status) conditions.push(`status=eq.${input.status}`)
  if (input.assignee) {
    const found = (await sbGet(
      `members?select=id,name&name=ilike.*${encodeURIComponent(input.assignee)}*&limit=1`
    )) as Array<{ id: string; name: string }>
    if (found.length > 0) conditions.push(`assignee_id=eq.${found[0].id}`)
    else return `담당자 "${input.assignee}" 일치 없음.`
  }
  const filter = conditions.length > 0 ? conditions.join('&') + '&' : ''
  const rows = (await sbGet(
    `tasks?select=id,title,description,status,due_date,assignee_id,work_area_id,created_at,updated_at&${filter}order=updated_at.desc&limit=${limit}`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) return '태스크 없음.'

  const memberIds = Array.from(
    new Set(rows.map((r) => String(r.assignee_id ?? '')).filter(Boolean))
  )
  const memberMap = new Map<string, string>()
  if (memberIds.length > 0) {
    const list = (await sbGet(`members?id=in.(${memberIds.join(',')})&select=id,name`)) as Array<{
      id: string
      name: string
    }>
    list.forEach((m) => memberMap.set(m.id, m.name))
  }

  return rows
    .map((r, i) => {
      const status = String(r.status ?? '')
      const emoji = status === 'todo' ? '⬜' : status === 'doing' ? '🟡' : '✅'
      const due = r.due_date ? ` · 마감 ${r.due_date}` : ''
      const assignee = memberMap.get(String(r.assignee_id ?? '')) ?? '미배정'
      const desc = r.description ? `\n    ${String(r.description).slice(0, 200)}` : ''
      return `[${i + 1}] ${emoji} ${r.title}\n    id: ${r.id}\n    담당: ${assignee}${due}${desc}`
    })
    .join('\n\n')
}

export async function handleMembersList(): Promise<string> {
  const rows = (await sbGet('members?select=id,name,email&order=name')) as Array<
    Record<string, unknown>
  >
  if (rows.length === 0) return '멤버 없음.'
  return rows.map((r, i) => `[${i + 1}] ${r.name}  ·  ${r.email}\n    id: ${r.id}`).join('\n')
}

// ─────────────────────────────────────────────────────────────
// 핸들러: 새 문서 저장 (mailroom_upload)
// ─────────────────────────────────────────────────────────────

export type UploadInput = {
  text: string
  target_path: string
  filename?: string
  description?: string
}

export async function handleUpload(input: UploadInput): Promise<string> {
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
  // 새 문서 → 인앱+폰 알림(보고서 폴더면 보고서 알림으로 분기). 실패해도 저장은 성공.
  await notifyNewDocuments([
    { filename, folderPath: input.target_path, id: typeof docId === 'string' ? docId : undefined },
  ])
  // 시맨틱 검색용 임베딩 즉시 생성 — 실패해도 저장은 성공(시간당 백필 크론이 소급).
  if (typeof docId === 'string' && docId) {
    try {
      const vec = await embedText(
        [filename, input.target_path, description, input.text.slice(0, 1500)]
          .filter(Boolean)
          .join('\n'),
        'RETRIEVAL_DOCUMENT'
      )
      if (vec) {
        await sbPatch(`inbox_documents?id=eq.${encodeURIComponent(docId)}`, {
          embedding: JSON.stringify(vec),
        })
      }
    } catch {
      // 백필 크론이 처리
    }
  }
  return `✅ 저장됨\n  파일: ${filename}\n  경로: ${input.target_path}\n  id: ${docId}\n  Drive: ${webViewLink ?? '(링크 없음)'}`
}

// ─────────────────────────────────────────────────────────────
// 핸들러: 폴더 브라우즈 (Drive 탐색기 스타일)
// ─────────────────────────────────────────────────────────────

export type FolderBrowseInput = { path?: string }

/**
 * 특정 경로의 직속 하위 폴더 + 직속 파일을 함께 반환.
 * Drive 탐색기처럼 한 화면에 "여기 안에 뭐가 있냐" 한 번에 보여준다.
 * path 비우면 루트('/') 부터 시작 → 7~8축이 보임.
 */
export async function handleFolderBrowse(input: FolderBrowseInput): Promise<string> {
  const current = normalizePath(input.path ?? '/')
  const rows = (await sbGet(
    `inbox_documents?select=filename,folder_path,doc_type,size_bytes,created_at,drive_file_id&drive_file_id=not.is.null&status=not.in.(trashed,rejected,failed)&limit=2000`
  )) as Array<{
    filename: string
    folder_path: string | null
    doc_type: string | null
    size_bytes: number | null
    created_at: string
    drive_file_id: string | null
  }>

  const subCounts = new Map<string, number>()
  const filesHere: Array<{
    filename: string
    docType: string | null
    size: number
    driveFileId: string | null
  }> = []

  for (const r of rows) {
    if (!r.folder_path) continue
    const fp = normalizePath(r.folder_path)
    if (!fp.startsWith(current)) continue
    const rest = fp.slice(current.length).replace(/^\/+/, '')
    if (rest === '') {
      filesHere.push({
        filename: r.filename,
        docType: r.doc_type,
        size: Number(r.size_bytes ?? 0),
        driveFileId: r.drive_file_id,
      })
    } else {
      const firstSeg = rest.split('/')[0]
      subCounts.set(firstSeg, (subCounts.get(firstSeg) ?? 0) + 1)
    }
  }

  const folders = Array.from(subCounts.entries())
    .sort((a, b) => a[0].localeCompare(b[0], 'ko'))
    .map(([name, count]) => `  📁 ${name}/  (${count} 파일)`)
  filesHere.sort((a, b) => a.filename.localeCompare(b.filename, 'ko'))
  const files = filesHere.slice(0, 50).map((f) => {
    const sizeStr =
      f.size < 1024
        ? `${f.size}B`
        : f.size < 1024 * 1024
          ? `${(f.size / 1024).toFixed(1)}KB`
          : `${(f.size / 1024 / 1024).toFixed(1)}MB`
    const drive = f.driveFileId ? ` · https://drive.google.com/file/d/${f.driveFileId}/view` : ''
    const dt = f.docType ? ` [${f.docType}]` : ''
    return `  📄 ${f.filename}  ·  ${sizeStr}${dt}${drive}`
  })

  const header = `📂 현재 경로: ${current}\n`
  const sub = folders.length > 0 ? `\n하위 폴더 (${folders.length}):\n${folders.join('\n')}` : ''
  const file =
    files.length > 0
      ? `\n\n이 폴더 직속 파일 (${filesHere.length}${filesHere.length > 50 ? ', 상위 50개만' : ''}):\n${files.join('\n')}`
      : ''
  if (folders.length === 0 && files.length === 0) return header + '\n(이 경로에 아무것도 없음)'
  return header + sub + file
}

function normalizePath(p: string): string {
  if (!p || p === '/') return '/'
  let out = p.startsWith('/') ? p : '/' + p
  if (!out.endsWith('/')) out += '/'
  return out
}

// ─────────────────────────────────────────────────────────────
// 핸들러: GitHub — 코드/문서 read 전용 (정책: .md / .json / 코드 = GitHub 단일 소스)
// ─────────────────────────────────────────────────────────────

export type GithubSearchInput = { query: string; repo?: string; limit?: number }

export async function handleGithubSearch(input: GithubSearchInput): Promise<string> {
  if (!input.query) throw new Error('query 필요')
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30)
  const items = await ghSearchCode(input.query, input.repo, limit)
  if (items.length === 0) return 'GitHub 코드 검색 결과 없음.'
  return items
    .map((it, i) => {
      const frag = it.textMatches?.[0]?.fragment.replace(/\s+/g, ' ').slice(0, 200)
      return [`[${i + 1}] ${it.path}  ·  ${it.repo}`, `    ${it.url}`, frag && `    ${frag}`]
        .filter(Boolean)
        .join('\n')
    })
    .join('\n\n')
}

export type GithubReadInput = { path: string; repo?: string; ref?: string }

export async function handleGithubRead(input: GithubReadInput): Promise<string> {
  if (!input.path) throw new Error('path 필요')
  const file = await ghReadFile(input.path, input.repo, input.ref)
  const header = [
    `파일: ${file.path}`,
    `Repo: ${file.repo} @ ${file.ref}`,
    `크기: ${file.size} 바이트`,
    '─'.repeat(40),
    '',
  ].join('\n')
  const MAX = 12000
  if (file.content.length <= MAX) return header + file.content
  return header + file.content.slice(0, MAX) + `\n... [생략, ${MAX}자 초과]`
}

export type GithubListInput = { path?: string; repo?: string; ref?: string }

export async function handleGithubList(input: GithubListInput): Promise<string> {
  const entries = await ghListDir(input.path ?? '', input.repo, input.ref)
  if (entries.length === 0) return '폴더 비어있음.'
  const header = `폴더: ${input.path || '(루트)'}  ·  ${input.repo ?? '(default repo)'}\n${'─'.repeat(40)}\n`
  return (
    header +
    entries
      .map((e) => {
        const tag = e.type === 'dir' ? '📁' : e.type === 'file' ? '📄' : '🔗'
        const size = e.type === 'file' ? `  ·  ${e.size} B` : ''
        return `${tag} ${e.name}${size}`
      })
      .join('\n')
  )
}

export type GithubCommitsInput = { repo?: string; limit?: number; ref?: string }

export async function handleGithubCommits(input: GithubCommitsInput): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30)
  const commits = await ghRecentCommits(input.repo, limit, input.ref)
  if (commits.length === 0) return '최근 커밋 없음.'
  return commits
    .map((c, i) => `[${i + 1}] ${c.sha} · ${c.author} · ${c.relativeTime}\n    ${c.message}`)
    .join('\n\n')
}

// ─────────────────────────────────────────────────────────────
// 통합 dispatch — 도구 이름으로 핸들러 호출
// ─────────────────────────────────────────────────────────────

export async function dispatchTool(
  name: string,
  args: Record<string, unknown>
): Promise<ToolResult> {
  switch (name) {
    case 'mailroom_search':
      return handleSearch(args as SearchInput)
    case 'mailroom_search_semantic':
      return handleSearchSemantic(args as SearchSemanticInput)
    case 'brain_search':
      return handleBrainSearch(args as BrainSearchInput)
    case 'brain_get':
      return handleBrainGet(args as BrainGetInput)
    case 'mailroom_read':
      return handleRead(args as ReadInput)
    case 'mailroom_list':
      return handleList(args as ListInput)
    case 'tasks_list':
      return handleTasksList(args as TasksListInput)
    case 'members_list':
      return handleMembersList()
    case 'mailroom_upload':
      return handleUpload(args as UploadInput)
    case 'folder_browse':
      return handleFolderBrowse(args as FolderBrowseInput)
    case 'github_search_code':
      return handleGithubSearch(args as GithubSearchInput)
    case 'github_read_file':
      return handleGithubRead(args as GithubReadInput)
    case 'github_list_dir':
      return handleGithubList(args as GithubListInput)
    case 'github_recent_commits':
      return handleGithubCommits(args as GithubCommitsInput)
    case 'memory_write':
      return handleMemoryWrite(args as unknown as MemoryWriteInput)
    case 'memory_search':
      return handleMemorySearch(args as unknown as MemorySearchInput)
    case 'label_list':
      return handleLabelList(args as { kind?: string })
    case 'label_attach':
      return handleLabelAttach(args as unknown as LabelAttachInput)
    case 'entity_link':
      return handleEntityLink(args as unknown as EntityLinkInput)
    case 'entity_search':
      return handleEntitySearch(args as { query: string; kind?: string; limit?: number })
    case 'tasks_create':
      return handleTasksCreate(args as unknown as TasksCreateInput)
    case 'agent_actions_recent':
      return handleAgentActionsRecent(args as { agent?: string; limit?: number })
    default:
      throw new Error(`알 수 없는 도구: ${name}`)
  }
}
