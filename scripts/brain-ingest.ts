#!/usr/bin/env tsx
/**
 * gbrain 지식 인제스트 — 김사현의 장기기억(브레인) 채우기. 멱등(slug 기준 덮어쓰기).
 *
 * 대상:
 *  1) deploy/brain/corpus/*.md — 브랜드 법칙·전략·제품·팀 상식(정적 코퍼스)
 *  2) inbox_documents 의 김사현 보고서 아카이브(folder_path에 '마케팅 분석') — body_excerpt 기반
 *
 * 현재 설정된 gbrain 엔진(로컬 PGLite 또는 Supabase)에 그대로 쓴다.
 * Supabase 로 이전할 땐 브레인만 `gbrain migrate --to supabase` 하면 됨(재인제스트 불필요).
 *
 * 사용: npx tsx scripts/brain-ingest.ts
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

/** gbrain put <slug> — 본문은 stdin 으로. */
async function brainPut(slug: string, content: string): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const child = execFile(
      'gbrain',
      ['put', slug],
      { env: GBRAIN_ENV, maxBuffer: 10 * 1024 * 1024 },
      (err) => (err ? reject(err) : resolve())
    )
    child.stdin?.write(content)
    child.stdin?.end()
  })
}

function slugify(name: string): string {
  return name
    .replace(/\.[a-z0-9]+$/i, '')
    .toLowerCase()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)
}

async function main(): Promise<void> {
  // 0) gbrain 존재 확인
  const { stdout: ver } = await execFileAsync('gbrain', ['version'], { env: GBRAIN_ENV })
  console.log(`[brain-ingest] gbrain ${ver.trim().split('\n')[0]}`)

  // 1) 정적 코퍼스
  const corpusDir = path.join(repoRoot, 'deploy', 'brain', 'corpus')
  const files = fs
    .readdirSync(corpusDir)
    .filter((f) => f.endsWith('.md'))
    .sort()
  for (const f of files) {
    const slug = slugify(f)
    await brainPut(slug, fs.readFileSync(path.join(corpusDir, f), 'utf8'))
    console.log(`  ✅ corpus: ${slug}`)
  }

  // 2) 김사현 보고서 아카이브 (body_excerpt 있는 것만 — 없으면 메타만이라 가치 낮음)
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY ?? ''
  if (!url || !key) throw new Error('SUPABASE env 필요(.env.local)')
  const sb = createSupabaseClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data, error } = await sb
    .from('inbox_documents')
    .select('filename, folder_path, body_excerpt, ai_reasoning, created_at')
    .ilike('folder_path', '%마케팅 분석%')
    .not('drive_file_id', 'is', null)
    .not('status', 'in', '(trashed,rejected,failed)')
    .order('created_at', { ascending: true })
  if (error) throw new Error(`보고서 조회 실패: ${error.message}`)

  let reports = 0
  for (const r of (data ?? []) as Array<{
    filename: string
    folder_path: string | null
    body_excerpt: string | null
    ai_reasoning: string | null
    created_at: string
  }>) {
    const body = (r.body_excerpt ?? '').trim() || (r.ai_reasoning ?? '').trim()
    if (!body) continue
    const slug = `report-${slugify(r.filename)}`
    const md = [
      `---`,
      // 파일명에 콜론/따옴표가 있어도 YAML 이 안 깨지게 JSON 문자열로 인용
      `title: ${JSON.stringify(r.filename)}`,
      `type: report`,
      `tags: [kim-sahyun, marketing-report]`,
      `date: ${r.created_at.slice(0, 10)}`,
      `---`,
      ``,
      `# ${r.filename}`,
      ``,
      `(우편함 ${r.folder_path ?? ''} · ${r.created_at.slice(0, 10)})`,
      ``,
      body,
    ].join('\n')
    await brainPut(slug, md)
    reports++
    console.log(`  ✅ report: ${slug}`)
  }

  console.log(`[brain-ingest] 완료 — 코퍼스 ${files.length} + 보고서 ${reports} 페이지.`)
}

main().catch((e) => {
  console.error('[brain-ingest] 실패:', e instanceof Error ? e.message : String(e))
  process.exit(1)
})
