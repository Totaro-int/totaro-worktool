-- 멀티데이(여러 날) 작업 — 캘린더에서 기간 막대로 표시.
-- start_date..due_date 가 작업 기간. start_date 없으면 due_date 하루짜리(기존 동작 유지).
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전(멱등).

alter table public.tasks add column if not exists start_date date;

-- 가시 범위 겹침 조회용 인덱스.
create index if not exists tasks_start_date_idx
  on public.tasks (start_date)
  where start_date is not null;
