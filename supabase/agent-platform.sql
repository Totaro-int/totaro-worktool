-- ============================================================
-- Agent Data Platform v1 — Hermes 에이전트 호환 DB 업그레이드
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.
--
-- 설계 배경 (docs/agent-data-platform.md):
--   Hermes 의 자체 메모리는 VM 로컬 파일(MEMORY.md/USER.md)+SQLite.
--   회사 공유 두뇌가 아님 → 회사 지식·행동·라벨은 Supabase 에 중앙화하고
--   Hermes 는 MCP(HTTP) 로 읽고 쓴다.
--
-- 5개 계층:
--   ① agents          — 에이전트 신원 (사람 members 와 분리)
--   ② agent_actions   — 감사 로그 (에이전트가 한 모든 일)
--   ③ agent_memories  — 중앙 공유 메모리 (출처·신뢰도·만료 포함)
--   ④ labels + item_labels — 통제 어휘 라벨링 (8축 분류 시드 포함)
--   ⑤ entities + entity_mentions — 맥락 그래프 (문서↔거래처↔제품 연결)
-- ============================================================

create extension if not exists vector;
create extension if not exists pg_trgm;

-- ────────────────────────────────────────────────────────────
-- ① agents — 에이전트 신원
-- ────────────────────────────────────────────────────────────
create table if not exists public.agents (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,            -- 'kim-sahyun' 등 기계용 식별자
  name        text not null,                   -- '김사현'
  department  text,                            -- '마케팅부'
  role_description text,                       -- 시스템 프롬프트에 들어갈 역할 정의
  model       text,                            -- 'gemini-2.5-flash' 등
  status      text not null default 'active'
              check (status in ('active','paused','retired')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

drop trigger if exists agents_touch on public.agents;
create trigger agents_touch before update on public.agents
  for each row execute function public.touch_updated_at();

-- ────────────────────────────────────────────────────────────
-- ② agent_actions — 감사 로그
--    모든 MCP write tool 은 실행 결과를 여기 기록한다.
-- ────────────────────────────────────────────────────────────
create table if not exists public.agent_actions (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid references public.agents(id) on delete set null,
  action       text not null,                  -- tool 이름 ('tasks_create' 등)
  target_table text,                           -- 건드린 테이블
  target_id    text,                           -- 건드린 행 (uuid/문자 혼용 대비 text)
  summary      text not null,                  -- 사람이 읽는 한 줄
  payload      jsonb not null default '{}'::jsonb,  -- 입력 다이제스트 (민감값 제외)
  success      boolean not null default true,
  error        text,
  latency_ms   integer,
  created_at   timestamptz not null default now()
);

create index if not exists agent_actions_agent_idx
  on public.agent_actions (agent_id, created_at desc);
create index if not exists agent_actions_target_idx
  on public.agent_actions (target_table, target_id);

-- ────────────────────────────────────────────────────────────
-- ③ agent_memories — 중앙 공유 메모리
--    Hermes 로컬 MEMORY.md 의 회사판. 출처(provenance)·신뢰도·만료 필수.
--    scope: agent(개인) < team(부서) < company(전사 공유)
-- ────────────────────────────────────────────────────────────
create table if not exists public.agent_memories (
  id           uuid primary key default gen_random_uuid(),
  agent_id     uuid references public.agents(id) on delete cascade,  -- null = 전사 공유
  scope        text not null default 'agent'
               check (scope in ('agent','team','company')),
  kind         text not null default 'fact'
               check (kind in ('fact','preference','observation','procedure','insight')),
  content      text not null,
  source_table text,                           -- 어디서 알게 됐나 (inbox_documents 등)
  source_id    text,
  confidence   numeric not null default 0.8 check (confidence >= 0 and confidence <= 1),
  embedding    vector(768),                    -- 시맨틱 recall 용. 백필 잡이 채움
  expires_at   timestamptz,                    -- 시한부 사실 (예: 이벤트성 정보)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

drop trigger if exists agent_memories_touch on public.agent_memories;
create trigger agent_memories_touch before update on public.agent_memories
  for each row execute function public.touch_updated_at();

create index if not exists agent_memories_agent_idx
  on public.agent_memories (agent_id, created_at desc);
create index if not exists agent_memories_content_trgm
  on public.agent_memories using gin (content gin_trgm_ops);

-- ────────────────────────────────────────────────────────────
-- ④ labels — 통제 어휘 (라벨링 부족 해결의 핵심)
--    description 은 에이전트가 라벨 고를 때 읽는 정의문 — 비워두지 말 것.
-- ────────────────────────────────────────────────────────────
create table if not exists public.labels (
  id          uuid primary key default gen_random_uuid(),
  slug        text not null unique,
  name        text not null,
  kind        text not null
              check (kind in ('axis','doc_type','topic','department','status')),
  parent_slug text,                            -- 계층 (axis 하위 topic 등)
  description text,                            -- 에이전트용 정의문
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists labels_kind_idx on public.labels (kind) where is_active;

-- 8축 분류 시드 (기존 Drive 폴더 체계와 1:1)
insert into public.labels (slug, name, kind, description) values
  ('axis-01-ai-sourcing',   '01 AI 소싱 플랫폼',   'axis', 'WEB-taro 소싱 플랫폼 관련 (바이어·공급사 매칭, PoC)'),
  ('axis-03-supplier-ops',  '03 공급사 운영',      'axis', '공급사 발굴·계약·관리 문서'),
  ('axis-04-buyer-ops',     '04 바이어 운영',      'axis', '바이어 발굴·연결·수출 문서'),
  ('axis-05-marketing',     '05 마케팅·콘텐츠',    'axis', '카드뉴스·블로그·광고·트렌드 조사물'),
  ('axis-06-company-ops',   '06 회사 운영',        'axis', '재무·법무·인사·정부지원 등 내부 운영'),
  ('axis-07-agent-build',   '07 에이전트 제작 외주', 'axis', '판매용 AI 에이전트 제작·납품 프로젝트'),
  ('axis-08-ecommerce',     '08 E커머스',          'axis', '자사몰·스마트스토어 판매 운영'),
  ('axis-99-unsorted',      '99 분류미정',         'axis', '아직 분류 안 된 항목 — 에이전트가 주기적으로 재분류')
on conflict (slug) do nothing;

-- 문서 유형 시드
insert into public.labels (slug, name, kind, description) values
  ('doc-contract',  '계약서',  'doc_type', '서명이 들어가는 법적 합의문'),
  ('doc-quote',     '견적서',  'doc_type', '가격 제안 문서'),
  ('doc-invoice',   '인보이스','doc_type', '청구·정산 문서'),
  ('doc-card',      '명함',    'doc_type', '인적 연락처 원본'),
  ('doc-notice',    '공고문',  'doc_type', '정부지원·입찰 등 외부 공고'),
  ('doc-report',    '보고서',  'doc_type', '조사·분석 결과물 (트렌드 다이제스트 포함)'),
  ('doc-minutes',   '회의록',  'doc_type', '회의 기록'),
  ('doc-etc',       '기타',    'doc_type', '위 어디에도 안 맞는 문서')
on conflict (slug) do nothing;

-- 부서 시드
insert into public.labels (slug, name, kind, description) values
  ('dept-marketing', '마케팅부', 'department', '트렌드 조사·콘텐츠 제작·업로드'),
  ('dept-dev',       '개발부',   'department', '웹·자사몰·홈페이지 개발과 오류 대응'),
  ('dept-ops',       '운영부',   'department', '정부지원·사업계획·재무 회계')
on conflict (slug) do nothing;

-- ────────────────────────────────────────────────────────────
-- item_labels — 폴리모픽 라벨 조인 (기존 테이블 변경 없이 라벨링)
-- ────────────────────────────────────────────────────────────
create table if not exists public.item_labels (
  id          uuid primary key default gen_random_uuid(),
  label_id    uuid not null references public.labels(id) on delete cascade,
  item_table  text not null,                   -- 'inbox_documents' | 'tasks' | 'contacts' ...
  item_id     uuid not null,
  labeled_by  text not null default 'agent'
              check (labeled_by in ('human','agent','system')),
  actor_id    uuid,                            -- members.id 또는 agents.id
  confidence  numeric check (confidence >= 0 and confidence <= 1),
  created_at  timestamptz not null default now(),
  unique (label_id, item_table, item_id)
);

create index if not exists item_labels_item_idx
  on public.item_labels (item_table, item_id);

-- ────────────────────────────────────────────────────────────
-- ⑤ entities — 맥락 그래프 노드 (회사·사람·제품·지원사업)
-- ────────────────────────────────────────────────────────────
create table if not exists public.entities (
  id             uuid primary key default gen_random_uuid(),
  kind           text not null
                 check (kind in ('company','person','product','gov_program','platform','other')),
  name           text not null,
  aliases        text[] not null default '{}',
  external_table text,                         -- 'contacts' 등 원본 행 연결
  external_id    uuid,
  summary        text,                         -- 에이전트가 읽는 한 줄 정의
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);

drop trigger if exists entities_touch on public.entities;
create trigger entities_touch before update on public.entities
  for each row execute function public.touch_updated_at();

create unique index if not exists entities_kind_name_uniq
  on public.entities (kind, lower(name));
create index if not exists entities_name_trgm
  on public.entities using gin (name gin_trgm_ops);

-- entity_mentions — 항목↔엔티티 연결 (맥락 분석의 결과물)
create table if not exists public.entity_mentions (
  id         uuid primary key default gen_random_uuid(),
  entity_id  uuid not null references public.entities(id) on delete cascade,
  item_table text not null,
  item_id    uuid not null,
  snippet    text,                             -- 맥락 발췌 (왜 연결됐나)
  noted_by   text not null default 'agent' check (noted_by in ('human','agent','system')),
  created_at timestamptz not null default now(),
  unique (entity_id, item_table, item_id)
);

create index if not exists entity_mentions_item_idx
  on public.entity_mentions (item_table, item_id);

-- ────────────────────────────────────────────────────────────
-- RLS — 사람은 투명하게 읽고, 쓰기는 MCP 서버(service_role)만
-- ────────────────────────────────────────────────────────────
alter table public.agents          enable row level security;
alter table public.agent_actions   enable row level security;
alter table public.agent_memories  enable row level security;
alter table public.labels          enable row level security;
alter table public.item_labels     enable row level security;
alter table public.entities        enable row level security;
alter table public.entity_mentions enable row level security;

do $$
declare t text;
begin
  foreach t in array array['agents','agent_actions','agent_memories','labels','item_labels','entities','entity_mentions']
  loop
    execute format('drop policy if exists "%s_read" on public.%I', t, t);
    execute format(
      'create policy "%s_read" on public.%I for select to authenticated using (true)', t, t);
    -- 쓰기 정책은 만들지 않음 → anon/authenticated 쓰기 불가, service_role 은 RLS 우회
  end loop;
end $$;

-- 시드: 에이전트 직원 3명 등록 (모델은 운영하며 갱신)
insert into public.agents (slug, name, department, role_description, model) values
  ('kim-sahyun', '김사현', '마케팅부',
   '매일 PoC·E커머스 콘텐츠 트렌드를 조사해 다이제스트를 보고하고, 승인된 소재로 콘텐츠 초안을 만든다.',
   'gemini-2.5-flash'),
  ('choi-jian', '최지안', '개발부',
   '매일 Web.Totaro·자사몰·홈페이지 헬스체크를 돌리고, 오류를 발견하면 진단 리포트와 수정 PR 초안을 만든다.',
   'gemini-2.5-flash'),
  ('sim-jaehak', '심재학', '운영부',
   '매일 정부지원사업 공고를 회사 프로필과 대조해 해당 건을 보고하고, 마감일을 캘린더에 등록한다.',
   'gemini-2.5-flash')
on conflict (slug) do nothing;

notify pgrst, 'reload schema';
