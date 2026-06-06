/**
 * 토타로 워크툴 MCP 핸들러 — stdio (Claude Desktop) 와 HTTP (claude.ai Custom Connector)
 * 양쪽 transport 가 공유하는 단일 진실의 원천.
 *
 * 핸들러는 입력을 받아 사람이 읽을 수 있는 텍스트를 돌려준다.
 * 실패 시 Error throw → 호출 측이 isError: true 로 감싸 반환.
 */
import { embedText } from '../assistant/embedding'
import { ensureFolderPath, getDriveClient, uploadFile } from '../drive/client'
import { extractContent } from '../mailroom/extract'

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

export async function handleRead(input: ReadInput): Promise<string> {
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
  return `✅ 저장됨\n  파일: ${filename}\n  경로: ${input.target_path}\n  id: ${docId}\n  Drive: ${webViewLink ?? '(링크 없음)'}`
}

// ─────────────────────────────────────────────────────────────
// 통합 dispatch — 도구 이름으로 핸들러 호출
// ─────────────────────────────────────────────────────────────

export async function dispatchTool(name: string, args: Record<string, unknown>): Promise<string> {
  switch (name) {
    case 'mailroom_search':
      return handleSearch(args as SearchInput)
    case 'mailroom_search_semantic':
      return handleSearchSemantic(args as SearchSemanticInput)
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
    default:
      throw new Error(`알 수 없는 도구: ${name}`)
  }
}
