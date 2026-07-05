/**
 * 김사현 보고서 → 액션 자동 할일화 (B6 자율 실행, 가드레일 내).
 *
 * 일일 보고서가 업로드되는 순간 "👉 사장님, 오늘은 이거 하나" 섹션을 파싱해
 * 할일을 자동 생성한다(담당: 윤태준, 제목에 [김사현] 표기, 같은 제목 있으면 스킵).
 * 원칙: 되돌릴 수 있는 것만 자율 — 할일 '생성'만 하고 수정·삭제·발송은 안 한다.
 * 실패는 삼킨다(보고서 저장을 막지 않는다).
 */
import { handleTasksCreate } from './agent-handlers'
import { sbGet } from './handlers'

/** 보고서 본문에서 "오늘은 이거 하나" 액션 한 줄을 뽑는다. 없으면 null. */
export function parseReportAction(text: string): string | null {
  // 헤더(이모지·공백 변형 허용) 이후 ~ 다음 구분선/헤더 전까지
  const m = /##[^\n]*이거 하나[^\n]*\n([\s\S]*?)(?:\n---|\n##|$)/u.exec(text)
  if (!m) return null
  const line = (m[1] ?? '')
    .split('\n')
    .map((l) =>
      l
        .replace(/\*\*/g, '')
        .replace(/^[-*>\s]+/, '')
        .trim()
    )
    .filter(Boolean)[0]
  if (!line) return null
  // 한 줄 정리(너무 길면 자름 — 제목용)
  return line.slice(0, 120)
}

/**
 * 마케팅 분석 보고서면 액션을 할일로 자동 생성. 그 외 폴더는 무시.
 * due_date = 내일(KST) — "오늘 하나" 액션이므로 바로 다음 업무일 기준.
 */
export async function maybeAutoTaskFromReport(
  folderPath: string,
  filename: string,
  text: string
): Promise<void> {
  try {
    if (!folderPath.includes('마케팅 분석')) return
    const action = parseReportAction(text)
    if (!action) return

    const title = `오늘의 액션: ${action}`
    // 중복 방지 — 같은 액션 제목의 할일이 이미 있으면 스킵 (재업로드 대비)
    const existing = (await sbGet(
      `tasks?select=id&title=eq.${encodeURIComponent(`[김사현] ${title}`)}&limit=1`
    )) as Array<{ id: string }>
    if (existing.length > 0) return

    const dueDate = new Date(Date.now() + 9 * 3600_000 + 86400_000).toISOString().slice(0, 10)
    await handleTasksCreate({
      agent: 'kim-sahyun',
      title,
      description: `일일 보고서(${filename})의 "사장님, 오늘은 이거 하나" 자동 등록.\n원문: ${action}`,
      due_date: dueDate,
      assignee_name: '윤태준',
    })
  } catch (e) {
    console.error('[report-actions] 자동 할일 실패(보고서 저장은 정상):', e)
  }
}
