#!/usr/bin/env tsx
/**
 * 김사현 평가 하네스 — "현업 수준" 판정의 근거. before/after 점수 비교 + 회귀 방지용.
 *
 * 측정 3종:
 *  A. 보고서 품질 (10점) — 최신 일일 보고서를 루브릭 5개(구조/근거/보이스/실행성/어제대비)로
 *     LLM(Vertex Gemini, 판정 temperature 0) 채점.
 *  B. 질의응답 (10점) — 골든 5문항. 검색 적중(브레인에서 근거 문서 회수) 1점
 *     + 근거 기반 답변에 기대 키워드 포함 1점.
 *     검색 경로: worktool brain_search(마이그레이트 후) → 로컬 gbrain CLI 폴백.
 *  C. 자율 실행 (정보성) — 최신 보고서의 "오늘은 이거 하나" 액션 존재 + 최근 7일 tasks_create 실적.
 *
 * 사용: npx tsx scripts/agent-eval.ts   → 콘솔 요약 + docs/eval/{날짜}.md 저장
 */
import { execFile } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { promisify } from 'node:util'

import { loadEnvConfig } from '@next/env'
import { createClient as createSupabaseClient } from '@supabase/supabase-js'

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
loadEnvConfig(repoRoot)

const execFileAsync = promisify(execFile)
const GBRAIN_ENV = {
  ...process.env,
  PATH: `${path.join(os.homedir(), '.bun', 'bin')}:${process.env.PATH ?? ''}`,
}

const TEXT_MODEL = process.env.GOOGLE_VERTEX_CONTENT_MODEL || 'gemini-3.1-pro-preview'
const TEXT_LOCATION = process.env.GOOGLE_VERTEX_CONTENT_LOCATION || 'global'

// ── LLM 판정 (JSON 모드, temperature 0) ─────────────────────────
async function judgeJson(prompt: string): Promise<Record<string, unknown> | null> {
  const { getVertexAccess, vertexUrl } = await import('../lib/assistant/vertex')
  const access = await getVertexAccess()
  if (!access) return null
  try {
    const res = await fetch(
      vertexUrl(access.project, TEXT_MODEL, 'generateContent', TEXT_LOCATION),
      {
        method: 'POST',
        headers: { Authorization: `Bearer ${access.token}`, 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: prompt }] }],
          generationConfig: {
            maxOutputTokens: 8192, // 3.1-pro thinking 토큰 대비 — 2048 금지
            temperature: 0,
            responseMimeType: 'application/json',
          },
        }),
      }
    )
    if (!res.ok) {
      console.error(`[eval] Gemini ${res.status}: ${(await res.text()).slice(0, 200)}`)
      return null
    }
    const json = (await res.json()) as {
      candidates?: { content?: { parts?: { text?: string }[] } }[]
    }
    const text = (json.candidates?.[0]?.content?.parts ?? []).map((p) => p.text ?? '').join('')
    return JSON.parse(text) as Record<string, unknown>
  } catch (e) {
    console.error('[eval] 판정 실패:', e instanceof Error ? e.message : String(e))
    return null
  }
}

/** 질문 → 검색 키워드 (물음표·조사 제거, 내용어 2개). tsvector 가 조사 붙은 질문을 못 잡는 것 보정. */
function toKeywords(q: string): string {
  return q
    .replace(/[?？.!,]/g, ' ')
    .split(/\s+/)
    .map((t) => t.replace(/(은|는|이|가|을|를|의|에|로|으로|와|과|도|나)$/u, ''))
    .filter((t) => t.length >= 2)
    .slice(0, 2)
    .join(' ')
}

// ── 검색 경로: worktool brain_search → 로컬 gbrain CLI 폴백. top 결과는 전문 로드 ──
async function brainRetrieve(query: string): Promise<{ via: string; text: string }> {
  const kw = toKeywords(query) || query
  try {
    const { handleBrainSearch, handleBrainGet } = await import('../lib/mcp/brain-handlers')
    const out = await handleBrainSearch({ query: kw, limit: 5 })
    if (!out.startsWith('브레인 미구축') && !out.startsWith('브레인에서 일치 항목 없음')) {
      const slug = /slug:\s*([^\s)]+)/.exec(out)?.[1]
      const full = slug ? await handleBrainGet({ slug }) : ''
      return { via: 'worktool(supabase)', text: `${out}\n\n${full}`.slice(0, 6000) }
    }
  } catch {
    // 폴백으로
  }
  try {
    const { stdout } = await execFileAsync('gbrain', ['search', kw], {
      env: GBRAIN_ENV,
      maxBuffer: 4 * 1024 * 1024,
    })
    // 결과 형식: "[0.42] slug -- 스니펫" → top slug 전문까지 로드(스니펫엔 정답이 없을 수 있음)
    const slug = /^\[[\d.]+\]\s+(\S+)/m.exec(stdout)?.[1]
    let full = ''
    if (slug) {
      try {
        const { stdout: page } = await execFileAsync('gbrain', ['get', slug], {
          env: GBRAIN_ENV,
          maxBuffer: 4 * 1024 * 1024,
        })
        full = page
      } catch {
        // 스니펫만으로 진행
      }
    }
    const text = `${stdout}\n\n${full}`.trim().slice(0, 6000)
    return { via: 'local-gbrain', text }
  } catch {
    return { via: 'none', text: '' }
  }
}

// ── 골든 QA 5문항 ────────────────────────────────────────────────
const GOLDEN: Array<{ q: string; expect: string[] }> = [
  { q: '협탁 사이즈 옵션은?', expect: ['W360', 'W480'] },
  { q: '모네하우스 북극성 지표는?', expect: ['장바구니', '결제'] },
  { q: '브랜드 보이스 4개 키워드는?', expect: ['Quiet', 'Calm', 'Honest', 'Sincere'] },
  { q: '김사현 일일 보고서는 어느 폴더에 저장되나?', expect: ['마케팅 분석'] },
  { q: '모네하우스가 타깃하지 않는 고객은?', expect: ['최저가'] },
]

function hitCount(text: string, expect: string[]): number {
  const lower = text.toLowerCase()
  return expect.filter((k) => lower.includes(k.toLowerCase())).length
}

async function main(): Promise<void> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) throw new Error('SUPABASE env 필요')
  const sb = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })
  const today = new Date(Date.now() + 9 * 3600_000).toISOString().slice(0, 10)
  const lines: string[] = [`# 김사현 평가 — ${today}`, '']

  // ── A. 보고서 품질 ──
  // body_excerpt 캐시 우선, 없으면(과거 업로드분) Drive 에서 본문 다운로드 폴백.
  const { data: repRows } = await sb
    .from('inbox_documents')
    .select('filename, body_excerpt, drive_file_id, mime_type, created_at')
    .ilike('folder_path', '%마케팅 분석%')
    .not('drive_file_id', 'is', null)
    .not('status', 'in', '(trashed,rejected,failed)')
    .order('created_at', { ascending: false })
    .limit(1)
  const repRow = (repRows ?? [])[0] as
    | {
        filename: string
        body_excerpt: string | null
        drive_file_id: string
        mime_type: string | null
        created_at: string
      }
    | undefined

  let rep: { filename: string; body_excerpt: string; created_at: string } | undefined
  if (repRow) {
    let body = (repRow.body_excerpt ?? '').trim()
    if (!body) {
      try {
        const { getDriveClient } = await import('../lib/drive/client')
        const { extractContent } = await import('../lib/mailroom/extract')
        const drive = getDriveClient()
        const res = await drive.files.get(
          { fileId: repRow.drive_file_id, alt: 'media', supportsAllDrives: true },
          { responseType: 'arraybuffer' }
        )
        const ext = await extractContent(
          Buffer.from(res.data as ArrayBuffer),
          repRow.filename,
          repRow.mime_type ?? ''
        )
        if (ext.tier === 1 && ext.text) body = ext.text
      } catch {
        // 측정 불가로 처리
      }
    }
    if (body) rep = { filename: repRow.filename, body_excerpt: body, created_at: repRow.created_at }
  }

  let reportScore = 0
  if (rep) {
    const rubric = await judgeJson(
      `너는 마케팅 보고서 품질 심사관이다. 아래 일일 보고서를 루브릭으로 채점해 JSON 만 출력해라.
루브릭(각 0~2점): structure(필수 섹션: 오늘 한 줄/트렌드/경쟁사/바로 쓸 것/사장님 액션),
evidence(주장에 출처·수치 표기), voice(MONÉ 보이스 — 과장·느낌표 남발 없음, 조용·정확),
actionability(액션이 오늘 실행 가능할 만큼 구체적), delta(전일/전주 대비 비교 존재).
출력 형식: {"structure":0,"evidence":0,"voice":0,"actionability":0,"delta":0,"note":"한줄평"}

=== 보고서 (${rep.filename}) ===
${rep.body_excerpt.slice(0, 6000)}`
    )
    if (rubric) {
      const keys = ['structure', 'evidence', 'voice', 'actionability', 'delta'] as const
      reportScore = keys.reduce((s, k) => s + Math.min(2, Math.max(0, Number(rubric[k]) || 0)), 0)
      lines.push(`## A. 보고서 품질: **${reportScore}/10** (${rep.filename})`)
      for (const k of keys) lines.push(`- ${k}: ${rubric[k]}/2`)
      lines.push(`- 평: ${String(rubric.note ?? '')}`, '')
    } else {
      lines.push(`## A. 보고서 품질: 판정 실패(LLM) — ${rep.filename}`, '')
    }
  } else {
    lines.push('## A. 보고서 품질: 측정 불가 — body_excerpt 있는 보고서 없음', '')
  }

  // ── B. 질의응답 ──
  let qaScore = 0
  lines.push('## B. 질의응답 (검색 1점 + 답변 1점 × 5문항)')
  for (const g of GOLDEN) {
    const retrieved = await brainRetrieve(g.q)
    const rHit = retrieved.text && hitCount(retrieved.text, g.expect) > 0 ? 1 : 0

    let aHit = 0
    if (retrieved.text) {
      const ans = await judgeJson(
        `아래 회사 자료만 근거로 질문에 한국어 한 문장으로 답해라. 자료에 없으면 "근거 부족"이라고 해라.
출력: {"answer":"..."}
질문: ${g.q}
=== 자료 ===
${retrieved.text.slice(0, 2500)}`
      )
      const answer = String(ans?.answer ?? '')
      aHit = hitCount(answer, g.expect) >= Math.min(2, g.expect.length) ? 1 : 0
      lines.push(
        `- "${g.q}" → 검색 ${rHit} (${retrieved.via}) · 답변 ${aHit} — ${answer.slice(0, 80)}`
      )
    } else {
      lines.push(`- "${g.q}" → 검색 0 (경로 없음) · 답변 0`)
    }
    qaScore += rHit + aHit
  }
  lines.push(`**QA 합계: ${qaScore}/10**`, '')

  // ── C. 자율 실행 (정보성 베이스라인) ──
  const weekAgo = new Date(Date.now() - 7 * 86400_000).toISOString()
  const { count: taskActs } = await sb
    .from('agent_actions')
    .select('*', { count: 'exact', head: true })
    .eq('action', 'tasks_create')
    .gte('created_at', weekAgo)
  const hasAction = rep ? /이거 하나/.test(rep.body_excerpt) : false
  lines.push('## C. 자율 실행 (베이스라인)')
  lines.push(`- 최신 보고서에 "오늘은 이거 하나" 액션: ${hasAction ? '있음' : '없음'}`)
  lines.push(`- 최근 7일 에이전트 tasks_create 실적: ${taskActs ?? 0}건`, '')

  lines.push(`---`, `**총평: 보고서 ${reportScore}/10 · QA ${qaScore}/10** (측정 ${today})`)

  const outDir = path.join(repoRoot, 'docs', 'eval')
  fs.mkdirSync(outDir, { recursive: true })
  const outPath = path.join(outDir, `${today}.md`)
  fs.writeFileSync(outPath, lines.join('\n') + '\n')
  console.log(lines.join('\n'))
  console.log(`\n저장: ${outPath}`)
}

main().catch((e) => {
  console.error('[agent-eval] 실패:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
