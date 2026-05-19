-- ============================================================
-- 네이버 마케팅 KPI 목표 (naver_kpi)
-- Supabase 프로젝트 > SQL Editor 에 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
--
-- "마케팅 비용 대비 예상 매출량" 목표를 직접 지정하는 단일 행 테이블.
-- target_roas = 목표 ROAS(%). 예: 400 이면 광고비의 4배 매출이 목표.
-- ============================================================

create table if not exists public.naver_kpi (
  id          int primary key default 1,
  target_roas numeric not null default 400,
  updated_at  timestamptz not null default now(),
  updated_by  uuid references public.members(id) on delete set null,
  constraint naver_kpi_singleton check (id = 1)
);

insert into public.naver_kpi (id) values (1) on conflict (id) do nothing;

alter table public.naver_kpi enable row level security;

drop policy if exists "naver_kpi access" on public.naver_kpi;
create policy "naver_kpi access" on public.naver_kpi
  for all to authenticated using (true) with check (true);
