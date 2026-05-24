-- ============================================================
-- 챗 원문 임시 적재 (chat_raw)
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전.
--
-- 비개발자 PC 가 Claude 데스크탑 챗 원문을 anon 키로 여기 올리고,
-- 태준 Mac 의 중앙 요약기(scripts/summarize-chat-raw.mjs)가 모아서 요약 →
-- claude_logs 에 기록한 뒤 summarized=true 로 표시한다.
-- ============================================================

create table if not exists public.chat_raw (
  id          bigint generated always as identity primary key,
  member      text not null,
  chunk_hash  text not null,
  content     text not null,
  summarized  boolean not null default false,
  created_at  timestamptz not null default now(),
  unique (member, chunk_hash)
);

create index if not exists chat_raw_pending_idx on public.chat_raw (summarized, created_at);

alter table public.chat_raw enable row level security;

-- 비개발자 PC(anon 키): 원문 insert 만 허용
drop policy if exists "chat_raw insert" on public.chat_raw;
create policy "chat_raw insert" on public.chat_raw
  for insert to anon with check (true);

-- 로그인한 멤버: 조회 가능
drop policy if exists "chat_raw select" on public.chat_raw;
create policy "chat_raw select" on public.chat_raw
  for select to authenticated using (true);

grant insert on public.chat_raw to anon;
grant select on public.chat_raw to authenticated;

-- 중앙 요약기는 service_role 로 update(summarized=true) → RLS 우회, 별도 정책 불필요.
