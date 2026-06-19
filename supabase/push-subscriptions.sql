-- 휴대폰/브라우저 Web Push 구독 저장.
-- 알림 생성 시 이 구독들로 푸시를 쏜다(서버 service_role 만 접근).

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid references public.members(id) not null,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now()
);

create index if not exists push_subscriptions_recipient_idx
  on public.push_subscriptions (recipient_id);

-- 서버(service_role)에서만 읽고 쓴다. 클라이언트 직접 접근은 막음(RLS on, 정책 없음).
alter table public.push_subscriptions enable row level security;
