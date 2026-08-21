-- Unidirectional creator Follow. Not Connect (mutual request).
-- No public count RPC. Vanity follower totals stay unpublished.
-- Does not change can_view_drop: followers-audience drops still mean accepted connections.

set search_path = public, extensions;

create table if not exists public.creator_follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  creator_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, creator_id),
  check (follower_id <> creator_id)
);

create index if not exists creator_follows_creator_idx
  on public.creator_follows (creator_id, created_at desc);

alter table public.creator_follows enable row level security;

drop policy if exists "creator_follows read own" on public.creator_follows;
create policy "creator_follows read own"
  on public.creator_follows for select using (
    follower_id = auth.uid() or creator_id = auth.uid()
  );

drop policy if exists "creator_follows write own" on public.creator_follows;
create policy "creator_follows write own"
  on public.creator_follows for insert with check (follower_id = auth.uid());

drop policy if exists "creator_follows delete own" on public.creator_follows;
create policy "creator_follows delete own"
  on public.creator_follows for delete using (follower_id = auth.uid());

drop policy if exists "creator_follows update own" on public.creator_follows;
create policy "creator_follows update own"
  on public.creator_follows for update using (follower_id = auth.uid())
  with check (follower_id = auth.uid());

grant select, insert, update, delete on public.creator_follows to authenticated;
revoke all on public.creator_follows from anon, public;

comment on table public.creator_follows is
  'Unidirectional Follow. Not Connect. Do not expose a public follower count.';
