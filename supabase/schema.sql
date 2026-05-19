-- ============================================================
-- Totaro 업무관리 툴 — 데이터베이스 스키마
-- Supabase 프로젝트 > SQL Editor 에 전체를 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================

-- ----- 멤버 (auth.users 와 1:1) -----
create table if not exists public.members (
  id         uuid primary key references auth.users(id) on delete cascade,
  email      text not null,
  name       text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

-- ----- 사업 영역 -----
create table if not exists public.work_areas (
  id         text primary key,
  name       text not null,
  color      text not null default '#64748b',
  sort_order int  not null default 0
);

insert into public.work_areas (id, name, color, sort_order) values
  ('ai_branding',  'AI 브랜딩',        '#6366f1', 1),
  ('b2b_sourcing', 'B2B 소싱 AI',      '#0ea5e9', 2),
  ('ai_agent',     'AI 에이전트 판매', '#10b981', 3)
on conflict (id) do nothing;

-- ----- 할 일 -----
create table if not exists public.tasks (
  id           uuid primary key default gen_random_uuid(),
  title        text not null,
  description  text,
  work_area_id text references public.work_areas(id),
  assignee_id  uuid references public.members(id) on delete set null,
  status       text not null default 'todo' check (status in ('todo','doing','done')),
  due_date     date,
  created_by   uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

-- ----- 통합 활동 피드 -----
create table if not exists public.activities (
  id           uuid primary key default gen_random_uuid(),
  member_id    uuid references public.members(id) on delete set null,
  work_area_id text references public.work_areas(id),
  source       text not null default 'manual'
               check (source in ('manual','github','naver','document','task')),
  title        text not null,
  description  text,
  url          text,
  metadata     jsonb not null default '{}'::jsonb,
  occurred_at  timestamptz not null default now(),
  created_at   timestamptz not null default now()
);
create index if not exists activities_occurred_at_idx
  on public.activities (occurred_at desc);

-- ----- 문서 -----
create table if not exists public.documents (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  storage_path text not null,
  work_area_id text references public.work_areas(id),
  description  text,
  file_size    bigint,
  mime_type    text,
  uploaded_by  uuid references public.members(id) on delete set null,
  created_at   timestamptz not null default now()
);

-- ============================================================
-- 신규 가입자 → members 자동 생성/갱신
-- ============================================================
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.members (id, email, name, avatar_url)
  values (
    new.id,
    coalesce(new.email, ''),
    coalesce(
      new.raw_user_meta_data->>'full_name',
      new.raw_user_meta_data->>'name',
      split_part(coalesce(new.email, 'user'), '@', 1)
    ),
    coalesce(
      new.raw_user_meta_data->>'avatar_url',
      new.raw_user_meta_data->>'picture'
    )
  )
  on conflict (id) do update
    set email      = excluded.email,
        name       = excluded.name,
        avatar_url = excluded.avatar_url;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ----- tasks.updated_at 자동 갱신 -----
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tasks_set_updated_at on public.tasks;
create trigger tasks_set_updated_at
  before update on public.tasks
  for each row execute function public.set_updated_at();

-- ============================================================
-- Row Level Security — 로그인한 멤버는 전부 읽기/쓰기 (3인 내부 툴)
-- ============================================================
alter table public.members    enable row level security;
alter table public.work_areas enable row level security;
alter table public.tasks      enable row level security;
alter table public.activities enable row level security;
alter table public.documents  enable row level security;

drop policy if exists "members access"    on public.members;
drop policy if exists "work_areas read"   on public.work_areas;
drop policy if exists "tasks access"      on public.tasks;
drop policy if exists "activities access" on public.activities;
drop policy if exists "documents access"  on public.documents;

create policy "members access"    on public.members    for all    to authenticated using (true) with check (true);
create policy "work_areas read"   on public.work_areas for select to authenticated using (true);
create policy "tasks access"      on public.tasks      for all    to authenticated using (true) with check (true);
create policy "activities access" on public.activities for all    to authenticated using (true) with check (true);
create policy "documents access"  on public.documents  for all    to authenticated using (true) with check (true);

-- ============================================================
-- Storage — 문서 버킷 (비공개)
-- ============================================================
insert into storage.buckets (id, name, public)
values ('documents', 'documents', false)
on conflict (id) do nothing;

drop policy if exists "documents bucket read"   on storage.objects;
drop policy if exists "documents bucket insert" on storage.objects;
drop policy if exists "documents bucket delete" on storage.objects;

create policy "documents bucket read"   on storage.objects for select to authenticated using (bucket_id = 'documents');
create policy "documents bucket insert" on storage.objects for insert to authenticated with check (bucket_id = 'documents');
create policy "documents bucket delete" on storage.objects for delete to authenticated using (bucket_id = 'documents');
