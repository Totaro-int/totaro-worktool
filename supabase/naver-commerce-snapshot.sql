-- ============================================================
-- 네이버 커머스 스냅샷 (naver_commerce_snapshot)
-- Supabase 프로젝트 > SQL Editor 에 붙여넣고 RUN 하세요.
-- 여러 번 실행해도 안전합니다 (idempotent).
--
-- 네이버 커머스 API 는 IP 화이트리스트로만 호출 가능하므로, Vercel(동적 IP)에서
-- 직접 호출할 수 없다. 화이트리스트에 등록된 머신(예: 태준 로컬 / VPS)에서
-- scripts/sync-naver-commerce.mjs 를 주기적으로 실행해 이 테이블에 결과를
-- 저장하고, /hub/naver 페이지는 여기서 읽어다 보여 준다.
--
-- 단일행(id=1) 구조. 매번 동일한 행을 update 한다.
-- ============================================================

create table if not exists public.naver_commerce_snapshot (
  id              int primary key default 1,
  order_count     int not null default 0,
  paid_revenue    numeric not null default 0,
  pending_revenue numeric not null default 0,
  synced_at       timestamptz not null default now(),
  error_message   text,
  constraint naver_commerce_snapshot_singleton check (id = 1)
);

insert into public.naver_commerce_snapshot (id) values (1) on conflict (id) do nothing;

alter table public.naver_commerce_snapshot enable row level security;

-- 로그인한 멤버는 누구나 읽고 쓸 수 있게 한다 (대시보드 조회 + 워커 service-role 쓰기).
drop policy if exists "naver_commerce_snapshot access" on public.naver_commerce_snapshot;
create policy "naver_commerce_snapshot access" on public.naver_commerce_snapshot
  for all to authenticated using (true) with check (true);
