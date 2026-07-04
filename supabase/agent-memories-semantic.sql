-- ============================================================
-- 에이전트 기억(agent_memories) 시맨틱 검색 — B1
-- Supabase SQL Editor 에 붙여넣고 RUN. 여러 번 실행해도 안전(멱등).
--
-- 배경: memory_search 가 ilike(단어 일치)라 "협탁 고객 반응" 같은 의미 질의를
-- 못 찾았다. embedding 컬럼(vector 768)은 이미 있으므로 인덱스+검색함수만 추가.
-- 코드(handleMemorySearch)는 이 함수가 없으면 자동으로 ilike 로 폴백하므로
-- SQL 실행 전에 배포돼도 안 깨진다.
-- ============================================================

-- 코사인 거리용 HNSW 인덱스
create index if not exists agent_memories_embedding_idx
  on public.agent_memories
  using hnsw (embedding extensions.vector_cosine_ops);

-- 질문 임베딩과 가까운 순으로 살아있는(만료 안 된) 기억을 돌려준다.
-- filter_agent 지정 시: 그 에이전트 본인 기억 + 전사 공유(company) 기억.
-- filter_scope 지정 시: 해당 scope 만.
create or replace function public.match_agent_memories(
  query_embedding extensions.vector,
  match_limit int default 10,
  filter_agent uuid default null,
  filter_scope text default null
)
returns setof public.agent_memories
language sql
stable
security invoker
set search_path = public, extensions
as $$
  select m.*
  from public.agent_memories m
  where m.embedding is not null
    and (m.expires_at is null or m.expires_at > now())
    and (filter_scope is null or m.scope = filter_scope)
    and (filter_agent is null or m.agent_id = filter_agent or m.scope = 'company')
  order by m.embedding <=> query_embedding
  limit match_limit;
$$;

grant execute on function public.match_agent_memories(extensions.vector, int, uuid, text)
  to authenticated, service_role;
