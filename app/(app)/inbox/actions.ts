'use server'

import { revalidatePath } from 'next/cache'

import { ensureFolderPath, getDriveClient, getFolderTree, uploadFile } from '@/lib/drive/client'
import { classifyDocument } from '@/lib/mailroom/classify'
import { extractContent } from '@/lib/mailroom/extract'
import { createNotification } from '@/lib/notifications/create'
import { createClient } from '@/lib/supabase/server'

/**
 * 8축 구조 (v2 — 2026-06):
 *   01: AI 소싱 플랫폼 (본진 — 옛 01/02/03/04 통합)
 *   05: 마케팅·콘텐츠
 *   06: 회사 운영
 *   07: 에이전트 제작 외주 (멜라누아 등)
 *   08: E커머스 (베로티·청원농산 등)
 *   99: 휴지통
 */
const ALLOWED_AXES = [
  '01 AI 소싱 플랫폼',
  '05 마케팅·콘텐츠',
  '06 회사 운영',
  '07 에이전트 제작 외주',
  '08 E커머스',
  '99 분류미정',
]

export type ClassifyResponse = {
  ok: boolean
  documentId?: string
  target_folder_path?: string
  notify_users?: string[]
  summary?: string
  doc_type?: string
  confidence?: number
  alternatives?: Array<{ folder: string; confidence: number }>
  method?: string
  error?: string
}

/**
 * 파일 업로드 + AI 분류 (저장은 아직 안 함). pending 상태로 documents 행 생성.
 * 결과는 사용자에게 보여주고, 사용자가 confirmClassification 으로 진짜 저장 트리거.
 */
export async function uploadAndClassify(formData: FormData): Promise<ClassifyResponse> {
  const file = formData.get('file')
  const userDescription = String(formData.get('description') ?? '').trim()
  const notifyRaw = String(formData.get('notify_users') ?? '').trim()
  if (!(file instanceof File)) {
    return { ok: false, error: '파일이 첨부되지 않았습니다.' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '인증 필요' }

  // 파일 데이터 추출
  const buffer = Buffer.from(await file.arrayBuffer())
  const extracted = await extractContent(buffer, file.name, file.type)

  // 분류 input 준비
  const drive = (() => {
    try {
      return getDriveClient()
    } catch (e) {
      throw new Error(
        `Drive 설정 안 됨: ${e instanceof Error ? e.message : String(e)}. .env.local 확인.`
      )
    }
  })()
  const availableFolders = await getFolderTree(drive).catch(() => [] as string[])

  // 멤버 + 최근 task — 회사 맥락
  const [{ data: members }, { data: tasks }] = await Promise.all([
    supabase.from('members').select('id, name'),
    supabase.from('tasks').select('title, work_area_id, assignee_id, status').limit(30),
  ])
  const memberNames = (members ?? []).map((m) => m.name).filter(Boolean) as string[]

  // 분류
  const classification = await classifyDocument({
    filename: file.name,
    userDescription,
    extracted,
    availableFolders,
    members: memberNames,
    recentTasks: (tasks ?? []).map((t) => ({
      title: String(t.title ?? ''),
      area: String(t.work_area_id ?? ''),
      assignee: String(t.assignee_id ?? ''),
    })),
  })

  // documents 테이블에 pending 행 생성 (아직 Drive 업로드 X)
  const userNotifyList = notifyRaw ? notifyRaw.split(',').map((s) => s.trim()) : []
  const notifyMerged = Array.from(
    new Set([...classification.notify_users, ...userNotifyList])
  ).filter(Boolean)

  // notify name → member id 매핑
  const nameToId = new Map((members ?? []).map((m) => [m.name, m.id]))
  const notifyIds = notifyMerged.map((n) => nameToId.get(n)).filter((v): v is string => Boolean(v))

  const { data: doc, error } = await supabase
    .from('inbox_documents')
    .insert({
      filename: file.name,
      description: userDescription || null,
      size_bytes: buffer.length,
      mime_type: file.type || null,
      uploaded_by: user.id,
      classified_by_ai: classification.method === 'claude',
      classification_confidence: classification.confidence,
      ai_reasoning: classification.summary,
      doc_type: classification.doc_type,
      folder_path: classification.target_folder_path,
      notify_users: notifyIds,
      status: 'classified',
    })
    .select('id')
    .single()

  if (error || !doc) {
    return {
      ok: false,
      error: `documents 행 생성 실패: ${error?.message ?? 'unknown'}`,
    }
  }

  // 파일 buffer 를 임시로 어딘가에 둬야 함. v0 는 직접 다음 단계에서 다시 받음(클라이언트 사이드 holdback)
  // 또는 supabase storage 에 일시 보관. 단순화 위해 클라이언트가 buffer 다시 들고있다가 confirm 시점에 보냄.
  // → 그래서 이 함수는 분류 결과만 돌려주고, confirm 시 file 다시 받음.

  return {
    ok: true,
    documentId: doc.id,
    target_folder_path: classification.target_folder_path,
    notify_users: notifyMerged,
    summary: classification.summary,
    doc_type: classification.doc_type,
    confidence: classification.confidence,
    alternatives: classification.alternatives,
    method: classification.method,
  }
}

/**
 * 분류 결과를 사용자가 확정. 파일을 Drive 에 진짜 업로드 + 알림 발송.
 */
export async function confirmClassification(formData: FormData): Promise<ClassifyResponse> {
  const file = formData.get('file')
  const documentId = String(formData.get('document_id') ?? '')
  const folderPath = String(formData.get('folder_path') ?? '').trim()
  const notifyIdsRaw = String(formData.get('notify_user_ids') ?? '').trim()

  if (!(file instanceof File) || !documentId || !folderPath) {
    return { ok: false, error: '파일/document_id/folder_path 누락' }
  }

  if (!ALLOWED_AXES.some((axis) => folderPath.includes(axis))) {
    return { ok: false, error: '허용된 8축 폴더 안에만 저장 가능' }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, error: '인증 필요' }

  // Drive 폴더 확보 (없으면 생성)
  let folderId: string
  try {
    const drive = getDriveClient()
    folderId = await ensureFolderPath(drive, folderPath)
    const buffer = Buffer.from(await file.arrayBuffer())
    const { id: driveFileId, webViewLink } = await uploadFile(
      drive,
      folderId,
      file.name,
      buffer,
      file.type || 'application/octet-stream'
    )

    // documents 업데이트
    await supabase
      .from('inbox_documents')
      .update({
        drive_file_id: driveFileId,
        drive_folder_id: folderId,
        folder_path: folderPath,
        status: 'confirmed',
        ai_reasoning: webViewLink ?? null,
      })
      .eq('id', documentId)

    // 알림 발송
    const notifyIds = notifyIdsRaw
      ? notifyIdsRaw
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean)
      : []
    if (notifyIds.length > 0) {
      const { data: doc } = await supabase
        .from('inbox_documents')
        .select('filename, doc_type')
        .eq('id', documentId)
        .single()
      const title = doc?.filename ?? '새 문서'
      const body = `${doc?.doc_type ?? '문서'} 가 ${folderPath} 에 저장됨`
      await createNotification({
        recipientIds: notifyIds,
        type: 'document_uploaded',
        title,
        body,
        link: `/inbox?doc=${documentId}`,
        relatedTable: 'inbox_documents',
        relatedId: documentId,
      })
    }

    revalidatePath('/inbox')
    return {
      ok: true,
      documentId,
      target_folder_path: folderPath,
    }
  } catch (e) {
    await supabase
      .from('inbox_documents')
      .update({ status: 'failed', ai_reasoning: e instanceof Error ? e.message : String(e) })
      .eq('id', documentId)
    return { ok: false, error: e instanceof Error ? e.message : String(e) }
  }
}

/** 분류 결과를 사용자가 거부 (저장 안 함). documents 상태만 rejected. */
export async function rejectClassification(documentId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  await supabase.from('inbox_documents').update({ status: 'rejected' }).eq('id', documentId)
  revalidatePath('/inbox')
  return { ok: true }
}
