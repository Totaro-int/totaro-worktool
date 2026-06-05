-- ============================================================
-- AI 직원 대화 기록 (assistant_messages)
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전.
--
-- /assistant (AI 직원) 채팅을 사용자별로 저장해서 새로고침해도 유지된다.
-- 사용자당 하나의 진행 중 대화(롤링). "새 대화" 누르면 본인 기록만 삭제.
-- RLS 로 본인 메시지만 보고/쓰고/지운다.
-- ============================================================

create table if not exists public.assistant_messages (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null default '',
  sources     jsonb,
  created_at  timestamptz not null default now()
);

create index if not exists assistant_messages_user_created_idx
  on public.assistant_messages (user_id, created_at);

alter table public.assistant_messages enable row level security;

-- 본인 기록만 조회
drop policy if exists "assistant_messages own select" on public.assistant_messages;
create policy "assistant_messages own select" on public.assistant_messages
  for select to authenticated using (auth.uid() = user_id);

-- 본인 기록만 추가
drop policy if exists "assistant_messages own insert" on public.assistant_messages;
create policy "assistant_messages own insert" on public.assistant_messages
  for insert to authenticated with check (auth.uid() = user_id);

-- 본인 기록만 삭제("새 대화")
drop policy if exists "assistant_messages own delete" on public.assistant_messages;
create policy "assistant_messages own delete" on public.assistant_messages
  for delete to authenticated using (auth.uid() = user_id);

grant select, insert, delete on public.assistant_messages to authenticated;
