-- ============================================================
-- AI 직원 의미 검색 — 임베딩(pgvector) + Vertex AI
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전.
--
-- 트라이그램(글자 유사도) 위에 "의미 유사도"를 얹는다.
--   - 문서 본문까지 임베딩해서 제목·요약이 아니라 "내용"으로 검색.
--   - 임베딩 생성은 Google Vertex AI(text-multilingual-embedding-002, 768차원).
--     → 기존 Drive 서비스 계정 재사용, GCP Cloud 크레딧에 청구(현금 0).
--
-- 적용 순서:
--   1) 이 SQL 실행 (컬럼/인덱스/검색함수 생성)
--   2) GCP: Vertex AI API 활성화 + 서비스 계정에 "Vertex AI User" 역할 부여
--   3) npm run embed:backfill  (기존 문서 일괄 임베딩)
--
-- 이 SQL 을 실행해도, 임베딩이 채워지기 전(백필 전)이나 키/권한이 없으면
-- retrieve.ts 가 자동으로 트라이그램 → 키워드로 폴백한다. 그래서 안 깨진다.
-- ============================================================

-- pgvector (Supabase 는 extensions 스키마에 설치)
create extension if not exists vector with schema extensions;

-- 768차원 임베딩 컬럼 (text-multilingual-embedding-002 기준)
-- 모델/차원을 바꾸면 이 숫자와 lib/assistant/embedding.ts 의 EMBED_DIM 을 함께 바꾼다.
alter table public.inbox_documents
  add column if not exists embedding extensions.vector(768);

-- 코사인 거리용 HNSW 인덱스 (수천~수만 건에서 빠른 근접 검색)
create index if not exists inbox_documents_embedding_idx
  on public.inbox_documents
  using hnsw (embedding extensions.vector_cosine_ops);

-- 질문 임베딩과 코사인 거리가 가까운 순으로 살아있는 문서를 돌려준다.
-- embedding 이 채워진 문서만 대상 → 백필 전이면 0건 → 호출부가 트라이그램으로 폴백.
create or replace function public.match_inbox_documents(
  query_embedding extensions.vector,
  match_limit int default 16
)
returns setof public.inbox_documents
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select d.*
  from public.inbox_documents d
  where d.drive_file_id is not null
    and (d.status is null or d.status not in ('trashed', 'rejected', 'failed'))
    and d.embedding is not null
  order by d.embedding <=> query_embedding
  limit match_limit;
$$;

grant execute on function public.match_inbox_documents(extensions.vector, int) to authenticated;
