-- 내부 AI 우편실 — source 컬럼 추가 (v1: Gmail / 폴더 워치 등 출처 구분용)
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행
-- 멱등성: if not exists 패턴, 여러 번 실행해도 안전

alter table public.inbox_documents
  add column if not exists source text default 'web-upload';

-- 출처별 인덱스 (Gmail 만 보기, 폴더 워치만 보기 등)
create index if not exists inbox_documents_source_idx
  on public.inbox_documents (source, created_at desc);

-- 후보 출처 (참고용, check 제약은 안 검 — 새 출처 자유롭게 추가)
comment on column public.inbox_documents.source is
  'where this row came from: web-upload, gmail, naver-mail, folder-watch, figma-export, github-readme, claude-mcp 등';
