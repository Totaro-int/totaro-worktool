-- ============================================================
-- 마케팅 에이전트 관리 (/hub/agent 대시보드)
-- Supabase 프로젝트 > SQL Editor 에 전체를 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
-- ============================================================

create table if not exists public.marketing_agents (
  id          uuid primary key default gen_random_uuid(),
  name        text not null,
  status      text not null default 'active'
              check (status in ('active','onboarding','paused')),
  client_name text,
  monthly_fee integer not null default 0,
  note        text,
  created_at  timestamptz not null default now()
);

-- ----- Row Level Security (기존 테이블과 동일 정책) -----
alter table public.marketing_agents enable row level security;

drop policy if exists "marketing_agents access" on public.marketing_agents;
create policy "marketing_agents access" on public.marketing_agents
  for all to authenticated using (true) with check (true);

-- ----- 샘플 데이터 (테이블이 비어 있을 때만 1회 삽입) -----
insert into public.marketing_agents (name, status, client_name, monthly_fee, note)
select * from (values
  ('인스타 콘텐츠 에이전트',      'active',     '코코브릭', 350000, '릴스 주 3회 자동 생성·게시'),
  ('블로그 SEO 에이전트',         'active',     '하루담',   280000, '키워드 리서치 + 초안 작성'),
  ('네이버 광고 최적화 에이전트', 'onboarding', null,       0,      '데모 진행 중 — 6월 도입 예정'),
  ('리뷰 응대 에이전트',          'paused',     '온뜰',     150000, '시즌 종료로 일시중지')
) as seed(name, status, client_name, monthly_fee, note)
where not exists (select 1 from public.marketing_agents);
