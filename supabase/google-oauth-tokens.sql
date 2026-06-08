-- 사용자별 Google OAuth 토큰 (People API 동기화용).
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.

create table if not exists public.google_oauth_tokens (
  user_id       uuid primary key references auth.users(id) on delete cascade,
  provider      text not null default 'google_contacts',
  access_token  text not null,
  refresh_token text,
  scope         text,
  expires_at    timestamptz,
  email         text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

create index if not exists google_oauth_expires_idx on public.google_oauth_tokens (expires_at);

alter table public.google_oauth_tokens enable row level security;
-- service_role 만 접근 (서버 액션에서만 사용). 일반 사용자는 못 봄.
drop policy if exists "tokens noop" on public.google_oauth_tokens;

create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists google_tokens_touch on public.google_oauth_tokens;
create trigger google_tokens_touch before update on public.google_oauth_tokens
for each row execute function public.touch_updated_at();

-- contacts 테이블에 동기 메타 (이미 있으면 무시)
alter table public.contacts add column if not exists google_resource_name text;
alter table public.contacts add column if not exists google_synced_at timestamptz;
alter table public.contacts add column if not exists google_sync_error text;

notify pgrst, 'reload schema';
