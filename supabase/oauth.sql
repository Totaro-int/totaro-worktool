-- MCP 원격 — OAuth 2.1 (PKCE + DCR) 저장소.
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.
--
-- 목적: claude.ai Custom Connector 가 표준 OAuth 흐름으로 토타로 워크툴 MCP 에 인증.
--   - oauth_clients: 동적 클라이언트 등록 (RFC 7591)
--   - oauth_codes:   짧은 수명 인가 코드 + PKCE challenge (RFC 7636)
--   - oauth_tokens:  접근 토큰 (해시만 저장 — raw 토큰은 발급 직후 한 번만 노출)
--
-- 사용자 묶음: auth.users 의 id 를 참조 (Supabase Auth 와 한 몸).

-- ─────────────────────────────────────────────────────────────
-- 등록된 OAuth 클라이언트
-- ─────────────────────────────────────────────────────────────
create table if not exists public.oauth_clients (
  client_id      text primary key,
  client_name    text not null,
  redirect_uris  text[] not null,
  metadata       jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);
comment on table public.oauth_clients is
  'OAuth 2.1 클라이언트 (RFC 7591 동적 등록). PKCE public client — secret 없음.';

-- ─────────────────────────────────────────────────────────────
-- 인가 코드 (~10분 수명)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.oauth_codes (
  code_hash             text primary key,
  client_id             text not null references public.oauth_clients(client_id) on delete cascade,
  user_id               uuid not null references auth.users(id) on delete cascade,
  redirect_uri          text not null,
  code_challenge        text not null,
  code_challenge_method text not null default 'S256',
  scope                 text,
  expires_at            timestamptz not null,
  created_at            timestamptz not null default now()
);
create index if not exists oauth_codes_expires_idx
  on public.oauth_codes (expires_at);
comment on table public.oauth_codes is
  '단일 사용 인가 코드. 토큰 교환 직후 삭제. PKCE code_challenge 같이 보관.';

-- ─────────────────────────────────────────────────────────────
-- 접근 토큰 (~30일 수명)
-- ─────────────────────────────────────────────────────────────
create table if not exists public.oauth_tokens (
  token_hash text primary key,
  client_id  text not null references public.oauth_clients(client_id) on delete cascade,
  user_id    uuid not null references auth.users(id) on delete cascade,
  scope      text,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index if not exists oauth_tokens_expires_idx
  on public.oauth_tokens (expires_at);
create index if not exists oauth_tokens_user_idx
  on public.oauth_tokens (user_id);
comment on table public.oauth_tokens is
  '발급된 access token (해시만 저장). 만료 후 cleanup.';

-- ─────────────────────────────────────────────────────────────
-- RLS — 서버 (service_role) 만 접근. 일반 사용자 쿼리 차단.
-- ─────────────────────────────────────────────────────────────
alter table public.oauth_clients enable row level security;
alter table public.oauth_codes   enable row level security;
alter table public.oauth_tokens  enable row level security;

-- 정책: 어떤 정책도 추가 안 함 → authenticated/anon 은 select·insert 다 거부.
-- service_role 키만 우회 (Vercel 서버 액션에서 사용).

-- ─────────────────────────────────────────────────────────────
-- 만료 청소 (선택 — 주기 cron 없으면 수동 실행)
-- ─────────────────────────────────────────────────────────────
create or replace function public.oauth_cleanup_expired() returns void
language sql security definer set search_path = public, pg_temp
as $$
  delete from public.oauth_codes  where expires_at < now();
  delete from public.oauth_tokens where expires_at < now();
$$;
