-- ============================================================
-- Claude Code 작업 자동 기록 (claude_logs)
-- Supabase 프로젝트 > SQL Editor 에 전체를 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================

create table if not exists public.claude_logs (
  id          uuid primary key default gen_random_uuid(),
  member      text not null,
  summary     text not null,
  project     text,
  session_id  text,
  turn_count  integer not null default 0,
  occurred_at timestamptz not null default now()
);

create index if not exists claude_logs_occurred_idx
  on public.claude_logs (occurred_at desc);

-- ----- Row Level Security -----
alter table public.claude_logs enable row level security;

-- 로그인한 팀원: 조회 가능
drop policy if exists "claude_logs select" on public.claude_logs;
create policy "claude_logs select" on public.claude_logs
  for select to authenticated using (true);

-- 훅 스크립트(anon 키): 기록 추가만 허용 (작업 로그라 민감도 낮음)
drop policy if exists "claude_logs insert" on public.claude_logs;
create policy "claude_logs insert" on public.claude_logs
  for insert to anon with check (true);
