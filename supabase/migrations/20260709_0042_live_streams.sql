-- ===========================================================================
-- VYBZ Stream — public creator live sessions (Bunny Stream ingest/playback)
-- + identity chat. Everyone with an account can go live. VOD is ephemeral:
-- sessions expire after 24h (recordVod off by default; row cleanup via expires_at).
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.live_sessions (
  id uuid primary key default gen_random_uuid(),
  host_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  source text not null check (source in ('camera', 'display', 'both')),
  intent text,
  status text not null default 'live' check (status in ('live', 'ended')),
  viewer_count int not null default 0,
  -- Bunny Stream library live object
  bunny_guid text,
  playback_hls text,
  rtmp_url text,
  stream_key text,
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  expires_at timestamptz not null default (now() + interval '24 hours'),
  created_at timestamptz not null default now()
);

create index if not exists live_sessions_live_idx
  on public.live_sessions (started_at desc)
  where status = 'live';
create index if not exists live_sessions_host_idx on public.live_sessions (host_id, started_at desc);
create unique index if not exists live_sessions_one_live_per_host
  on public.live_sessions (host_id)
  where status = 'live';

alter table public.live_sessions enable row level security;

create policy "live sessions readable" on public.live_sessions
  for select using (auth.uid() is not null);

create policy "live sessions host insert" on public.live_sessions
  for insert with check (host_id = auth.uid());

create policy "live sessions host update" on public.live_sessions
  for update using (host_id = auth.uid());

grant select, insert, update on public.live_sessions to authenticated;

-- Identity chat on a live session (full messages, signed-in creators only).
create table if not exists public.live_messages (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references public.live_sessions(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now(),
  constraint live_messages_body_len check (length(btrim(body)) between 1 and 1000)
);

create index if not exists live_messages_session_idx
  on public.live_messages (session_id, created_at);

alter table public.live_messages enable row level security;

create policy "live messages read" on public.live_messages
  for select using (auth.uid() is not null);

create policy "live messages send" on public.live_messages
  for insert with check (
    sender_id = auth.uid()
    and exists (
      select 1 from public.live_sessions s
      where s.id = session_id and s.status = 'live' and s.expires_at > now()
    )
  );

grant select, insert on public.live_messages to authenticated;

-- Catalog of who's live now (with host identity for the feed).
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
  started_at timestamptz
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
    s.started_at
  from public.live_sessions s
  join public.profiles p on p.id = s.host_id
  where s.status = 'live'
    and s.expires_at > now()
    and coalesce(p.banned, false) = false
  order by s.viewer_count desc, s.started_at desc
  limit greatest(1, least(coalesce(lim, 40), 100));
$fn$;
grant execute on function public.list_live_sessions(int) to authenticated;

create or replace function public.end_live_session(p_id uuid)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  update public.live_sessions
  set status = 'ended', ended_at = now(), stream_key = null
  where id = p_id and host_id = auth.uid() and status = 'live';
end;
$fn$;
grant execute on function public.end_live_session(uuid) to authenticated;

-- Soft viewer bump (best-effort; not a security boundary).
create or replace function public.bump_live_viewers(p_id uuid, delta int default 1)
returns void
language plpgsql security definer set search_path = public as $fn$
begin
  update public.live_sessions
  set viewer_count = greatest(0, viewer_count + greatest(-5, least(coalesce(delta, 1), 5)))
  where id = p_id and status = 'live';
end;
$fn$;
grant execute on function public.bump_live_viewers(uuid, int) to authenticated;

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.live_sessions;
    exception when duplicate_object then null;
    end;
    begin
      alter publication supabase_realtime add table public.live_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
