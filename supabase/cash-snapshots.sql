-- 일별 잔고 스냅샷 — 회사 가용 현금 한 줄 매일 기록.
-- 차후 하나 오픈플랫폼 / 오픈뱅킹 API 연동되면 source='manual' → 'hana_api' 로 교체.
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.

create table if not exists public.cash_snapshots (
  id          uuid primary key default gen_random_uuid(),
  as_of_date  date not null,
  balance_krw bigint not null,                 -- 원 단위. 1억 = 100,000,000.
  bank_name   text default '하나은행',
  account_alias text,                           -- "주거래", "마케팅" 등 별칭 (선택)
  note        text,
  source      text not null default 'manual'
              check (source in ('manual','hana_api','openbanking')),
  recorded_by uuid references auth.users(id) on delete set null,
  created_at  timestamptz not null default now()
);

-- 같은 날짜 + 같은 계좌 별칭 조합은 한 번만 (수동 입력 실수 방지).
create unique index if not exists cash_snapshots_day_alias_uniq
  on public.cash_snapshots (as_of_date, coalesce(account_alias, ''));

create index if not exists cash_snapshots_recent_idx
  on public.cash_snapshots (as_of_date desc);

alter table public.cash_snapshots enable row level security;

drop policy if exists cash_auth_read on public.cash_snapshots;
create policy cash_auth_read on public.cash_snapshots
  for select using (auth.role() = 'authenticated');

drop policy if exists cash_auth_insert on public.cash_snapshots;
create policy cash_auth_insert on public.cash_snapshots
  for insert with check (auth.role() = 'authenticated');

drop policy if exists cash_auth_update on public.cash_snapshots;
create policy cash_auth_update on public.cash_snapshots
  for update using (auth.role() = 'authenticated');

drop policy if exists cash_auth_delete on public.cash_snapshots;
create policy cash_auth_delete on public.cash_snapshots
  for delete using (auth.role() = 'authenticated');

notify pgrst, 'reload schema';
