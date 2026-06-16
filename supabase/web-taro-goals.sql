-- WEB-taro 목표 보드 — 기한이 있는 칸반 할 일 테이블.
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.
-- 정적 목표(식품 중소 제조업체 DX·AX 혁신 / 매출 증대)는 페이지에 상수로 표시되며,
-- 이 테이블은 그 목표를 향한 실행 할 일(마감일 포함)만 담는다.

create table if not exists public.web_taro_tasks (
  id          uuid primary key default gen_random_uuid(),
  title       text not null,
  description text,
  status      text not null default 'todo' check (status in ('todo','doing','done')),
  due_date    date,
  created_by  uuid references public.members(id) on delete set null,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

create index if not exists web_taro_tasks_status_idx
  on public.web_taro_tasks (status);

-- updated_at 자동 갱신 (set_updated_at 함수는 schema.sql 에서 이미 생성됨).
drop trigger if exists web_taro_tasks_set_updated_at on public.web_taro_tasks;
create trigger web_taro_tasks_set_updated_at
  before update on public.web_taro_tasks
  for each row execute function public.set_updated_at();

-- RLS — 로그인한 멤버는 전부 읽기/쓰기 (3인 내부 툴, 기존 테이블과 동일 정책).
alter table public.web_taro_tasks enable row level security;

drop policy if exists "web_taro_tasks access" on public.web_taro_tasks;
create policy "web_taro_tasks access" on public.web_taro_tasks
  for all to authenticated using (true) with check (true);

-- ----- 초기 ERP 모듈 작업 시드 (할 일 칸반에 카드로 등록) -----
-- 같은 제목이 이미 있으면 건너뛴다 → 여러 번 실행해도 중복 생성 안 됨.
insert into public.web_taro_tasks (title, description, status)
select v.title, v.description, 'todo'
from (values
  ('업무 관리 캘린더', '제조사 일정·작업 배정을 한눈에 보는 캘린더 모듈'),
  ('이메일 관리', '바이어·거래처 이메일 수발신 및 자동 분류 관리'),
  ('생산 일지', '일별 생산량·라인 가동·불량률 기록'),
  ('업무 일지', '담당자별 일일 업무 기록 및 인수인계'),
  ('재고 관리 ERP', '원자재·완제품 입출고 및 실시간 재고 수량 관리')
) as v(title, description)
where not exists (
  select 1 from public.web_taro_tasks w where w.title = v.title
);

notify pgrst, 'reload schema';
