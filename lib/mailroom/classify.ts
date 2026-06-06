/**
 * 자동 분류 — 내부 AI 우편실.
 *
 * 시도 순서(위에서부터 되는 걸 사용):
 *   1) Vertex Gemini — `GOOGLE_SERVICE_ACCOUNT_JSON` 재사용. Vercel 서버리스에서 동작. 비용 0(GCP 크레딧).
 *   2) Claude CLI — 로컬 Mac 개발 환경 폴백(`claude` 바이너리). Vercel 에는 없음.
 *   3) 파일명 휴리스틱 — 모두 실패해도 절대 안 깨지게.
 *
 * v0는 텍스트 추출 기반 분류(tier 1). 이미지·hwp·음성은 파일명 기반 폴백(낮은 confidence).
 * v1에서 Vision·Whisper 추가 예정.
 */
import { spawnSync } from 'node:child_process'
import os from 'node:os'
import path from 'node:path'

import { generateGemini } from '@/lib/assistant/gemini'

import type { ExtractedContent } from './extract'

const SUMMARY_MODEL = 'opus'

export type ClassificationInput = {
  filename: string
  userDescription: string
  extracted: ExtractedContent
  /** Drive 현재 폴더 구조(평면 경로 리스트, ensureFolderPath로 만들어진 거) */
  availableFolders: string[]
  /** 팀 멤버 이름 목록 (notify_users 후보) */
  members: string[]
  /** 진행 중 task 목록 (회사 맥락 보강용) — title + 영역 + 담당 */
  recentTasks?: Array<{ title: string; area: string; assignee: string }>
}

export type ClassificationResult = {
  target_folder_path: string
  create_folder_if_missing: boolean
  notify_users: string[]
  summary: string
  doc_type: string
  confidence: number
  alternatives?: Array<{ folder: string; confidence: number }>
  /** 디버그 — 어떤 모드로 분류했는지 */
  method: 'gemini' | 'claude' | 'filename-fallback' | 'error'
  /** 디버그 — 원본 응답 (에러 추적용) */
  raw?: string
}

/** 분류 메인 함수. Gemini → Claude CLI → 파일명 순으로 폴백. */
export async function classifyDocument(input: ClassificationInput): Promise<ClassificationResult> {
  // 1) Vertex Gemini — Vercel + 로컬 모두 동작. GOOGLE_SERVICE_ACCOUNT_JSON 으로 인증.
  try {
    const result = await callGeminiClassifier(input)
    if (result) return result
  } catch {
    // 무시 → 다음 경로
  }

  // 2) Claude CLI — 로컬 dev 폴백. Vercel 에는 `claude` 바이너리 없음 → ENOENT 로 빠짐.
  try {
    const result = callClaudeClassifier(input)
    if (result) return { ...result, method: 'claude' }
  } catch {
    // 무시 → 다음 경로
  }

  // 3) 파일명 휴리스틱 — 최후의 안전망.
  return filenameBasedFallback(input)
}

/** Vertex Gemini 호출해 분류 결과(JSON) 받음. 실패하면 null. */
async function callGeminiClassifier(
  input: ClassificationInput
): Promise<ClassificationResult | null> {
  const prompt = buildPrompt(input)
  const result = await generateGemini(prompt)
  if (!result.available || !result.text) return null
  return parseClassificationJson(result.text, 'gemini')
}

/** 모델 응답에서 JSON 한 덩이를 파싱해 ClassificationResult 로. 실패하면 null. */
function parseClassificationJson(
  raw: string,
  method: 'gemini' | 'claude'
): ClassificationResult | null {
  // 모델이 가끔 ```json ... ``` 으로 감싸기 때문에 폴백 파싱
  const cleaned = raw
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```$/i, '')
    .trim()
  try {
    const parsed = JSON.parse(cleaned)
    return {
      target_folder_path: String(parsed.target_folder_path ?? ''),
      create_folder_if_missing: Boolean(parsed.create_folder_if_missing ?? false),
      notify_users: Array.isArray(parsed.notify_users)
        ? parsed.notify_users.map((u: unknown) => String(u))
        : [],
      summary: String(parsed.summary ?? ''),
      doc_type: String(parsed.doc_type ?? ''),
      confidence: Number(parsed.confidence ?? 0),
      alternatives: Array.isArray(parsed.alternatives)
        ? parsed.alternatives.map((a: { folder?: unknown; confidence?: unknown }) => ({
            folder: String(a.folder ?? ''),
            confidence: Number(a.confidence ?? 0),
          }))
        : undefined,
      method,
      raw: raw.slice(0, 1000),
    }
  } catch {
    return null
  }
}

/** Claude CLI 호출해 분류 결과(JSON) 받음. 실패하면 null. */
function callClaudeClassifier(input: ClassificationInput): ClassificationResult | null {
  const prompt = buildPrompt(input)
  const args = [
    '-p',
    '--model',
    SUMMARY_MODEL,
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
  ]
  // launchd / 분리 worker 에서도 잡히게 PATH 보강
  const nodeDir = path.dirname(process.execPath)
  const augmentedPath = [nodeDir, '/usr/local/bin', '/opt/homebrew/bin', process.env.PATH || '']
    .filter(Boolean)
    .join(':')
  const opts = {
    input: prompt,
    env: { ...process.env, PATH: augmentedPath, TOTARO_LOGGER_CHILD: '1' },
    cwd: os.tmpdir(),
    timeout: 90000,
    encoding: 'utf-8' as const,
    maxBuffer: 4 * 1024 * 1024,
  }
  const candidates = [
    'claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.claude/local/claude'),
  ]
  let raw = ''
  let ok = false
  for (const bin of candidates) {
    const res = spawnSync(bin, args, opts)
    if (res.error) {
      if ((res.error as NodeJS.ErrnoException).code === 'ENOENT') continue
      return null
    }
    if (res.status !== 0 || !res.stdout) return null
    raw = String(res.stdout).trim()
    if (/API Error|not_found_error/i.test(raw)) return null
    ok = true
    break
  }
  if (!ok) return null
  return parseClassificationJson(raw, 'claude')
}

function buildPrompt(input: ClassificationInput): string {
  const tasksContext =
    (input.recentTasks ?? [])
      .slice(0, 20)
      .map((t) => `  - ${t.title} (${t.area} · ${t.assignee})`)
      .join('\n') || '  (진행 중 task 없음)'

  const folderList = input.availableFolders.map((f) => `  - ${f}`).join('\n')

  const extractedSnippet =
    input.extracted.tier === 1 && input.extracted.text
      ? input.extracted.text.slice(0, 1500)
      : input.extracted.tier === 2
        ? '(이미지 파일, 본문 텍스트 추출 안 됨)'
        : '(텍스트 추출 불가 — 파일명·설명만 활용)'

  return `토타로 팀의 문서 자동 분류 에이전트입니다. 한국 식품 제조사를 해외 바이어와 매칭하는 AI 플랫폼 사업입니다.

[회사 정보]
- 본업: 공급사·바이어 매칭 + AI 자동 견적·추천 플랫폼 (totaro_web/cos)
- 팀: 윤태준(공동창업/제품), 최준빈(리서치·BI), 송승주(=업플로우, 개발)
- 진행 중 task:
${tasksContext}

[가능한 폴더 트리]
${folderList || '  (비어있음 — 새 폴더 제안)'}

[입력 문서]
- 파일명: ${input.filename}
- 사용자 설명: ${input.userDescription || '(없음)'}
- 텍스트 추출:
${extractedSnippet}

[멤버 목록 (notify_users 후보)]
${input.members.join(', ')}

[허용된 8축 — 반드시 이 안에서 선택]
  01 AI 소싱 플랫폼 — 본진 제품(워크허브 / totaro_web / totaro_cos / AI 시스템 / 공급사 운영 / 바이어 운영)
  05 마케팅·콘텐츠
  06 회사 운영 — 인사·계약·근로 / 재무·세무·인보이스 / 회의록·전략 / 정부 지원사업 / 브랜드·로고·CI
  07 에이전트 제작 외주 — 현재 계약: 멜라누아 마케팅 에이전트
  08 E커머스 — 현재 계약: 베로티, 청원농산
  99 분류미정

[작업]
1. 가장 적합한 폴더 경로 결정. 위 8축 안에서만 선택. 기존 sub-폴더에 안 맞으면 새 sub-폴더 제안.
2. 알림 받아야 할 멤버 결정 (관련 task 담당자 우선, 사용자 명시도 존중).
3. 문서 한 줄 요약 (40자 내외, 능동형 동사).
4. 문서 종류 라벨 (계약서/견적서/회의록/PoC 인포 시트/리서치 자료/디자인 자료/지원사업/마케팅 자료/기타).
5. confidence 점수 (0~1). 추측이 약하면 낮춰.
6. confidence < 0.7 이면 alternatives 2개 제안.

[출력]
JSON 한 덩어리만 출력. 마크다운·설명·코드블록 없이 순수 JSON.

{
  "target_folder_path": "/01 AI 소싱 플랫폼/공급사 운영/...",
  "create_folder_if_missing": false,
  "notify_users": ["윤태준", "최준빈"],
  "summary": "...",
  "doc_type": "...",
  "confidence": 0.0,
  "alternatives": [{"folder": "...", "confidence": 0.0}]
}`
}

/** 파일명 기반 폴백 — Claude 안 될 때 또는 tier 3. v2: 8축 구조. */
function filenameBasedFallback(input: ClassificationInput): ClassificationResult {
  const fname = input.filename.toLowerCase()
  // 매우 단순 휴리스틱
  let folder = '/99 분류미정/'
  let docType = '기타'
  if (/계약|contract/.test(fname)) {
    folder = '/06 회사 운영/인사·계약·근로/'
    docType = '계약서'
  } else if (/견적|quote|estimate/.test(fname)) {
    folder = '/01 AI 소싱 플랫폼/AI 시스템/견적 자동화/'
    docType = '견적서'
  } else if (/poc|인포\s*시트/.test(fname)) {
    folder = '/01 AI 소싱 플랫폼/공급사 운영/PoC 인포 시트/'
    docType = 'PoC 인포 시트'
  } else if (/회의|미팅|meeting|minutes/.test(fname)) {
    folder = '/06 회사 운영/회의록·전략 문서/'
    docType = '회의록'
  } else if (/지원사업|grant/.test(fname)) {
    folder = '/06 회사 운영/정부 지원사업/'
    docType = '지원사업'
  } else if (/멜라누아|melanoir/.test(fname)) {
    folder = '/07 에이전트 제작 외주/멜라누아 마케팅 에이전트/'
    docType = '에이전트 외주'
  } else if (/베로티|청원농산/.test(fname)) {
    folder = '/08 E커머스/'
    docType = 'E커머스'
  }
  return {
    target_folder_path: folder,
    create_folder_if_missing: false,
    notify_users: [],
    summary: input.userDescription || input.filename,
    doc_type: docType,
    confidence: 0.3,
    method: 'filename-fallback',
  }
}
