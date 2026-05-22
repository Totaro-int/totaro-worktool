#!/usr/bin/env node
/**
 * Claude 데스크탑(Mac) 앱 대화 임포터.
 *
 * Mac Claude 앱은 Electron(Chromium) 기반이라, 대화가 claude.ai 웹과 똑같이
 * 로컬 IndexedDB 에 캐시된다:
 *   ~/Library/Application Support/Claude/IndexedDB/https_claude.ai_0.indexeddb.{leveldb,blob}
 *
 * 이 스크립트는 그 IndexedDB(특히 외부 blob)에서 대화 텍스트를 추출하고,
 * 이전에 본 적 없는 "새 내용"만 골라 claude -p(Sonnet)로 사장님 보고서식으로
 * 요약한 뒤 totaro-worktool 의 claude_logs 테이블에 기록한다.
 *
 * 사용법:
 *   node scripts/import-claude-desktop-chats.mjs "<멤버이름>"        # 실제 기록
 *   node scripts/import-claude-desktop-chats.mjs "<멤버이름>" --dry  # 미전송, 요약만 출력
 *
 * cron 예시 (매일):
 *   node /Users/yuntaejun/dev/totaro-worktool/scripts/import-claude-desktop-chats.mjs "태준"
 *
 * 한계(설계상 솔직히):
 *   - 캐시된 대화만 잡힘 (앱이 비운 오래된 대화는 못 가져옴)
 *   - blob 의 V8 직렬화에서 텍스트만 best-effort 추출 → 대화 단위 경계는 정확하지 않음
 *   - 앱 업데이트로 IndexedDB 포맷이 바뀌면 추출기 갱신 필요
 *   - 내용 해시로 dedup → 같은 내용은 다시 기록 안 함
 */
import { spawnSync } from 'node:child_process'
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// totaro-worktool Supabase (anon 키는 공개용)
const SUPABASE_URL = 'https://yxijajcvxlrgoqhzadym.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWphamN2eGxyZ29xaHphZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYxMDMsImV4cCI6MjA5NDY2MjEwM30.atQqbPG2BqdR3a3CiMa7w61UJVnNtA1rYofL9ia06Qs'

const SUMMARY_MODEL = 'sonnet'
const IDB_BASE = path.join(os.homedir(), 'Library/Application Support/Claude/IndexedDB')
const STATE_FILE = path.join(os.homedir(), '.totaro', 'claude-chat-seen.json')
const MAX_SEEN = 8000 // 상태파일에 보관할 해시 최대 개수

/** V8 직렬화 버퍼에서 utf-8 문자열을 best-effort 로 뽑는다 (PoC 검증 로직). */
function readVarint(buf, i) {
  let shift = 0
  let val = 0
  while (i < buf.length) {
    const b = buf[i]
    i++
    val |= (b & 0x7f) << shift
    if (!(b & 0x80)) return [val >>> 0, i]
    shift += 7
    if (shift > 35) return [null, i]
  }
  return [null, i]
}

/** 사람이 읽는 문장인지 — 한글/영문 위주 + 공백 포함. */
function looksText(s) {
  if (s.length < 25) return false
  let ok = 0
  for (const ch of s) {
    const c = ch.codePointAt(0)
    if ((c >= 0xac00 && c <= 0xd7a3) || c < 128) ok++
  }
  return ok / s.length > 0.85 && s.trim().includes(' ')
}

/** 버퍼의 모든 V8 utf-8 문자열을 "순서대로" 디코드한다 (키·값 모두, 최소 필터). */
function decodeOrdered(buf) {
  const out = []
  let i = 0
  const n = buf.length
  while (i < n) {
    const tag = buf[i]
    if (tag === 0x22 || tag === 0x53) {
      const [len, j] = readVarint(buf, i + 1)
      if (len !== null && len > 0 && len <= 200000 && j + len <= n) {
        const s = buf.toString('utf-8', j, j + len)
        // 출력 가능 문자 위주면 토큰으로 인정 (키는 짧고, 값은 길 수 있음)
        if (s.length >= 1) {
          let printable = 0
          for (const ch of s) {
            const c = ch.codePointAt(0)
            if (c === 9 || c === 10 || (c >= 32 && c !== 127)) printable++
          }
          if (printable / s.length > 0.9) {
            out.push(s)
            i = j + len
            continue
          }
        }
      }
    }
    i++
  }
  return out
}

// 앱 내부 설정·시스템 데이터로 보이는 노이즈 패턴 (대화가 아님)
const NOISE_RE =
  /statsig|feature_?gate|experiment|_enabled|_disabled|gate_|featureflag|hotline|crisis|client_event|gating|\bnull\b.*\bnull\b/i

/** 설정/시스템 데이터 같은 노이즈인지 — 대화 본문이 아니면 true. */
function isNoise(s) {
  if (NOISE_RE.test(s)) return true
  // 토큰 하나짜리 snake_case/식별자 (예: batches_download_ui_enabled_workspace_ids)
  if (/^[a-z0-9_.:/-]+$/i.test(s.trim())) return true
  // 따옴표·중괄호·콜론 비율이 높으면 JSON/설정 덩어리
  const punct = (s.match(/["{}:_]/g) || []).length
  if (punct / s.length > 0.18) return true
  // URL 위주
  if ((s.match(/https?:\/\//g) || []).length >= 2) return true
  return false
}

/**
 * 대화 메시지 본문 후보를 뽑는다 — 자연어 문장 위주, 설정/시스템 노이즈 제외.
 * (정밀한 대화 단위 분리는 ccl 같은 IndexedDB 파서가 필요하지만, 요약 모델이
 *  주제를 묶어주므로 노이즈만 걸러도 충분히 쓸 만하다.)
 */
function extractMessages(buf) {
  const toks = decodeOrdered(buf)
  return toks.filter((s) => looksText(s) && !isNoise(s))
}

function hash(s) {
  return crypto.createHash('sha1').update(s).digest('hex').slice(0, 16)
}

function loadSeen() {
  try {
    return new Set(JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8')))
  } catch {
    return new Set()
  }
}

function saveSeen(set) {
  fs.mkdirSync(path.dirname(STATE_FILE), { recursive: true })
  const arr = [...set].slice(-MAX_SEEN)
  fs.writeFileSync(STATE_FILE, JSON.stringify(arr))
}

/** claude CLI 로 사장님 보고서식 요약 생성. 실패 시 null. */
function summarize(chunks) {
  // 앞부분에 노이즈가 몰릴 수 있어 전체에서 골고루 샘플링 (최대 80개)
  const MAX = 80
  let sample = chunks
  if (chunks.length > MAX) {
    const step = chunks.length / MAX
    sample = Array.from({ length: MAX }, (_, k) => chunks[Math.floor(k * step)])
  }
  const body = sample.map((c) => `- ${c.slice(0, 300)}`).join('\n')
  const prompt = `다음은 Claude 데스크탑 앱 대화에서 추출한 텍스트 조각이야 (여러 대화·주제가 섞여 있고 순서가 뒤섞였을 수 있음). 회사 사장님께 보고하듯 한국어로 요약해줘.

중요: 이 안에는 앱 내부 설정·기능 플래그·시스템 안내문(예: 위기 상담 핫라인, 실험 키, 계정 메타데이터) 같은 "대화가 아닌" 데이터가 섞여 있을 수 있어. 그런 건 전부 무시하고, 오직 "사용자가 실제로 작업·논의한 업무 주제"만 요약해.

- 첫 줄: 오늘 Claude 챗에서 다룬 실제 업무를 한 문장 헤드라인 (40자 내외, 평문)
- 그 다음: 주제별로 묶어 핵심 2~5개를 "· "로 시작하는 불릿
- 업무로 볼 만한 내용이 없으면 딱 한 줄 "기록할 업무성 대화 없음" 만 출력
- 군더더기 없이 출력

[추출 텍스트]
${body}`

  const args = [
    '-p',
    '--model',
    SUMMARY_MODEL,
    '--strict-mcp-config',
    '--mcp-config',
    '{"mcpServers":{}}',
  ]
  // launchd 최소 PATH 에선 node 가 없어 `claude`(내부서 node 호출)가 죽는다.
  // 현재 node 위치 + 흔한 bin 경로를 PATH 에 보강해 준다.
  const nodeDir = path.dirname(process.execPath)
  const augmentedPath = [nodeDir, '/usr/local/bin', '/opt/homebrew/bin', process.env.PATH || '']
    .filter(Boolean)
    .join(':')
  const opts = {
    input: prompt,
    env: { ...process.env, PATH: augmentedPath, TOTARO_LOGGER_CHILD: '1' }, // PATH 보강 + 재귀 방지
    cwd: os.tmpdir(),
    timeout: 90000,
    encoding: 'utf-8',
    maxBuffer: 4 * 1024 * 1024,
  }
  // launchd 최소 PATH 에선 `claude` 가 안 잡힐 수 있어 흔한 설치 위치도 순서대로 시도
  const candidates = [
    'claude',
    '/usr/local/bin/claude',
    '/opt/homebrew/bin/claude',
    path.join(os.homedir(), '.claude/local/claude'),
  ]
  for (const bin of candidates) {
    const res = spawnSync(bin, args, opts)
    if (res.error) {
      if (res.error.code === 'ENOENT') continue
      return null
    }
    if (res.status !== 0 || !res.stdout) return null
    const out = String(res.stdout).trim()
    if (!out || /API Error|not_found_error|"type"\s*:\s*"error"/i.test(out)) return null
    return (
      out
        .replace(/\*\*/g, '')
        .replace(/^#+\s*/gm, '')
        .trim() || null
    )
  }
  return null
}

async function postLog({ member, summary, turnCount }) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/claude_logs`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      member,
      summary,
      project: 'Claude 챗',
      session_id: `chat-${new Date().toISOString().slice(0, 10)}`,
      turn_count: turnCount,
    }),
  })
  return res.status
}

async function main() {
  const argv = process.argv.slice(2)
  const dry = argv.includes('--dry')
  const member = (
    argv.find((a) => !a.startsWith('--')) ||
    process.env.TOTARO_MEMBER ||
    '태준'
  ).trim()

  const leveldb = path.join(IDB_BASE, 'https_claude.ai_0.indexeddb.leveldb')
  const blob = path.join(IDB_BASE, 'https_claude.ai_0.indexeddb.blob')
  if (!fs.existsSync(blob)) {
    console.error('[chat-import] Claude 앱 IndexedDB blob 폴더가 없습니다:', blob)
    process.exit(0)
  }

  // 락 충돌 피해 임시 복사
  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'claude-chat-'))
  try {
    fs.cpSync(blob, path.join(work, 'blob'), { recursive: true })
    if (fs.existsSync(leveldb)) fs.cpSync(leveldb, path.join(work, 'leveldb'), { recursive: true })

    // blob + leveldb 의 모든 파일에서 텍스트 추출
    const files = []
    for (const root of [path.join(work, 'blob'), path.join(work, 'leveldb')]) {
      if (!fs.existsSync(root)) continue
      const walk = (d) => {
        for (const e of fs.readdirSync(d, { withFileTypes: true })) {
          const p = path.join(d, e.name)
          if (e.isDirectory()) walk(p)
          else files.push(p)
        }
      }
      walk(root)
    }

    const all = []
    for (const f of files) {
      try {
        all.push(...extractMessages(fs.readFileSync(f)))
      } catch {
        /* skip unreadable */
      }
    }

    // 내용 해시로 dedup + 이전 실행에서 본 것 제외
    const seen = loadSeen()
    const newChunks = []
    const newHashes = []
    const localSeen = new Set()
    for (const s of all) {
      const h = hash(s)
      if (seen.has(h) || localSeen.has(h)) continue
      localSeen.add(h)
      newChunks.push(s)
      newHashes.push(h)
    }

    const totalLen = newChunks.reduce((a, c) => a + c.length, 0)
    console.log(`[chat-import] 새 텍스트 조각 ${newChunks.length}개 (${totalLen}자)`)
    if (newChunks.length === 0 || totalLen < 200) {
      console.log('[chat-import] 기록할 새 대화 내용이 없습니다.')
      process.exit(0)
    }

    const summary = summarize(newChunks)
    if (!summary) {
      console.error('[chat-import] 요약 생성 실패 (claude CLI). 이번 실행은 건너뜀.')
      process.exit(1)
    }

    if (dry) {
      console.log(`[dry-run] member=${member} 조각 ${newChunks.length}개`)
      console.log('[dry-run] summary:\n' + summary)
      process.exit(0)
    }

    const status = await postLog({ member, summary, turnCount: newChunks.length })
    if (status === 201 || status === 204) {
      for (const h of newHashes) seen.add(h)
      saveSeen(seen)
      console.log('[chat-import] ✅ claude_logs 기록 완료, 상태 저장됨')
    } else {
      console.error(
        `[chat-import] 기록 실패 (HTTP ${status}) — 상태 저장 안 함 (다음 실행에서 재시도)`
      )
      process.exitCode = 1
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}

await main()
