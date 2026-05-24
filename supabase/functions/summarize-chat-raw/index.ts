// Supabase Edge Function — chat_raw 중앙 요약기 (서버 버전).
//
// 목적: 요약을 태준 Mac(SPOF)에서 떼어내 항상 켜진 서버에서 돌린다 (로드맵 #1).
// scripts/summarize-chat-raw.mjs 의 서버판. Edge Function 은 claude CLI 를 못 쓰므로
// Anthropic Messages API 를 직접 호출한다.
//
// === 배포 (Anthropic API 키 발급 후) ===
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy summarize-chat-raw
//   # 스케줄: 대시보드 Cron 또는 pg_cron 으로 10분마다 호출
//
// 필요한 시크릿: SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY (기본 제공), ANTHROPIC_API_KEY.
// 선택: ANTHROPIC_MODEL (기본 claude-3-5-sonnet-latest — 키가 접근 가능한 모델로).

const SUPABASE_URL = Deno.env.get('SUPABASE_URL')!
const SERVICE_KEY = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
const ANON_KEY = Deno.env.get('SUPABASE_ANON_KEY')!
const ANTHROPIC_KEY = Deno.env.get('ANTHROPIC_API_KEY')!
const MODEL = Deno.env.get('ANTHROPIC_MODEL') ?? 'claude-3-5-sonnet-latest'

const svc = {
  apikey: SERVICE_KEY,
  Authorization: `Bearer ${SERVICE_KEY}`,
  'Content-Type': 'application/json',
}

const PROMPT_HEAD = `다음은 한 직원이 Claude 데스크탑 앱에서 나눈 대화에서 추출한 텍스트 조각이야 (여러 대화·주제 섞임, 순서 뒤섞임). 회사 사장님께 보고하듯 한국어로 요약해줘.

중요: 앱 내부 설정·기능 플래그·시스템 안내문 같은 "대화가 아닌" 데이터가 섞여 있을 수 있어. 그건 무시하고 "실제로 작업·논의한 업무 주제"만 요약해.

- 첫 줄: 다룬 실제 업무 한 문장 헤드라인 (40자 내외, 평문)
- 그 다음: 주제별로 묶어 핵심 2~5개를 "· "로 시작하는 불릿
- 업무로 볼 만한 내용 없으면 "기록할 업무성 대화 없음" 한 줄만
- 군더더기 없이 출력

[추출 텍스트]
`

async function summarize(chunks: string[]): Promise<string | null> {
  const MAX = 80
  let sample = chunks
  if (chunks.length > MAX) {
    const step = chunks.length / MAX
    sample = Array.from({ length: MAX }, (_, k) => chunks[Math.floor(k * step)])
  }
  const body = sample.map((c) => `- ${c.slice(0, 300)}`).join('\n')

  const res = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'x-api-key': ANTHROPIC_KEY,
      'anthropic-version': '2023-06-01',
      'content-type': 'application/json',
    },
    body: JSON.stringify({
      model: MODEL,
      max_tokens: 600,
      messages: [{ role: 'user', content: PROMPT_HEAD + body }],
    }),
  })
  if (!res.ok) return null
  const json = await res.json()
  const text = json?.content?.[0]?.text?.trim()
  return text
    ? text
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .trim()
    : null
}

async function run(): Promise<{ processed: number; logged: number }> {
  const pendRes = await fetch(
    `${SUPABASE_URL}/rest/v1/chat_raw?summarized=eq.false&select=id,member,content&order=created_at.asc&limit=4000`,
    { headers: svc }
  )
  const pending: { id: number; member: string; content: string }[] = await pendRes.json()
  if (pending.length === 0) return { processed: 0, logged: 0 }

  const byMember = new Map<string, { ids: number[]; chunks: string[] }>()
  for (const r of pending) {
    const m = byMember.get(r.member) ?? { ids: [], chunks: [] }
    m.ids.push(r.id)
    m.chunks.push(r.content)
    byMember.set(r.member, m)
  }

  let processed = 0
  let logged = 0
  for (const [member, { ids, chunks }] of byMember) {
    const summary = await summarize(chunks)
    if (!summary) continue // 실패 → 다음 호출에서 재시도
    const noWork = summary.replace(/\s/g, '').includes('기록할업무성대화없음')
    if (!noWork) {
      await fetch(`${SUPABASE_URL}/rest/v1/claude_logs`, {
        method: 'POST',
        headers: {
          apikey: ANON_KEY,
          Authorization: `Bearer ${ANON_KEY}`,
          'Content-Type': 'application/json',
          Prefer: 'return=minimal',
        },
        body: JSON.stringify({
          member,
          summary,
          project: 'Claude 챗',
          session_id: `chat-${member}-${new Date().toISOString().slice(0, 10)}`,
          turn_count: chunks.length,
        }),
      })
      logged++
    }
    await fetch(`${SUPABASE_URL}/rest/v1/chat_raw?id=in.(${ids.join(',')})`, {
      method: 'PATCH',
      headers: { ...svc, Prefer: 'return=minimal' },
      body: JSON.stringify({ summarized: true }),
    })
    processed += ids.length
  }

  // 보존정책 — 요약완료 30일 경과분 purge
  const cutoff = new Date(Date.now() - 30 * 86400e3).toISOString()
  await fetch(
    `${SUPABASE_URL}/rest/v1/chat_raw?summarized=eq.true&created_at=lt.${encodeURIComponent(cutoff)}`,
    {
      method: 'DELETE',
      headers: { ...svc, Prefer: 'return=minimal' },
    }
  )

  return { processed, logged }
}

Deno.serve(async () => {
  try {
    const result = await run()
    return new Response(JSON.stringify({ ok: true, ...result }), {
      headers: { 'content-type': 'application/json' },
    })
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), {
      status: 500,
      headers: { 'content-type': 'application/json' },
    })
  }
})
