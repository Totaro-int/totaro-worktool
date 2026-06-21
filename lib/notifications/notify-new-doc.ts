/**
 * 새 문서(우편/보고서) 도착 → 인앱 + 폰 알림. inbox_documents INSERT 직후 호출.
 *
 * Drive 동기화·MCP 업로드가 새 행을 넣을 때 이걸 부르면:
 *  - 에이전트 보고서 폴더('마케팅 분석' 등) → 건별 "📊 …새 보고서"
 *  - 그 외 → "📬 새 우편 N건 도착" 한 건으로 묶음(대량 임포트는 파일명 생략 → 스팸 방지)
 * 전부 createNotification 깔때기를 통과하므로 VAPID 키가 없으면 폰 푸시만 조용히 스킵된다.
 * 알림은 부가 기능 — 실패해도 throw 하지 않아 본 작업(INSERT)을 막지 않는다.
 */
import { createNotification } from '@/lib/notifications/create'
import { getServiceSupabase } from '@/lib/oauth/utils'

export type NewDoc = {
  filename: string
  folderPath: string | null
  id?: string
}

/** 에이전트 보고서로 취급할 폴더 경로 마커 → 라벨·링크. folder_path 에 포함되면 보고서 알림. */
const AGENT_REPORTS: { marker: string; label: string; link: string }[] = [
  { marker: '마케팅 분석', label: '김사현', link: '/hub/ai-team/kim-sahyun' },
]

/** 대량 임포트로 판단하는 임계치 — 넘으면 파일명 생략하고 한 건만 보냄. */
const BULK_THRESHOLD = 30

function matchReport(folderPath: string | null): { label: string; link: string } | null {
  if (!folderPath) return null
  for (const a of AGENT_REPORTS) {
    if (folderPath.includes(a.marker)) return { label: a.label, link: a.link }
  }
  return null
}

/** 알림 수신자 = 멤버 전원(팀 규모 작음). members.id 는 auth.users.id 와 동일. */
async function allMemberIds(): Promise<string[]> {
  const sb = getServiceSupabase()
  const { data } = await sb.from('members').select('id')
  return ((data ?? []) as { id: string }[]).map((m) => m.id).filter(Boolean)
}

/**
 * 새로 들어온 문서들에 대해 알림 발송. 보고서는 건별, 그 외 우편은 한 건으로 묶음.
 * 실패는 삼킨다(알림은 부가 기능 — 호출부의 INSERT 를 막지 않는다).
 */
export async function notifyNewDocuments(docs: NewDoc[]): Promise<void> {
  try {
    const fresh = docs.filter((d) => d.filename)
    if (fresh.length === 0) return

    const reportDocs: { d: NewDoc; r: { label: string; link: string } }[] = []
    const mailDocs: NewDoc[] = []
    for (const d of fresh) {
      const r = matchReport(d.folderPath)
      if (r) reportDocs.push({ d, r })
      else mailDocs.push(d)
    }

    const recipients = await allMemberIds()
    if (recipients.length === 0) return

    // 에이전트 보고서 — 건별 알림
    for (const { d, r } of reportDocs) {
      await createNotification({
        recipientIds: recipients,
        type: 'agent_report',
        title: `📊 ${r.label} 새 보고서`,
        body: d.filename,
        link: r.link,
        relatedTable: 'inbox_documents',
        relatedId: d.id ?? null,
      })
    }

    // 새 우편 — 한 건으로 묶음
    if (mailDocs.length > 0) {
      const n = mailDocs.length
      const bulk = n > BULK_THRESHOLD
      let body: string
      if (bulk) {
        body = `${n}건의 문서가 새로 들어왔어요.`
      } else {
        const names = mailDocs.slice(0, 3).map((d) => d.filename)
        const more = n > 3 ? ` 외 ${n - 3}건` : ''
        body = `${names.join(', ')}${more}`
      }
      await createNotification({
        recipientIds: recipients,
        type: 'new_mail',
        title: bulk ? `📬 새 우편 다수 도착 (${n}건)` : `📬 새 우편 ${n}건 도착`,
        body,
        link: '/inbox',
        relatedTable: 'inbox_documents',
        relatedId: mailDocs[0]?.id ?? null,
      })
    }
  } catch (e) {
    console.error('[notify-new-doc] 실패:', e)
  }
}
