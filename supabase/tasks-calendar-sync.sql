-- tasks 테이블에 Google Calendar 동기화 메타 추가.
-- 적용: Supabase SQL Editor 에 통째로 붙여넣고 실행. 멱등.

alter table public.tasks add column if not exists google_event_id text;
alter table public.tasks add column if not exists google_synced_at timestamptz;
alter table public.tasks add column if not exists google_sync_error text;

create index if not exists tasks_google_event_idx
  on public.tasks (google_event_id)
  where google_event_id is not null;

notify pgrst, 'reload schema';
