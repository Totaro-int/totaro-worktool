-- 회사 연락처 (명함 OCR + Google Contacts 연동 준비).
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.

create table if not exists public.contacts (
  id uuid primary key default gen_random_uuid(),
  -- 핵심 필드
  name        text not null,
  company     text,
  title       text,
  phone       text,
  mobile      text,
  email       text,
  website     text,
  address     text,
  memo        text,
  -- 명함 이미지 — Supabase Storage 의 business-cards 버킷 path
  card_storage_path text,
  -- OCR 메타
  extracted_by_ai          boolean default false,
  extraction_confidence    numeric,
  extraction_raw           jsonb,
  -- Google Contacts 연동 준비 (Phase 2)
  google_resource_name     text,
  google_synced_at         timestamptz,
  -- 메타
  created_by uuid references public.members(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists contacts_name_idx    on public.contacts (lower(name));
create index if not exists contacts_company_idx on public.contacts (lower(company));
create index if not exists contacts_email_idx   on public.contacts (lower(email));
create index if not exists contacts_created_idx on public.contacts (created_at desc);

-- RLS — 로그인 사용자는 모두 읽고 쓰기
alter table public.contacts enable row level security;
drop policy if exists "contacts access" on public.contacts;
create policy "contacts access" on public.contacts for all to authenticated using (true) with check (true);

-- Storage 버킷 (명함 이미지 — 비공개)
insert into storage.buckets (id, name, public)
values ('business-cards', 'business-cards', false)
on conflict (id) do nothing;

drop policy if exists "cards read"   on storage.objects;
drop policy if exists "cards insert" on storage.objects;
drop policy if exists "cards delete" on storage.objects;

create policy "cards read"   on storage.objects for select to authenticated using (bucket_id = 'business-cards');
create policy "cards insert" on storage.objects for insert to authenticated with check (bucket_id = 'business-cards');
create policy "cards delete" on storage.objects for delete to authenticated using (bucket_id = 'business-cards');

-- updated_at 자동 트리거 (이미 있으면 재사용)
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

drop trigger if exists contacts_touch on public.contacts;
create trigger contacts_touch before update on public.contacts
for each row execute function public.touch_updated_at();
