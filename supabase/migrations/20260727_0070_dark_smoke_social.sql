-- ===========================================================================
-- Dark Smoke Social — playlists + live circle/world + room reactions
-- ===========================================================================

set search_path = public, extensions;

-- ── Phase 8: playlist queue entities ─────────────────────────────────────────
create table if not exists public.playlists (
  id text primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  provider text not null check (provider in ('spotify', 'soundcloud', 'apple')),
  external_url text not null,
  title text not null,
  track_count int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists playlists_owner_idx on public.playlists (owner_id, updated_at desc);
alter table public.playlists enable row level security;
drop policy if exists "playlists mine" on public.playlists;
create policy "playlists mine" on public.playlists
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());
grant select, insert, update, delete on public.playlists to authenticated;

create table if not exists public.playlist_tracks (
  playlist_id text not null references public.playlists(id) on delete cascade,
  track_id text not null,
  title text not null,
  artist text,
  url text not null,
  duration_sec numeric,
  position int not null default 0,
  primary key (playlist_id, track_id)
);
create index if not exists playlist_tracks_pos_idx
  on public.playlist_tracks (playlist_id, position);
alter table public.playlist_tracks enable row level security;
drop policy if exists "playlist tracks via owner" on public.playlist_tracks;
create policy "playlist tracks via owner" on public.playlist_tracks
  for all using (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  ) with check (
    exists (select 1 from public.playlists p where p.id = playlist_id and p.owner_id = auth.uid())
  );
grant select, insert, update, delete on public.playlist_tracks to authenticated;

-- ── Phase 9: live visibility world | circle (legacy public → world) ──────────
alter table public.live_sessions drop constraint if exists live_sessions_visibility_check;
update public.live_sessions set visibility = 'world' where visibility = 'public';
alter table public.live_sessions
  alter column visibility set default 'world';
alter table public.live_sessions
  add constraint live_sessions_visibility_check
  check (visibility in ('world', 'circle', 'public'));

drop index if exists live_sessions_top_public_idx;
create index if not exists live_sessions_top_world_idx
  on public.live_sessions (viewer_count desc, started_at desc)
  where status = 'live' and visibility in ('world', 'public');

drop function if exists public.list_live_sessions(int);

create or replace function public.list_live_sessions(lim int default 40)
returns table (
  id uuid,
  host_id uuid,
  username text,
  display_name text,
  avatar_url text,
  role_label text,
  title text,
  source text,
  intent text,
  viewer_count int,
  playback_hls text,
  started_at timestamptz,
  visibility text
)
language sql security definer set search_path = public stable as $fn$
  select
    s.id,
    s.host_id,
    p.username,
    p.display_name,
    p.avatar_url,
    coalesce(p.profile->>'roleLabel', p.profile->>'role') as role_label,
    s.title,
    s.source,
    s.intent,
    s.viewer_count,
    s.playback_hls,
    s.started_at,
    case when s.visibility = 'public' then 'world' else s.visibility end as visibility
  from public.live_sessions s
  join public.profiles p on p.id = s.host_id
  where s.status = 'live'
    and s.expires_at > now()
    and coalesce(p.banned, false) = false
    and (
      s.visibility in ('world', 'public')
      or s.host_id = auth.uid()
      or (
        s.visibility = 'circle'
        and exists (
          select 1 from public.connections c
          where c.status = 'accepted'
            and (
              (c.requester_id = auth.uid() and c.addressee_id = s.host_id)
              or (c.addressee_id = auth.uid() and c.requester_id = s.host_id)
            )
        )
      )
    )
  order by s.viewer_count desc, s.started_at desc
  limit greatest(1, least(coalesce(lim, 40), 100));
$fn$;
grant execute on function public.list_live_sessions(int) to authenticated;

create or replace function public.top_live_sessions(p_limit int default 3)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select
      s.id, s.host_id, p.username, p.display_name, p.avatar_url,
      s.title, s.source, coalesce(s.input_mode, s.source) as input_mode,
      s.intent, s.viewer_count, s.playback_hls, s.started_at,
      s.quality_tier,
      case when s.visibility = 'public' then 'world' else s.visibility end as visibility
    from public.live_sessions s
    join public.profiles p on p.id = s.host_id
    where s.status = 'live'
      and s.expires_at > now()
      and coalesce(p.banned, false) = false
      and (
        s.visibility in ('world', 'public')
        or s.host_id = auth.uid()
        or (
          s.visibility = 'circle'
          and exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and (
                (c.requester_id = auth.uid() and c.addressee_id = s.host_id)
                or (c.addressee_id = auth.uid() and c.requester_id = s.host_id)
              )
          )
        )
      )
    order by s.viewer_count desc, s.started_at desc
    limit greatest(1, least(coalesce(p_limit, 3), 12))
  ) t;
$fn$;
grant execute on function public.top_live_sessions(int) to authenticated;

-- Can this viewer watch a given live session?
create or replace function public.can_watch_live(p_session uuid)
returns boolean language sql security definer set search_path = public stable as $fn$
  select exists (
    select 1 from public.live_sessions s
    where s.id = p_session
      and s.status = 'live'
      and s.expires_at > now()
      and (
        s.visibility in ('world', 'public')
        or s.host_id = auth.uid()
        or (
          s.visibility = 'circle'
          and exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and (
                (c.requester_id = auth.uid() and c.addressee_id = s.host_id)
                or (c.addressee_id = auth.uid() and c.requester_id = s.host_id)
              )
          )
        )
      )
  );
$fn$;
grant execute on function public.can_watch_live(uuid) to authenticated;

-- ── Phase 10: room message reactions ─────────────────────────────────────────
alter table public.room_messages
  add column if not exists reactions jsonb not null default '{}'::jsonb;

drop policy if exists "room messages react" on public.room_messages;
create policy "room messages react" on public.room_messages
  for update using (public.can_access_room(room_id, auth.uid()))
  with check (public.can_access_room(room_id, auth.uid()));
