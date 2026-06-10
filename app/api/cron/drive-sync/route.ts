/**
 * Drive → inbox_documents nightly sync.
 *
 * 사용자가 Drive 웹/앱에서 직접 만든 새 폴더/파일이 inbox_documents 에 안 들어와서
 * AI 비서 검색이 못 찾는 문제 해결. Vercel cron 이 매일 새벽에 호출 → ROOT 폴더 재귀로
 * 훑고 drive_file_id 기준으로 없는 것만 INSERT.
 *
 * 인증: Vercel cron 은 `Authorization: Bearer ${CRON_SECRET}` 헤더를 자동으로 넣어 보낸다.
 * 헤더 없거나 다르면 401.
 *
 * 성능: Drive API 호출 = (폴더 수 × 1) 정도. 평탄한 구조라면 수십 초 안에 끝남.
 *       Vercel 의 cron 기본 timeout 은 60s. 부족하면 maxDuration 늘리고 Pro 플랜 필요.
 *
 * 채우는 필드 (분류 정보는 비워둠 — 검색은 filename/folder_path 키워드로 잡힘):
 *   filename, drive_file_id (unique), drive_folder_id, folder_path,
 *   size_bytes, mime_type, status='confirmed', created_at
 * 분류(doc_type/description/ai_reasoning)는 사용자 또는 별도 백필 잡으로 채우면 됨.
 *
 * 멱등: drive_file_id unique 제약 → 이미 있으면 ON CONFLICT DO NOTHING.
 */
import { NextResponse } from 'next/server'

import { getDriveClient, getRootFolderId } from '@/lib/drive/client'
import { getServiceSupabase } from '@/lib/oauth/utils'

import type { drive_v3 } from 'googleapis'
import type { NextRequest } from 'next/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5분 — Drive 트리 큰 경우 대비

const FOLDER_MIME = 'application/vnd.google-apps.folder'

type DriveItem = {
  drive_file_id: string
  drive_folder_id: string
  folder_path: string
  filename: string
  mime_type: string
  size_bytes: number | null
}

/** 폴더 안의 직속 자식(파일+폴더) 한 페이지씩 모두 가져옴. Shared Drive 호환. */
async function listChildren(
  drive: drive_v3.Drive,
  parentId: string
): Promise<drive_v3.Schema$File[]> {
  const all: drive_v3.Schema$File[] = []
  let pageToken: string | undefined = undefined
  do {
    const res: { data: drive_v3.Schema$FileList } = await drive.files.list({
      q: `'${parentId}' in parents and trashed = false`,
      fields: 'nextPageToken, files(id, name, mimeType, size, parents)',
      pageSize: 1000,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
      pageToken,
    })
    all.push(...(res.data.files ?? []))
    pageToken = res.data.nextPageToken ?? undefined
  } while (pageToken)
  return all
}

/** ROOT 하위를 재귀로 훑어 모든 파일을 평면 리스트로 반환. 폴더는 path 구성에만 사용. */
async function walkDrive(
  drive: drive_v3.Drive,
  rootId: string,
  rootPrefix: string = ''
): Promise<DriveItem[]> {
  const out: DriveItem[] = []
  // BFS — 큐로 (folderId, pathPrefix) 처리
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

export async function GET(req: NextRequest): Promise<Response> {
  // Vercel cron 인증
  const expected = process.env.CRON_SECRET
  if (!expected) {
    return NextResponse.json({ ok: false, error: 'CRON_SECRET 미설정' }, { status: 500 })
  }
  const auth = req.headers.get('authorization') ?? ''
  if (auth !== `Bearer ${expected}`) {
    return NextResponse.json({ ok: false, error: 'unauthorized' }, { status: 401 })
  }

  const started = Date.now()
  let drive: drive_v3.Drive
  let rootId: string
  try {
    drive = getDriveClient()
    rootId = getRootFolderId()
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'drive init failed'
    return NextResponse.json({ ok: false, error: msg }, { status: 500 })
  }

  // 1) Drive 트리 평면화
  let files: DriveItem[]
  try {
    files = await walkDrive(drive, rootId)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'drive walk failed'
    return NextResponse.json({ ok: false, error: `drive walk: ${msg}` }, { status: 500 })
  }

  // 2) 이미 등록된 drive_file_id 모두 한 번에 조회 (in 절 청크 분할)
  const admin = getServiceSupabase()
  const ids = files.map((f) => f.drive_file_id)
  const existing = new Set<string>()
  // PostgREST in 필터는 URL 길이 한계가 있어서 500개씩 끊는다.
  const CHUNK = 500
  for (let i = 0; i < ids.length; i += CHUNK) {
    const slice = ids.slice(i, i + CHUNK)
    const { data, error } = await admin
      .from('inbox_documents')
      .select('drive_file_id')
      .in('drive_file_id', slice)
    if (error) {
      return NextResponse.json(
        { ok: false, error: `select existing: ${error.message}` },
        { status: 500 }
      )
    }
    for (const r of data ?? []) {
      if (r.drive_file_id) existing.add(r.drive_file_id)
    }
  }

  // 3) 없는 것만 INSERT
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
  if (newRows.length > 0) {
    // upsert 로 안전하게 (혹시 동시에 다른 경로로 들어오는 경우 대비)
    for (let i = 0; i < newRows.length; i += 100) {
      const slice = newRows.slice(i, i + 100)
      const { error, count } = await admin
        .from('inbox_documents')
        .upsert(slice, { onConflict: 'drive_file_id', ignoreDuplicates: true, count: 'exact' })
      if (error) {
        return NextResponse.json(
          {
            ok: false,
            error: `insert: ${error.message}`,
            partialInserted: inserted,
          },
          { status: 500 }
        )
      }
      inserted += count ?? slice.length
    }
  }

  return NextResponse.json({
    ok: true,
    scanned: files.length,
    alreadyHad: existing.size,
    inserted,
    durationMs: Date.now() - started,
  })
}
