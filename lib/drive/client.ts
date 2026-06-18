/**
 * Google Drive API v3 클라이언트 — 내부 AI 우편실 v0.
 *
 * service account 키를 사용해 서버 전용으로 접근. 사용자별 OAuth 없음(v0 단순).
 * 모든 파일은 service account가 소유하지만, 토타로 폴더가 팀에게 공유돼있으면
 * 멤버들이 직접 Drive 웹/앱에서도 볼 수 있음.
 *
 * 환경변수: GOOGLE_SERVICE_ACCOUNT_JSON (service account key JSON 한 줄 string)
 *           GOOGLE_DRIVE_ROOT_FOLDER_ID (토타로 폴더 ID — 모든 파일이 이 하위로)
 *
 * 사용 예:
 *   const drive = getDriveClient()
 *   const file = await uploadFile(drive, '/03 공급사 운영/대성식품/', 'PoC.pdf', buffer, 'application/pdf')
 */
import { Readable } from 'node:stream'

import { google } from 'googleapis'

import type { drive_v3 } from 'googleapis'

const FOLDER_MIME = 'application/vnd.google-apps.folder'

/**
 * Drive API 호출을 지수 백오프로 재시도. 5xx / 0 (네트워크) / 'fetch failed' /
 * ECONNRESET 같은 transient 만 재시도, 4xx 는 즉시 throw (영구 에러).
 * 1초 → 2초 → 4초. 사용자에게 "Drive 503" 안 뜨게 하는 핵심.
 */
export async function withDriveRetry<T>(
  label: string,
  fn: () => Promise<T>,
  attempts = 3
): Promise<T> {
  let lastErr: unknown
  for (let i = 0; i < attempts; i++) {
    try {
      return await fn()
    } catch (e) {
      lastErr = e
      const status =
        ((e as { response?: { status?: number } })?.response?.status ?? 0) ||
        ((e as { status?: number })?.status ?? 0) ||
        ((e as { code?: number })?.code ?? 0)
      const msg = String((e as { message?: string })?.message ?? '')
      const transient =
        status >= 500 ||
        status === 429 ||
        status === 0 ||
        /fetch failed|ECONNRESET|ETIMEDOUT|socket hang up|network/i.test(msg)
      if (!transient || i === attempts - 1) {
        throw new Error(`Drive ${label} 실패 (status=${status}): ${msg || 'unknown'}`)
      }
      await new Promise((r) => setTimeout(r, 1000 * Math.pow(2, i)))
    }
  }
  throw lastErr
}

/** service account 자격증명으로 Drive 클라이언트 발급. 모듈 lifecycle 동안 캐시. */
let cachedDrive: drive_v3.Drive | null = null
export function getDriveClient(): drive_v3.Drive {
  if (cachedDrive) return cachedDrive
  const json = process.env.GOOGLE_SERVICE_ACCOUNT_JSON
  if (!json) {
    throw new Error('GOOGLE_SERVICE_ACCOUNT_JSON 환경변수가 없습니다 (.env.local).')
  }
  const credentials = JSON.parse(json)
  const auth = new google.auth.GoogleAuth({
    credentials,
    scopes: ['https://www.googleapis.com/auth/drive'],
  })
  cachedDrive = google.drive({ version: 'v3', auth })
  return cachedDrive
}

/** Drive 파일 본문을 텍스트로 다운로드 (마크다운·텍스트 문서용). */
export async function downloadFile(drive: drive_v3.Drive, fileId: string): Promise<string> {
  const res = await withDriveRetry('downloadFile', () =>
    drive.files.get({ fileId, alt: 'media' }, { responseType: 'text' })
  )
  const data = (res as { data?: unknown }).data
  return typeof data === 'string' ? data : String(data ?? '')
}

/** 루트 폴더 ID(토타로 폴더). 환경변수에서 받음. */
export function getRootFolderId(): string {
  const id = process.env.GOOGLE_DRIVE_ROOT_FOLDER_ID
  if (!id) {
    throw new Error('GOOGLE_DRIVE_ROOT_FOLDER_ID 환경변수가 없습니다 (.env.local).')
  }
  return id
}

/** 한 폴더 안의 자식 폴더 목록 반환. Shared Drive 호환. */
export async function listSubfolders(
  drive: drive_v3.Drive,
  parentId: string
): Promise<{ id: string; name: string }[]> {
  const res = await withDriveRetry('listSubfolders', () =>
    drive.files.list({
      q: `'${parentId}' in parents and mimeType='${FOLDER_MIME}' and trashed=false`,
      fields: 'files(id, name)',
      pageSize: 100,
      supportsAllDrives: true,
      includeItemsFromAllDrives: true,
    })
  )
  return (res.data.files ?? []).map((f) => ({ id: f.id ?? '', name: f.name ?? '' }))
}

/** 경로 문자열(`/01 제품/워크허브/`)을 Drive 폴더 ID로 해석. 없으면 자동 생성. */
export async function ensureFolderPath(
  drive: drive_v3.Drive,
  pathStr: string,
  rootId?: string
): Promise<string> {
  const segments = pathStr
    .split('/')
    .map((s) => s.trim())
    .filter(Boolean)
  let parent = rootId ?? getRootFolderId()
  for (const segment of segments) {
    const children = await listSubfolders(drive, parent)
    const existing = children.find((c) => c.name === segment)
    if (existing) {
      parent = existing.id
    } else {
      const created = await withDriveRetry('createFolder', () =>
        drive.files.create({
          requestBody: {
            name: segment,
            mimeType: FOLDER_MIME,
            parents: [parent],
          },
          fields: 'id',
          supportsAllDrives: true,
        })
      )
      parent = created.data.id ?? ''
      if (!parent) throw new Error(`폴더 생성 실패: ${segment}`)
    }
  }
  return parent
}

/** 폴더 트리 전체를 재귀 탐색해 평면 경로 목록으로 반환. AI 분류 input 용. */
export async function getFolderTree(
  drive: drive_v3.Drive,
  rootId?: string,
  prefix: string = ''
): Promise<string[]> {
  const root = rootId ?? getRootFolderId()
  const children = await listSubfolders(drive, root)
  const paths: string[] = []
  for (const c of children) {
    const path = `${prefix}/${c.name}`
    paths.push(`${path}/`)
    // 깊이 3까지만 재귀 (성능 + 자체 분리)
    if (prefix.split('/').length < 3) {
      const sub = await getFolderTree(drive, c.id, path)
      paths.push(...sub)
    }
  }
  return paths
}

/** 파일 업로드. content는 Buffer 또는 string. mimeType은 application/pdf 등. */
export async function uploadFile(
  drive: drive_v3.Drive,
  folderId: string,
  filename: string,
  content: Buffer | string,
  mimeType: string
): Promise<{ id: string; webViewLink: string | null }> {
  const buffer = Buffer.isBuffer(content) ? content : Buffer.from(content, 'utf-8')
  // 매 재시도마다 stream 새로 생성 — Readable 은 1회만 소비 가능.
  const res = await withDriveRetry('uploadFile', () =>
    drive.files.create({
      requestBody: {
        name: filename,
        parents: [folderId],
        mimeType,
      },
      media: {
        mimeType,
        body: Readable.from(buffer),
      },
      fields: 'id, webViewLink',
      supportsAllDrives: true,
    })
  )
  return {
    id: res.data.id ?? '',
    webViewLink: res.data.webViewLink ?? null,
  }
}

/** 파일을 다른 폴더로 이동 (감사 로그는 caller가 따로 기록). */
export async function moveFile(
  drive: drive_v3.Drive,
  fileId: string,
  newParentId: string
): Promise<void> {
  const current = await withDriveRetry('getFileParents', () =>
    drive.files.get({
      fileId,
      fields: 'parents',
      supportsAllDrives: true,
    })
  )
  const previousParents = (current.data.parents ?? []).join(',')
  await withDriveRetry('moveFile', () =>
    drive.files.update({
      fileId,
      addParents: newParentId,
      removeParents: previousParents,
      fields: 'id, parents',
      supportsAllDrives: true,
    })
  )
}

/** 파일을 휴지통으로 (soft delete). 30일 후 자동 영구 삭제 — Drive 기본 정책. */
export async function trashFile(drive: drive_v3.Drive, fileId: string): Promise<void> {
  await withDriveRetry('trashFile', () =>
    drive.files.update({
      fileId,
      requestBody: { trashed: true },
      supportsAllDrives: true,
    })
  )
}

/** 폴더 ID로부터 사람 읽을 수 있는 경로 문자열 재구성. 디버그·로그용. */
export async function pathOfFolder(drive: drive_v3.Drive, folderId: string): Promise<string> {
  const parts: string[] = []
  let current = folderId
  const rootId = getRootFolderId()
  while (current && current !== rootId) {
    const f = await withDriveRetry('getFolderInfo', () =>
      drive.files.get({
        fileId: current,
        fields: 'name, parents',
        supportsAllDrives: true,
      })
    )
    parts.unshift(f.data.name ?? '?')
    current = (f.data.parents ?? [])[0] ?? ''
  }
  return '/' + parts.join('/') + '/'
}
