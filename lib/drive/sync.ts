/**
 * Drive → inbox_documents 동기화 코어. cron 라우트 · 스크립트 · 온디맨드 버튼이 공유.
 *
 * ROOT 폴더를 재귀로 훑어 drive_file_id 기준 *없는 것만* INSERT (멱등 — unique 제약 + ON CONFLICT DO NOTHING).
 * 분류(doc_type/description)·본문 발췌(body_excerpt)는 별도 백필 잡이 채운다.
 */
import { getDriveClient, getRootFolderId, withDriveRetry } from '@/lib/drive/client'
import { getServiceSupabase } from '@/lib/oauth/utils'

import type { drive_v3 } from 'googleapis'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

type DriveItem = {
  drive_file_id: string
  drive_folder_id: string
  folder_path: string
  filename: string
  mime_type: string
  size_bytes: number | null
}

/** 폴더 직속 자식(파일+폴더) 전체 페이지. Shared Drive 호환. */
async function listChildren(
  drive: drive_v3.Drive,
  parentId: string
): Promise<drive_v3.Schema$File[]> {
  const all: drive_v3.Schema$File[] = []
  let pageToken: string | undefined = undefined
  do {
    const res: { data: drive_v3.Schema$FileList } = await withDriveRetry('sync.listChildren', () =>
      drive.files.list({
        q: `'${parentId}' in parents and trashed = false`,
        fields: 'nextPageToken, files(id, name, mimeType, size, parents)',
        pageSize: 1000,
        supportsAllDrives: true,
        includeItemsFromAllDrives: true,
        pageToken,
      })
    )
    all.push(...(res.data.files ?? []))
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)
  return all
}

/** ROOT 하위를 BFS 로 훑어 모든 파일을 평면 리스트로. 폴더는 path 구성에만 사용. */
async function walkDrive(
  drive: drive_v3.Drive,
  rootId: string,
  rootPrefix = ''
): Promise<DriveItem[]> {
  const out: DriveItem[] = []
  const queue: { id: string; prefix: string }[] = [{ id: rootId, prefix: rootPrefix }]
  while (queue.length > 0) {
    const { id, prefix } = queue.shift()!
    const children = await listChildren(drive, id)
    for (const c of children) {
      if (!c.id) continue
      if (c.mimeType === FOLDER_MIME) {
        queue.push({ id: c.id, prefix: `${prefix}/${c.name ?? '?'}` })
      } else {
        out.push({
          drive_file_id: c.id,
          drive_folder_id: id,
          folder_path: `${prefix}/`,
          filename: c.name ?? '(no name)',
          mime_type: c.mimeType ?? 'application/octet-stream',
          size_bytes: c.size ? Number(c.size) : null,
        })
      }
    }
  }
  return out
}

export type SyncResult =
  | { ok: true; scanned: number; alreadyHad: number; inserted: number; durationMs: number }
  | { ok: false; error: string }

/** Drive ROOT 를 훑어 inbox_documents 에 새 파일을 INSERT. 멱등. */
export async function runDriveSync(): Promise<SyncResult> {
  const started = Date.now()

  let drive: drive_v3.Drive
  let rootId: string
  try {
    drive = getDriveClient()
    rootId = getRootFolderId()
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'drive init failed' }
  }

  let files: DriveItem[]
  try {
    files = await walkDrive(drive, rootId)
  } catch (e) {
    return { ok: false, error: `drive walk: ${e instanceof Error ? e.message : String(e)}` }
  }

  const admin = getServiceSupabase()

  // 기존 등록분 전체를 페이지네이션으로 수집. 긴 .in() URL(수백 개 ID)은
  // 일부 환경에서 'fetch failed' 를 내므로 짧은 range 요청으로 쪼갠다.
  const existing = new Set<string>()
  const PAGE = 1000
  for (let from = 0; ; from += PAGE) {
    const { data, error } = await admin
      .from('inbox_documents')
      .select('drive_file_id')
      .not('drive_file_id', 'is', null)
      .range(from, from + PAGE - 1)
    if (error) return { ok: false, error: `select existing: ${error.message}` }
    const rows = (data ?? []) as { drive_file_id: string | null }[]
    for (const r of rows) if (r.drive_file_id) existing.add(r.drive_file_id)
    if (rows.length < PAGE) break
  }

  // 없는 것만 INSERT
  const newRows = files
    .filter((f) => !existing.has(f.drive_file_id))
    .map((f) => ({
      filename: f.filename,
      drive_file_id: f.drive_file_id,
      drive_folder_id: f.drive_folder_id,
      folder_path: f.folder_path,
      size_bytes: f.size_bytes,
      mime_type: f.mime_type,
      classified_by_ai: false,
      status: 'confirmed' as const,
    }))

  let inserted = 0
  for (let i = 0; i < newRows.length; i += 100) {
    const slice = newRows.slice(i, i + 100)
    const { error, count } = await admin
      .from('inbox_documents')
      .upsert(slice, { onConflict: 'drive_file_id', ignoreDuplicates: true, count: 'exact' })
    if (error) return { ok: false, error: `insert: ${error.message}` }
    inserted += count ?? slice.length
  }

  return {
    ok: true,
    scanned: files.length,
    alreadyHad: existing.size,
    inserted,
    durationMs: Date.now() - started,
  }
}
