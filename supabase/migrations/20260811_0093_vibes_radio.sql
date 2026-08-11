-- ===========================================================================
-- OR-043 — Vibes Radio synchronized broadcast
--
-- Singleton broadcast clock (current item + started_at), upcoming queue, and
-- opted-in pool. Audio bytes live on CDN/public — not in edge functions.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.vibes_radio_pool (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid references public.drops(id) on delete set null,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  audio_url text not null,
  title text not null default 'Untitled',
  artist text,
  duration_sec double precision not null
    check (duration_sec > 0 and duration_sec <= 3600),
  status text not null default 'active'
    check (status in ('active', 'rejected', 'pending')),
  created_at timestamptz not null default now(),
  constraint vibes_radio_pool_drop_unique unique (drop_id)
);

create index if not exists vibes_radio_pool_active_idx
  on public.vibes_radio_pool (status, created_at desc)
  where status = 'active';

create table if not exists public.vibes_radio_queue (
  id uuid primary key default gen_random_uuid(),
  position integer not null,
  kind text not null
    check (kind in ('greeting', 'interstitial', 'user_track', 'artist_cue', 'stinger')),
  audio_url text not null,
  title text not null default 'VYBZ Radio',
  artist text,
  duration_sec double precision not null
    check (duration_sec > 0 and duration_sec <= 3600),
  drop_id uuid references public.drops(id) on delete set null,
  pool_id uuid references public.vibes_radio_pool(id) on delete set null,
  source text not null default 'station'
    check (source in ('station', 'pool', 'system')),
  created_at timestamptz not null default now()
);

create unique index if not exists vibes_radio_queue_position_uidx
  on public.vibes_radio_queue (position);

create table if not exists public.vibes_radio_broadcast (
  id integer primary key check (id = 1),
  current_item_id uuid references public.vibes_radio_queue(id) on delete set null,
  kind text not null default 'interstitial'
    check (kind in ('greeting', 'interstitial', 'user_track', 'artist_cue', 'stinger')),
  started_at timestamptz not null default now(),
  duration_sec double precision not null default 7.875
    check (duration_sec > 0 and duration_sec <= 3600),
  title text not null default 'Hear something new',
  artist text default 'VYBZ',
  audio_url text not null default '/audio/2.wav',
  drop_id uuid references public.drops(id) on delete set null,
  updated_at timestamptz not null default now()
);

comment on table public.vibes_radio_broadcast is
  'Singleton Vibes Radio clock — current item + started_at. Service role writes; public read.';
comment on table public.vibes_radio_queue is
  'Upcoming Vibes Radio items. Service role writes.';
comment on table public.vibes_radio_pool is
  'Opted-in user tracks for random rotation into the queue.';

-- Seed singleton + first interstitial (measured duration for /audio/2.wav).
insert into public.vibes_radio_broadcast (
  id, kind, started_at, duration_sec, title, artist, audio_url, updated_at
) values (
  1, 'interstitial', now(), 7.875, 'Hear something new', 'VYBZ', '/audio/2.wav', now()
)
on conflict (id) do nothing;

alter table public.vibes_radio_pool enable row level security;
alter table public.vibes_radio_queue enable row level security;
alter table public.vibes_radio_broadcast enable row level security;

revoke all on public.vibes_radio_pool from anon, authenticated;
revoke all on public.vibes_radio_queue from anon, authenticated;
revoke all on public.vibes_radio_broadcast from anon, authenticated;

grant select on public.vibes_radio_broadcast to anon, authenticated;
grant select on public.vibes_radio_queue to anon, authenticated;
grant select, insert, update on public.vibes_radio_pool to authenticated;
grant all on public.vibes_radio_pool to service_role;
grant all on public.vibes_radio_queue to service_role;
grant all on public.vibes_radio_broadcast to service_role;

-- Broadcast: anyone can read the live clock.
create policy vibes_radio_broadcast_select
  on public.vibes_radio_broadcast for select
  to anon, authenticated
  using (true);

-- Queue: public read (clients may peek next for UI; advance is edge-only).
create policy vibes_radio_queue_select
  on public.vibes_radio_queue for select
  to anon, authenticated
  using (true);

-- Pool: owners manage their opt-ins; everyone can see active rows (for discovery honesty).
create policy vibes_radio_pool_select_active
  on public.vibes_radio_pool for select
  to anon, authenticated
  using (status = 'active' or owner_id = auth.uid());

create policy vibes_radio_pool_insert_own
  on public.vibes_radio_pool for insert
  to authenticated
  with check (owner_id = auth.uid());

create policy vibes_radio_pool_update_own
  on public.vibes_radio_pool for update
  to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());
