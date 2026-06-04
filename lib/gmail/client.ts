/**
 * Gmail API v1 클라이언트 — 내부 AI 우편실 v1.
 *
 * 인증: OAuth 2.0 (refresh_token 패턴).
 *   1) Google Cloud Console > APIs & Services > OAuth client (Desktop) 만들기
 *   2) `npx tsx scripts/gmail-auth.ts` 실행 → 브라우저 동의 → refresh_token 받기
 *   3) .env.local 에 저장: GMAIL_CLIENT_ID, GMAIL_CLIENT_SECRET, GMAIL_REFRESH_TOKEN
 *
 * service account 안 쓰는 이유: Gmail 은 Workspace 도메인 위임이 필요한데
 * admin 권한이 있어야 함. OAuth refresh_token 이 가장 빠른 길.
 *
 * 사용 예:
 *   const gmail = getGmailClient()
 *   const msgs = await listRecentMessages(gmail, { days: 7 })
 *   for (const m of msgs) { const full = await getMessage(gmail, m.id) }
 */
import { google } from 'googleapis'

import type { gmail_v1 } from 'googleapis'

let cachedGmail: gmail_v1.Gmail | null = null

/** OAuth2 refresh_token 기반 Gmail 클라이언트. 모듈 lifecycle 동안 캐시. */
export function getGmailClient(): gmail_v1.Gmail {
  if (cachedGmail) return cachedGmail
  const clientId = process.env.GMAIL_CLIENT_ID
  const clientSecret = process.env.GMAIL_CLIENT_SECRET
  const refreshToken = process.env.GMAIL_REFRESH_TOKEN
  if (!clientId || !clientSecret || !refreshToken) {
    throw new Error(
      'GMAIL_CLIENT_ID / GMAIL_CLIENT_SECRET / GMAIL_REFRESH_TOKEN 환경변수가 없습니다. scripts/gmail-auth.ts 먼저 실행하세요.'
    )
  }
  const oauth2 = new google.auth.OAuth2(clientId, clientSecret)
  oauth2.setCredentials({ refresh_token: refreshToken })
  cachedGmail = google.gmail({ version: 'v1', auth: oauth2 })
  return cachedGmail
}

export type MessageSummary = {
  id: string
  threadId: string
  date: Date | null
  from: string
  subject: string
  snippet: string
  hasAttachments: boolean
}

/** 받은편지함 최근 N일 메시지 ID·요약 리스트. */
export async function listRecentMessages(
  gmail: gmail_v1.Gmail,
  opts: { days?: number; maxResults?: number; query?: string } = {}
): Promise<MessageSummary[]> {
  const days = opts.days ?? 7
  const maxResults = opts.maxResults ?? 50
  const after = Math.floor(Date.now() / 1000 - days * 24 * 60 * 60)
  const q = [`in:inbox`, `after:${after}`, opts.query ?? ''].filter(Boolean).join(' ')

  const list = await gmail.users.messages.list({
    userId: 'me',
    q,
    maxResults,
  })
  const ids = (list.data.messages ?? []).map((m) => m.id ?? '').filter(Boolean)

  const out: MessageSummary[] = []
  for (const id of ids) {
    const detail = await gmail.users.messages.get({
      userId: 'me',
      id,
      format: 'metadata',
      metadataHeaders: ['From', 'Subject', 'Date'],
    })
    const headers = detail.data.payload?.headers ?? []
    const get = (name: string): string =>
      headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
    const dateStr = get('Date')
    const date = dateStr ? new Date(dateStr) : null
    const parts = collectParts(detail.data.payload)
    const hasAttachments = parts.some((p) => Boolean(p.filename) && Boolean(p.body?.attachmentId))
    out.push({
      id,
      threadId: detail.data.threadId ?? '',
      date,
      from: get('From'),
      subject: get('Subject'),
      snippet: detail.data.snippet ?? '',
      hasAttachments,
    })
  }
  return out
}

export type MessageDetail = {
  id: string
  threadId: string
  date: Date | null
  from: string
  to: string
  subject: string
  /** 본문 텍스트 — text/plain 우선, 없으면 text/html 에서 태그 제거 */
  bodyText: string
  attachments: AttachmentRef[]
}

export type AttachmentRef = {
  attachmentId: string
  filename: string
  mimeType: string
  sizeBytes: number
}

/** 한 메시지의 본문·첨부 메타 추출. 첨부 바이너리는 downloadAttachment 로 따로. */
export async function getMessage(gmail: gmail_v1.Gmail, id: string): Promise<MessageDetail> {
  const detail = await gmail.users.messages.get({
    userId: 'me',
    id,
    format: 'full',
  })
  const headers = detail.data.payload?.headers ?? []
  const get = (name: string): string =>
    headers.find((h) => h.name?.toLowerCase() === name.toLowerCase())?.value ?? ''
  const dateStr = get('Date')
  const date = dateStr ? new Date(dateStr) : null

  const parts = collectParts(detail.data.payload)

  // body: text/plain 우선
  let bodyText = ''
  const textPart = parts.find((p) => p.mimeType === 'text/plain' && p.body?.data)
  const htmlPart = parts.find((p) => p.mimeType === 'text/html' && p.body?.data)
  if (textPart?.body?.data) {
    bodyText = decodeBase64Url(textPart.body.data)
  } else if (htmlPart?.body?.data) {
    bodyText = stripHtml(decodeBase64Url(htmlPart.body.data))
  }

  const attachments: AttachmentRef[] = parts
    .filter((p) => Boolean(p.filename) && Boolean(p.body?.attachmentId))
    .map((p) => ({
      attachmentId: p.body!.attachmentId!,
      filename: p.filename ?? 'unnamed',
      mimeType: p.mimeType ?? 'application/octet-stream',
      sizeBytes: p.body?.size ?? 0,
    }))

  return {
    id,
    threadId: detail.data.threadId ?? '',
    date,
    from: get('From'),
    to: get('To'),
    subject: get('Subject'),
    bodyText,
    attachments,
  }
}

/** 첨부 바이너리 다운로드. Buffer 로 반환. */
export async function downloadAttachment(
  gmail: gmail_v1.Gmail,
  messageId: string,
  attachmentId: string
): Promise<Buffer> {
  const res = await gmail.users.messages.attachments.get({
    userId: 'me',
    messageId,
    id: attachmentId,
  })
  const b64 = res.data.data ?? ''
  return Buffer.from(b64.replace(/-/g, '+').replace(/_/g, '/'), 'base64')
}

/** 메시지에 Gmail 라벨 적용 (예: '처리됨'). 라벨 ID 가 없으면 ensureLabel 으로 만들기. */
export async function applyLabel(
  gmail: gmail_v1.Gmail,
  messageId: string,
  labelId: string
): Promise<void> {
  await gmail.users.messages.modify({
    userId: 'me',
    id: messageId,
    requestBody: { addLabelIds: [labelId] },
  })
}

/** 이름으로 라벨 찾거나 없으면 만들기. 동기화 표시용. */
export async function ensureLabel(gmail: gmail_v1.Gmail, name: string): Promise<string> {
  const list = await gmail.users.labels.list({ userId: 'me' })
  const existing = (list.data.labels ?? []).find((l) => l.name === name)
  if (existing?.id) return existing.id
  const created = await gmail.users.labels.create({
    userId: 'me',
    requestBody: { name, labelListVisibility: 'labelShow', messageListVisibility: 'show' },
  })
  return created.data.id ?? ''
}

// ============================================================
// 내부 유틸
// ============================================================

/** payload 트리 평면화 — 모든 part 를 평탄하게. */
function collectParts(payload?: gmail_v1.Schema$MessagePart | null): gmail_v1.Schema$MessagePart[] {
  if (!payload) return []
  const out: gmail_v1.Schema$MessagePart[] = [payload]
  const children = payload.parts ?? []
  for (const c of children) out.push(...collectParts(c))
  return out
}

function decodeBase64Url(b64url: string): string {
  const b64 = b64url.replace(/-/g, '+').replace(/_/g, '/')
  return Buffer.from(b64, 'base64').toString('utf-8')
}

function stripHtml(html: string): string {
  return html
    .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
    .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/\s+/g, ' ')
    .trim()
}
