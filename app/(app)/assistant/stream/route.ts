import { streamAnswer } from '@/lib/assistant/answer'
import type { ChatTurn } from '@/lib/assistant/answer'
import { citedSources, retrieveContext, toSource } from '@/lib/assistant/context'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * AI 직원 — 스트리밍 답변 (NDJSON).
 * 토큰을 생성되는 대로 흘리고, 마지막에 인용 출처(또는 폴백 자료)를 보낸다.
 *
 * 응답 한 줄 = JSON 한 개:
 *   { type: 'delta',    text }        토큰 조각
 *   { type: 'sources',  sources }     답변이 인용한 출처 카드
 *   { type: 'degraded', sources }     답변 생성 실패 → 자료만
 *   { type: 'error',    error }       처리 중 오류
 *   { type: 'done' }                  완료
 */
export async function POST(req: Request): Promise<Response> {
  // 인증 (전역 미들웨어가 없으므로 여기서 직접 확인)
  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return new Response('Unauthorized', { status: 401 })

  let body: { question?: string; history?: ChatTurn[] }
  try {
    body = (await req.json()) as { question?: string; history?: ChatTurn[] }
  } catch {
    return new Response('Bad Request', { status: 400 })
  }

  const question = (body.question ?? '').trim()
  if (!question) return new Response('empty question', { status: 400 })
  const history = Array.isArray(body.history) ? body.history : []

  // 관련 자료(발췌 포함) + 팀 작업 기록 + 멤버 맥락
  const { docs, members, workLogs } = await retrieveContext(question)

  const encoder = new TextEncoder()
  const stream = new ReadableStream<Uint8Array>({
    async start(controller) {
      const send = (obj: unknown): void => {
        controller.enqueue(encoder.encode(JSON.stringify(obj) + '\n'))
      }

      let full = ''
      try {
        for await (const ev of streamAnswer({ question, history, docs, members, workLogs })) {
          if (ev.type === 'delta') {
            full += ev.text
            send({ type: 'delta', text: ev.text })
          }
        }

        if (full.trim()) {
          send({ type: 'sources', sources: citedSources(full, docs) })
          send({ type: 'done' })
        } else {
          // 답변 생성 불가 → 자료 카드 폴백 (상위 6건)
          send({ type: 'degraded', sources: docs.slice(0, 6).map((d, i) => toSource(d, i + 1)) })
        }
      } catch (e) {
        console.error('[assistant/stream] error:', e)
        send({ type: 'error', error: '답변 생성 중 문제가 생겼어요.' })
      } finally {
        controller.close()
      }
    },
  })

  return new Response(stream, {
    headers: {
      'content-type': 'application/x-ndjson; charset=utf-8',
      'cache-control': 'no-store',
      // 프록시 버퍼링 비활성화(스트리밍 즉시 전달)
      'x-accel-buffering': 'no',
    },
  })
}
