-- ============================================================
-- AI 직원 검색 업그레이드 — 트라이그램 유사도 (pg_trgm)
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전.
--
-- 기존: filename/description/... 컬럼에 ilike '%키워드%' OR-매칭 + 최신순.
--   → 단어가 정확히 들어가야만 걸리고, 관련도 랭킹이 없다(그냥 최신순).
-- 변경: pg_trgm word_similarity 로 "질문과 얼마나 비슷한가" 점수를 매겨
--   관련도 높은 순으로 정렬한다. 오타·부분일치·어순 흔들림에 강하다.
--   외부 임베딩 API/키/비용 0 — Supabase(Postgres) 내장 기능만 사용.
--
-- 이 SQL 을 실행하기 전까지는 앱이 자동으로 기존 ilike 방식으로 돌아간다
-- (retrieve.ts 가 함수 없으면 폴백). 그래서 지금 실행 안 해도 안 깨진다.
-- ============================================================

-- 트라이그램 확장 (Supabase 는 extensions 스키마에 설치)
create extension if not exists pg_trgm with schema extensions;

-- 살아있는(drive_file_id 있고 trashed/rejected/failed 아님) 문서를
-- 질문 q 와의 트라이그램 유사도 순으로 돌려준다. 점수 동률/0점은 최신순.
-- order+limit 만 쓰므로 매칭이 약해도 항상 match_limit 건은 후보로 나온다
-- (= 기존의 "매칭 빈약하면 최신 문서로 보강" 동작을 그대로 보장).
create or replace function public.search_inbox_documents(q text, match_limit int default 16)
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
  order by
    word_similarity(
      q,
      coalesce(d.filename, '')    || ' ' ||
      coalesce(d.description, '')  || ' ' ||
      coalesce(d.doc_type, '')     || ' ' ||
      coalesce(d.folder_path, '')  || ' ' ||
      coalesce(d.ai_reasoning, '')
    ) desc,
    d.created_at desc
  limit match_limit;
$$;

grant execute on function public.search_inbox_documents(text, int) to authenticated;

-- 참고: 문서 수가 ~1만 건을 넘어 seq scan 이 느려지면, 아래처럼
-- 표현식 GIN 트라이그램 인덱스 + `%>` 프리필터를 추가하면 된다.
-- 지금 규모(수백~수천 건)에선 불필요해서 생략(인덱스 유지비만 듦).
--
--   create index if not exists inbox_documents_search_trgm_idx
--     on public.inbox_documents using gin (
--       ( coalesce(filename,'')||' '||coalesce(description,'')||' '||
--         coalesce(doc_type,'')||' '||coalesce(folder_path,'')||' '||
--         coalesce(ai_reasoning,'') ) extensions.gin_trgm_ops
--     );
