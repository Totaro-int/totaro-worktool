-- 우편실(inbox_documents) — 본문 발췌 캐시 컬럼.
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.
--
-- 목적:
--   AI 직원 검색에서 매 질문마다 Drive 에서 PDF/DOCX 받아 파싱하던 비용 제거.
--   인덱싱 시점에 1500자 발췌를 컬럼에 저장 → 질문 처리는 단일 Supabase 쿼리로 끝.
--   첫 토큰까지의 지연 시간 약 1.2~4초 → < 1초 목표.
--
-- 채우는 방법: npm run backfill:excerpts (전체 1회만, 이후 백필 스크립트가 빈 행만 처리)

alter table public.inbox_documents
  add column if not exists body_excerpt text;

comment on column public.inbox_documents.body_excerpt is
  '본문 발췌(최대 1500자, UTF-8). 텍스트형 문서(pdf/docx/txt/md) 에서 추출.
   임베딩 입력과 동일한 텍스트. null = 아직 백필 안 됨 or 텍스트 추출 불가.';

-- 빈 행만 골라내는 쿼리가 자주 나오므로 부분 인덱스 (작음).
create index if not exists inbox_documents_excerpt_null_idx
  on public.inbox_documents (created_at desc)
  where body_excerpt is null and drive_file_id is not null;
