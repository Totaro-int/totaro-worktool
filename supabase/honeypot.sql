-- ============================================================
-- Honeypot — AI 크롤러 측정용 테이블
-- AEO/GEO Reverse Engineering Playbook의 Method 4·5 data layer
-- 멱등 (여러 번 실행 안전)
-- ============================================================

create table if not exists public.honeypot_hits (
  id              uuid        primary key default gen_random_uuid(),
  honeypot_id     text        not null,
  variant         text        not null,
  method          text,
  url             text,
  query           jsonb       not null default '{}'::jsonb,
  ip              text,
  user_agent      text,
  referer         text,
  accept          text,
  accept_language text,
  accept_encoding text,
  cf_ray          text,
  x_forwarded_for text,
  headers         jsonb       not null default '{}'::jsonb,
  status_returned int,
  bytes_returned  int,
  response_ms     int,
  hit_at          timestamptz not null default now()
);

create index if not exists honeypot_hits_hit_at_idx
  on public.honeypot_hits (hit_at desc);
create index if not exists honeypot_hits_variant_hit_at_idx
  on public.honeypot_hits (variant, hit_at desc);
create index if not exists honeypot_hits_user_agent_idx
  on public.honeypot_hits (user_agent);
create index if not exists honeypot_hits_honeypot_id_idx
  on public.honeypot_hits (honeypot_id);

-- ----- RLS: 인증된 멤버는 읽기, 쓰기는 service_role 만 -----
alter table public.honeypot_hits enable row level security;

drop policy if exists "honeypot_hits read" on public.honeypot_hits;
create policy "honeypot_hits read"
  on public.honeypot_hits
  for select
  to authenticated
  using (true);

-- service_role 은 RLS 우회 — 별도 정책 불필요
-- 익명 insert 는 명시적으로 막혀있음 (정책 없음 + RLS on)
