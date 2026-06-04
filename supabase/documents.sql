-- 내부 AI 우편실 v0 — 스키마
-- 적용: Supabase 대시보드 SQL Editor 에 통째로 붙여넣고 실행
-- 설계 문서: docs/internal-mailroom-v0.md

-- ─────────────────────────────────────────────────────────────────────
-- 1) documents — 업로드된 문서의 메타·인덱스
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.documents (
  id uuid primary key default gen_random_uuid(),
  filename text not null,
  description text,
  drive_file_id text unique,
  drive_folder_id text,
  folder_path text,
  size_bytes bigint,
  mime_type text,
  uploaded_by uuid references public.members(id),
  classified_by_ai boolean default false,
  classification_confidence numeric,
  ai_reasoning text,
  doc_type text,
  notify_users uuid[] default '{}',
  status text default 'pending'
    check (status in ('pending','classified','confirmed','rejected','failed','trashed')),
  created_at timestamptz default now(),
  updated_at timestamptz default now()
);

create index if not exists documents_status_created_idx
  on public.documents (status, created_at desc);
create index if not exists documents_uploader_idx
  on public.documents (uploaded_by, created_at desc);
create index if not exists documents_folder_idx
  on public.documents (folder_path);

-- updated_at 자동 갱신
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists documents_touch on public.documents;
create trigger documents_touch
  before update on public.documents
  for each row execute function public.touch_updated_at();

-- ─────────────────────────────────────────────────────────────────────
-- 2) document_moves — 이동·이름변경 감사 로그 (undo 기능 지원)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.document_moves (
  id uuid primary key default gen_random_uuid(),
  document_id uuid references public.documents(id) on delete cascade,
  from_folder_path text,
  to_folder_path text,
  moved_by uuid references public.members(id),
  reason text,
  reversible_until timestamptz default (now() + interval '1 hour'),
  reverted boolean default false,
  created_at timestamptz default now()
);

create index if not exists document_moves_doc_idx
  on public.document_moves (document_id, created_at desc);
create index if not exists document_moves_reversible_idx
  on public.document_moves (reversible_until)
  where reverted = false;

-- ─────────────────────────────────────────────────────────────────────
-- 3) notifications — 인앱 알림 (워크허브 헤더 빨간 점용)
-- ─────────────────────────────────────────────────────────────────────
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.members(id) not null,
  type text not null,
  related_table text,
  related_id uuid,
  title text not null,
  body text,
  link text,
  read_at timestamptz,
  created_at timestamptz default now()
);

create index if not exists notifications_unread_idx
  on public.notifications (recipient_id, created_at desc)
  where read_at is null;
create index if not exists notifications_recipient_idx
  on public.notifications (recipient_id, created_at desc);

-- ─────────────────────────────────────────────────────────────────────
-- 4) RLS — Row Level Security 정책
-- ─────────────────────────────────────────────────────────────────────
alter table public.documents enable row level security;
alter table public.document_moves enable row level security;
alter table public.notifications enable row level security;

-- documents: 인증된 멤버 모두 read/write (v0 단순 권한 풀)
drop policy if exists documents_auth_read on public.documents;
create policy documents_auth_read on public.documents
  for select using (auth.role() = 'authenticated');

drop policy if exists documents_auth_insert on public.documents;
create policy documents_auth_insert on public.documents
  for insert with check (auth.role() = 'authenticated');

drop policy if exists documents_auth_update on public.documents;
create policy documents_auth_update on public.documents
  for update using (auth.role() = 'authenticated');

-- document_moves: 인증 멤버 read·write
drop policy if exists moves_auth_read on public.document_moves;
create policy moves_auth_read on public.document_moves
  for select using (auth.role() = 'authenticated');

drop policy if exists moves_auth_insert on public.document_moves;
create policy moves_auth_insert on public.document_moves
  for insert with check (auth.role() = 'authenticated');

drop policy if exists moves_auth_update on public.document_moves;
create policy moves_auth_update on public.document_moves
  for update using (auth.role() = 'authenticated');

-- notifications: 본인 것만 read·update, write 는 service_role 또는 인증 멤버
drop policy if exists notif_own_read on public.notifications;
create policy notif_own_read on public.notifications
  for select using (recipient_id = auth.uid());

drop policy if exists notif_auth_insert on public.notifications;
create policy notif_auth_insert on public.notifications
  for insert with check (auth.role() in ('authenticated','service_role'));

drop policy if exists notif_own_update on public.notifications;
create policy notif_own_update on public.notifications
  for update using (recipient_id = auth.uid());

-- ─────────────────────────────────────────────────────────────────────
-- 끝. 적용 검증: 아래 쿼리로 확인
--   select tablename from pg_tables where schemaname='public'
--     and tablename in ('documents','document_moves','notifications');
-- 세 줄 다 나오면 성공.
-- ─────────────────────────────────────────────────────────────────────
