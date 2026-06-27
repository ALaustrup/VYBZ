-- Unified push: per-device subscriptions. Web stores the W3C Push subscription
-- (endpoint + p256dh + auth); native (APNs/FCM) will store its token in the same
-- table with platform = 'ios' | 'android', so one sender fans out everywhere.

create table if not exists public.push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles on delete cascade,
  endpoint    text not null unique,
  p256dh      text,
  auth        text,
  platform    text not null default 'web',
  -- Calm-by-default categories the user can later toggle.
  preferences jsonb not null default '{"vyb":true,"match":true,"pulse":true}'::jsonb,
  created_at  timestamptz not null default now(),
  last_sent_at timestamptz
);

alter table public.push_subscriptions enable row level security;

drop policy if exists "push own select" on public.push_subscriptions;
drop policy if exists "push own insert" on public.push_subscriptions;
drop policy if exists "push own update" on public.push_subscriptions;
drop policy if exists "push own delete" on public.push_subscriptions;
create policy "push own select" on public.push_subscriptions for select using (user_id = auth.uid());
create policy "push own insert" on public.push_subscriptions for insert with check (user_id = auth.uid());
create policy "push own update" on public.push_subscriptions for update using (user_id = auth.uid());
create policy "push own delete" on public.push_subscriptions for delete using (user_id = auth.uid());

create index if not exists push_subs_user_idx on public.push_subscriptions (user_id);
