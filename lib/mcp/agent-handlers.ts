/**
 * Agent Data Platform MCP 핸들러 — 에이전트(Hermes 등)가 회사 두뇌에 쓰는 도구들.
 *
 * 원칙 (docs/agent-data-platform.md):
 *   - 모든 write 는 agent slug 로 행위자를 밝힌다 (agents 테이블)
 *   - 모든 write 는 agent_actions 에 감사 기록을 남긴다
 *   - 라벨은 통제 어휘(labels)만 — 자유 텍스트 라벨 금지
 *   - 기억(agent_memories)에는 출처(source)와 신뢰도(confidence)를 권장
 */
import { sbGet, sbPatch, sbPost, sbRpc } from './handlers'
import { embedText } from '../assistant/embedding'

type AgentRow = { id: string; slug: string; name: string; status: string }

/** slug → agents 행. 없거나 비활성이면 throw. */
async function resolveAgent(slug: string): Promise<AgentRow> {
  if (!slug) throw new Error('agent (slug) 파라미터 필수 — 예: "kim-sahyun"')
  const rows = (await sbGet(
    `agents?select=id,slug,name,status&slug=eq.${encodeURIComponent(slug)}&limit=1`
  )) as AgentRow[]
  const agent = rows[0]
  if (!agent) {
    const all = (await sbGet(`agents?select=slug,name&status=eq.active`)) as Array<{
      slug: string
      name: string
    }>
    const list = all.map((a) => `${a.slug}(${a.name})`).join(', ')
    throw new Error(`알 수 없는 agent "${slug}". 등록된 에이전트: ${list}`)
  }
  if (agent.status !== 'active') throw new Error(`에이전트 ${agent.name} 은 ${agent.status} 상태`)
  return agent
}

/** 감사 로그 한 줄. write 핸들러 끝에서 호출. 실패해도 본 작업은 살림. */
async function logAction(
  agentId: string,
  action: string,
  summary: string,
  targetTable?: string,
  targetId?: string,
  payload?: Record<string, unknown>
): Promise<void> {
  try {
    await sbPost('agent_actions', {
      agent_id: agentId,
      action,
      summary: summary.slice(0, 500),
      target_table: targetTable ?? null,
      target_id: targetId ?? null,
      payload: payload ?? {},
    })
  } catch {
    // 감사 로그 실패가 본 작업을 막으면 안 됨 — 무시 (서버 로그로만)
  }
}

// ─────────────────────────────────────────────────────────────
// memory_write / memory_search — 중앙 공유 기억
// ─────────────────────────────────────────────────────────────

export type MemoryWriteInput = {
  agent: string
  content: string
  scope?: string
  kind?: string
  source_table?: string
  source_id?: string
  confidence?: number
  expires_days?: number
}

export async function handleMemoryWrite(input: MemoryWriteInput): Promise<string> {
  const agent = await resolveAgent(input.agent)
  const content = (input.content ?? '').trim()
  if (!content) throw new Error('content 필수')
  if (content.length > 2000) throw new Error('content 는 2000자 이내 (요약해서 저장)')

  const scope = input.scope ?? 'agent'
  const kind = input.kind ?? 'fact'
  const expiresAt = input.expires_days
    ? new Date(Date.now() + input.expires_days * 86400_000).toISOString()
    : null

  const rows = (await sbPost('agent_memories', {
    agent_id: scope === 'company' ? null : agent.id,
    scope,
    kind,
    content,
    source_table: input.source_table ?? null,
    source_id: input.source_id ?? null,
    confidence: input.confidence ?? 0.8,
    expires_at: expiresAt,
  })) as Array<{ id: string }>

  const id = rows[0]?.id ?? '?'

  // 시맨틱 recall 용 임베딩 즉시 생성 — 실패해도 저장은 유효(시간당 백필 크론이 소급).
  if (id !== '?') {
    try {
      const vec = await embedText(content, 'RETRIEVAL_DOCUMENT')
      if (vec) {
        await sbPatch(`agent_memories?id=eq.${encodeURIComponent(id)}`, {
          embedding: JSON.stringify(vec),
        })
      }
    } catch {
      // 백필 크론이 처리
    }
  }

  await logAction(agent.id, 'memory_write', content.slice(0, 120), 'agent_memories', id, {
    scope,
    kind,
  })
  return `기억 저장됨 (id: ${id}, scope: ${scope}, kind: ${kind})`
}

export type MemorySearchInput = {
  query: string
  agent?: string
  scope?: string
  limit?: number
}

function formatMemories(rows: Array<Record<string, unknown>>): string {
  return rows
    .map((r, i) => {
      const src = r.source_table
        ? ` [출처: ${r.source_table}/${String(r.source_id).slice(0, 8)}]`
        : ''
      return `${i + 1}. (${r.scope}/${r.kind}, 신뢰도 ${r.confidence}) ${r.content}${src}`
    })
    .join('\n')
}

export async function handleMemorySearch(input: MemorySearchInput): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30)
  const rawQuery = (input.query ?? '').trim()
  if (!rawQuery) throw new Error('query 필수')

  const agent = input.agent ? await resolveAgent(input.agent) : null

  // 1차: 시맨틱(의미) 검색 — 질문 임베딩 → match_agent_memories RPC.
  // 임베딩 실패·함수 미설치·0건이면 아래 ilike 키워드 검색으로 폴백(안 깨짐).
  try {
    const vec = await embedText(rawQuery, 'RETRIEVAL_QUERY')
    if (vec) {
      const rows = (await sbRpc('match_agent_memories', {
        query_embedding: JSON.stringify(vec),
        match_limit: limit,
        filter_agent: agent?.id ?? null,
        filter_scope: input.scope ?? null,
      })) as Array<Record<string, unknown>>
      if (rows.length > 0) return formatMemories(rows)
    }
  } catch {
    // RPC 미설치/실패 → 키워드 폴백
  }

  // 2차: 키워드(ilike) 폴백 — 임베딩 안 된 최신 기억도 잡는다.
  const q = encodeURIComponent(rawQuery)
  const conditions: string[] = [`content=ilike.*${q}*`, 'or=(expires_at.is.null,expires_at.gt.now)']
  if (input.scope) conditions.push(`scope=eq.${encodeURIComponent(input.scope)}`)
  if (agent) {
    const base = conditions.filter((c) => !c.startsWith('scope='))
    base.push(`or=(agent_id.eq.${agent.id},scope.eq.company)`)
    conditions.length = 0
    conditions.push(...base)
  }

  const rows = (await sbGet(
    `agent_memories?select=id,content,scope,kind,confidence,source_table,source_id,created_at` +
      `&${conditions.join('&')}&order=created_at.desc&limit=${limit}`
  )) as Array<Record<string, unknown>>

  if (rows.length === 0) return '일치하는 기억 없음.'
  return formatMemories(rows)
}

// ─────────────────────────────────────────────────────────────
// label_list / label_attach — 통제 어휘 라벨링
// ─────────────────────────────────────────────────────────────

export async function handleLabelList(input: { kind?: string }): Promise<string> {
  const cond = input.kind ? `&kind=eq.${encodeURIComponent(input.kind)}` : ''
  const rows = (await sbGet(
    `labels?select=slug,name,kind,description&is_active=eq.true${cond}&order=kind,slug`
  )) as Array<Record<string, string>>
  if (rows.length === 0) return '라벨 없음.'
  return rows.map((r) => `[${r.kind}] ${r.slug} — ${r.name}: ${r.description ?? ''}`).join('\n')
}

export type LabelAttachInput = {
  agent: string
  label_slug: string
  item_table: string
  item_id: string
  confidence?: number
}

const LABELABLE_TABLES = new Set([
  'inbox_documents',
  'tasks',
  'contacts',
  'activities',
  'agent_memories',
  'entities',
])

export async function handleLabelAttach(input: LabelAttachInput): Promise<string> {
  const agent = await resolveAgent(input.agent)
  if (!LABELABLE_TABLES.has(input.item_table)) {
    throw new Error(
      `라벨 부착 불가 테이블: ${input.item_table}. 가능: ${[...LABELABLE_TABLES].join(', ')}`
    )
  }
  const labels = (await sbGet(
    `labels?select=id,slug,name&slug=eq.${encodeURIComponent(input.label_slug)}&is_active=eq.true&limit=1`
  )) as Array<{ id: string; slug: string; name: string }>
  const label = labels[0]
  if (!label) {
    throw new Error(`라벨 "${input.label_slug}" 없음. label_list 도구로 통제 어휘를 먼저 확인.`)
  }

  await sbPost('item_labels?on_conflict=label_id,item_table,item_id', [
    {
      label_id: label.id,
      item_table: input.item_table,
      item_id: input.item_id,
      labeled_by: 'agent',
      actor_id: agent.id,
      confidence: input.confidence ?? null,
    },
  ])
  await logAction(
    agent.id,
    'label_attach',
    `${input.item_table}/${input.item_id.slice(0, 8)} ← ${label.name}`,
    input.item_table,
    input.item_id,
    { label: label.slug }
  )
  return `라벨 부착됨: ${input.item_table}/${input.item_id} ← ${label.name} (${label.slug})`
}

// ─────────────────────────────────────────────────────────────
// entity_link / entity_search — 맥락 그래프
// ─────────────────────────────────────────────────────────────

export type EntityLinkInput = {
  agent: string
  name: string
  kind: string
  summary?: string
  item_table?: string
  item_id?: string
  snippet?: string
}

export async function handleEntityLink(input: EntityLinkInput): Promise<string> {
  const agent = await resolveAgent(input.agent)
  const name = (input.name ?? '').trim()
  if (!name) throw new Error('name 필수')

  // upsert by (kind, lower(name)) — 먼저 조회
  const existing = (await sbGet(
    `entities?select=id,name&kind=eq.${encodeURIComponent(input.kind)}&name=ilike.${encodeURIComponent(name)}&limit=1`
  )) as Array<{ id: string; name: string }>

  let entityId: string
  let created = false
  if (existing[0]) {
    entityId = existing[0].id
  } else {
    const rows = (await sbPost('entities', {
      kind: input.kind,
      name,
      summary: input.summary ?? null,
    })) as Array<{ id: string }>
    entityId = rows[0]?.id ?? ''
    created = true
  }

  let mentionNote = ''
  if (input.item_table && input.item_id) {
    await sbPost('entity_mentions?on_conflict=entity_id,item_table,item_id', [
      {
        entity_id: entityId,
        item_table: input.item_table,
        item_id: input.item_id,
        snippet: input.snippet ?? null,
        noted_by: 'agent',
      },
    ])
    mentionNote = ` + ${input.item_table}/${input.item_id.slice(0, 8)} 연결`
  }

  await logAction(
    agent.id,
    'entity_link',
    `${input.kind}:${name}${created ? ' (신규)' : ''}${mentionNote}`,
    'entities',
    entityId
  )
  return `엔티티 ${created ? '생성' : '확인'}됨: ${name} (${input.kind}, id: ${entityId})${mentionNote}`
}

export async function handleEntitySearch(input: {
  query: string
  kind?: string
  limit?: number
}): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 10, 1), 30)
  const q = encodeURIComponent(input.query ?? '')
  if (!q) throw new Error('query 필수')
  const cond = input.kind ? `&kind=eq.${encodeURIComponent(input.kind)}` : ''
  const rows = (await sbGet(
    `entities?select=id,kind,name,summary,aliases&or=(name.ilike.*${q}*,summary.ilike.*${q}*)${cond}&limit=${limit}`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) return '일치하는 엔티티 없음.'
  return rows
    .map((r, i) => `${i + 1}. [${r.kind}] ${r.name} (id: ${r.id}) — ${r.summary ?? ''}`)
    .join('\n')
}

// ─────────────────────────────────────────────────────────────
// tasks_create — 에이전트가 할 일 등록
// ─────────────────────────────────────────────────────────────

export type TasksCreateInput = {
  agent: string
  title: string
  description?: string
  due_date?: string
  assignee_name?: string
}

export async function handleTasksCreate(input: TasksCreateInput): Promise<string> {
  const agent = await resolveAgent(input.agent)
  const title = (input.title ?? '').trim()
  if (!title) throw new Error('title 필수')
  if (input.due_date && !/^\d{4}-\d{2}-\d{2}$/.test(input.due_date)) {
    throw new Error('due_date 는 YYYY-MM-DD 형식')
  }

  let assigneeId: string | null = null
  let assigneeNote = ''
  if (input.assignee_name) {
    const members = (await sbGet(
      `members?select=id,name&name=ilike.*${encodeURIComponent(input.assignee_name)}*&limit=2`
    )) as Array<{ id: string; name: string }>
    if (members.length === 1) {
      assigneeId = members[0]!.id
      assigneeNote = ` → 담당 ${members[0]!.name}`
    } else if (members.length > 1) {
      throw new Error(
        `담당자 "${input.assignee_name}" 가 여러 명과 일치: ${members.map((m) => m.name).join(', ')}`
      )
    }
  }

  const rows = (await sbPost('tasks', {
    title: `[${agent.name}] ${title}`,
    description: input.description ?? null,
    due_date: input.due_date ?? null,
    assignee_id: assigneeId,
    status: 'todo',
  })) as Array<{ id: string }>

  const id = rows[0]?.id ?? '?'
  await logAction(agent.id, 'tasks_create', title, 'tasks', id, {
    due_date: input.due_date ?? null,
  })
  return `할 일 생성됨 (id: ${id}) [${agent.name}] ${title}${assigneeNote}${input.due_date ? ` · 마감 ${input.due_date}` : ''}`
}

// ─────────────────────────────────────────────────────────────
// agent_actions_recent — 감사 로그 조회 (사람·에이전트 공용)
// ─────────────────────────────────────────────────────────────

export async function handleAgentActionsRecent(input: {
  agent?: string
  limit?: number
}): Promise<string> {
  const limit = Math.min(Math.max(input.limit ?? 20, 1), 100)
  let cond = ''
  if (input.agent) {
    const agent = await resolveAgent(input.agent)
    cond = `&agent_id=eq.${agent.id}`
  }
  const rows = (await sbGet(
    `agent_actions?select=action,summary,target_table,success,created_at,agents(name)` +
      `${cond}&order=created_at.desc&limit=${limit}`
  )) as Array<Record<string, unknown>>
  if (rows.length === 0) return '기록된 에이전트 행동 없음.'
  return rows
    .map((r) => {
      const who = (r.agents as { name?: string } | null)?.name ?? '?'
      const ok = r.success === false ? ' ❌' : ''
      return `${String(r.created_at).slice(0, 16)} [${who}] ${r.action}: ${r.summary}${ok}`
    })
    .join('\n')
}
