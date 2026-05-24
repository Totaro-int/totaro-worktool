#!/usr/bin/env node
/**
 * Claude 데스크탑 챗 "원문 업로더" — 비개발자 PC용 (바이너리 타깃).
 *
 * Claude 앱 IndexedDB 에서 대화 텍스트를 추출해, 요약 없이 원문 그대로
 * Supabase `chat_raw` 테이블에 올린다. 요약은 중앙(태준 Mac)에서 한다.
 * → 이 스크립트는 claude CLI 가 필요 없고, bun 으로 단일 실행파일로 컴파일하면
 *   Node 도 필요 없어 비개발자 PC 에서 아무 설치 없이 돈다.
 *
 *   node scripts/chat-raw-uploader.mjs "이름"        # 업로드
 *   node scripts/chat-raw-uploader.mjs "이름" --dry  # 미전송, 추출만 확인
 *
 * 컴파일:  bun build scripts/chat-raw-uploader.mjs --compile --outfile dist/totaro-chat-uploader
 */
import crypto from 'node:crypto'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

const SUPABASE_URL = 'https://yxijajcvxlrgoqhzadym.supabase.co'
const SUPABASE_ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inl4aWphamN2eGxyZ29xaHphZHltIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwODYxMDMsImV4cCI6MjA5NDY2MjEwM30.atQqbPG2BqdR3a3CiMa7w61UJVnNtA1rYofL9ia06Qs'

const IDB_BASE = path.join(os.homedir(), 'Library/Application Support/Claude/IndexedDB')
const STATE_FILE = path.join(os.homedir(), '.totaro', 'chat-raw-uploaded.json')
const MAX_SEEN = 12000

// ---------- V8 직렬화 텍스트 추출 (의존성 0) ----------
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

function looksText(s) {
  if (s.length < 25) return false
  let ok = 0
  for (const ch of s) {
    const c = ch.codePointAt(0)
    if ((c >= 0xac00 && c <= 0xd7a3) || c < 128) ok++
  }
  return ok / s.length > 0.85 && s.trim().includes(' ')
}

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

const NOISE_RE =
  /statsig|feature_?gate|experiment|_enabled|_disabled|gate_|featureflag|hotline|crisis|client_event|gating|\bnull\b.*\bnull\b/i

function isNoise(s) {
  if (NOISE_RE.test(s)) return true
  // 모지바케/깨진 디코딩(� U+FFFD)이 하나라도 있으면 버림 (V8 경계 오인식 잔재)
  if (s.includes('�')) return true
  // 위기상담·자살예방 류 시스템 안내문 (다국어) — 대화 아님
  if (/suicid|prevenc|예방|상담전화|lifeline|crisis|hotline|helpline/i.test(s)) return true
  if (/^[a-z0-9_.:/-]+$/i.test(s.trim())) return true
  const punct = (s.match(/["{}:_]/g) || []).length
  if (punct / s.length > 0.18) return true
  if ((s.match(/https?:\/\//g) || []).length >= 2) return true
  return false
}

function extractMessages(buf) {
  return decodeOrdered(buf).filter((s) => looksText(s) && !isNoise(s))
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
  fs.writeFileSync(STATE_FILE, JSON.stringify([...set].slice(-MAX_SEEN)))
}

async function uploadBatch(rows) {
  const res = await fetch(`${SUPABASE_URL}/rest/v1/chat_raw?on_conflict=member,chunk_hash`, {
    method: 'POST',
    headers: {
      apikey: SUPABASE_ANON_KEY,
      Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      'Content-Type': 'application/json',
      Prefer: 'return=minimal,resolution=ignore-duplicates', // 중복(member,chunk_hash) 무시
    },
    body: JSON.stringify(rows),
  })
  return res.status
}

async function main() {
  const argv = process.argv.slice(2)
  const dry = argv.includes('--dry')
  const member = (argv.find((a) => !a.startsWith('--')) || process.env.TOTARO_MEMBER || '').trim()
  if (!member) {
    console.error('[chat-raw] 멤버 이름이 필요합니다: chat-raw-uploader "이름"')
    process.exit(1)
  }

  const blob = path.join(IDB_BASE, 'https_claude.ai_0.indexeddb.blob')
  const leveldb = path.join(IDB_BASE, 'https_claude.ai_0.indexeddb.leveldb')
  if (!fs.existsSync(blob)) {
    console.error('[chat-raw] Claude 앱 IndexedDB 가 없습니다. 앱을 한 번 실행했는지 확인하세요.')
    process.exit(0)
  }

  const work = fs.mkdtempSync(path.join(os.tmpdir(), 'chat-raw-'))
  try {
    fs.cpSync(blob, path.join(work, 'blob'), { recursive: true })
    if (fs.existsSync(leveldb)) fs.cpSync(leveldb, path.join(work, 'leveldb'), { recursive: true })

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
        /* skip */
      }
    }

    const seen = loadSeen()
    const local = new Set()
    const rows = []
    const newHashes = []
    for (const content of all) {
      const h = hash(content)
      if (seen.has(h) || local.has(h)) continue
      local.add(h)
      rows.push({ member, chunk_hash: h, content })
      newHashes.push(h)
    }

    console.log(`[chat-raw] member=${member} 새 조각 ${rows.length}개`)
    if (rows.length === 0) {
      console.log('[chat-raw] 올릴 새 내용 없음')
      process.exit(0)
    }

    if (dry) {
      console.log('[dry-run] 업로드 안 함. 샘플 3개:')
      for (const r of rows.slice(0, 3))
        console.log('  ·', r.content.replace(/\s+/g, ' ').slice(0, 90))
      process.exit(0)
    }

    // 300개씩 끊어 업로드
    let ok = true
    for (let i = 0; i < rows.length; i += 300) {
      const status = await uploadBatch(rows.slice(i, i + 300))
      if (status !== 201 && status !== 204) {
        console.error(`[chat-raw] 업로드 실패 (HTTP ${status})`)
        ok = false
        break
      }
    }
    if (ok) {
      for (const h of newHashes) seen.add(h)
      saveSeen(seen)
      console.log('[chat-raw] ✅ 업로드 완료, 상태 저장됨')
    } else {
      console.error('[chat-raw] 일부 실패 — 상태 저장 안 함 (다음에 재시도)')
      process.exitCode = 1
    }
  } finally {
    fs.rmSync(work, { recursive: true, force: true })
  }
}

await main()
