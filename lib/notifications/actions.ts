'use server'

import { createClient } from '@/lib/supabase/server'

/** 알림 + 관련 문서(드라이브 링크 포함) 함께 보여주기 위한 모양. */
export type NotificationItem = {
  id: string
  type: string
  title: string
  body: string | null
  link: string | null
  createdAt: string
  readAt: string | null
  /** related_table='inbox_documents' 일 때만 채워짐. */
  doc?: {
    id: string
    filename: string
    folderPath: string | null
    docType: string | null
    driveUrl: string | null
  }
}

/**
 * 현재 로그인 사용자에게 온 알림. 기본은 안 읽은 것 + 최근 읽은 5개.
 * related_table=inbox_documents 인 경우 Drive URL 까지 한 번에 만든다.
 */
export async function loadNotifications(limit = 20): Promise<NotificationItem[]> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return []

  const { data: notifs } = await supabase
    .from('notifications')
    .select('id, type, title, body, link, related_table, related_id, created_at, read_at')
    .eq('recipient_id', user.id)
    .order('created_at', { ascending: false })
    .limit(limit)

  const rows = (notifs ?? []) as Array<{
    id: string
    type: string
    title: string
    body: string | null
    link: string | null
    related_table: string | null
    related_id: string | null
    created_at: string
    read_at: string | null
  }>

  // related_table='inbox_documents' 인 것들 묶어 한 번에 join
  const docIds = Array.from(
    new Set(
      rows
        .filter((r) => r.related_table === 'inbox_documents' && r.related_id)
        .map((r) => r.related_id as string)
    )
  )

  const docMap = new Map<
    string,
    {
      id: string
      filename: string
      folder_path: string | null
      doc_type: string | null
      drive_file_id: string | null
    }
  >()
  if (docIds.length > 0) {
    const { data: docs } = await supabase
      .from('inbox_documents')
      .select('id, filename, folder_path, doc_type, drive_file_id')
      .in('id', docIds)
    for (const d of docs ?? []) docMap.set(d.id as string, d as never)
  }

  return rows.map((r) => {
    const doc = r.related_id ? docMap.get(r.related_id) : undefined
    return {
      id: r.id,
      type: r.type,
      title: r.title,
      body: r.body,
      link: r.link,
      createdAt: r.created_at,
      readAt: r.read_at,
      doc: doc
        ? {
            id: doc.id,
            filename: doc.filename,
            folderPath: doc.folder_path,
            docType: doc.doc_type,
            driveUrl: doc.drive_file_id
              ? `https://drive.google.com/file/d/${doc.drive_file_id}/view`
              : null,
          }
        : undefined,
    }
  })
}

/** 단일 알림을 읽음 처리. */
export async function markNotificationRead(notifId: string): Promise<{ ok: boolean }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false }
  await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('id', notifId)
    .eq('recipient_id', user.id)
    .is('read_at', null)
  return { ok: true }
}

/** 본인 받은 알림 전부 읽음 처리. */
export async function markAllNotificationsRead(): Promise<{ ok: boolean; count: number }> {
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return { ok: false, count: 0 }
  const { data } = await supabase
    .from('notifications')
    .update({ read_at: new Date().toISOString() })
    .eq('recipient_id', user.id)
    .is('read_at', null)
    .select('id')
  return { ok: true, count: (data ?? []).length }
}
