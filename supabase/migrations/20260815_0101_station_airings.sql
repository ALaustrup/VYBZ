-- The Station — a schedule an artist can see themselves in.
--
-- Vibes Radio refills its queue by picking a random row from the opted-in pool.
-- That works as ambience but it is a lottery: an artist can never be told when
-- their track will play, or that it played at all. A station people show up for
-- needs a line, and the line has to be legible.
--
-- An airing is one submission of one track. It waits, gets queued, then airs.
-- Order is first in, first out, so "you are third in line" is a fact rather than
-- a guess. The pool stays as-is and remains the fallback when nothing is waiting,
-- so the station never goes silent.

set search_path = public, extensions;

create table if not exists public.station_airings (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'waiting'
    check (status in ('waiting', 'queued', 'aired', 'cancelled')),
  submitted_at timestamptz not null default now(),
  queued_at timestamptz,
  aired_at timestamptz,
  -- Copied at submit so the line survives a later edit to the drop.
  duration_sec double precision check (duration_sec is null or duration_sec > 0)
);

-- One live submission per track; a track can air again after the first one lands.
create unique index if not exists station_airings_one_live_per_drop
  on public.station_airings (drop_id)
  where status in ('waiting', 'queued');

create index if not exists station_airings_line_idx
  on public.station_airings (status, submitted_at)
  where status = 'waiting';

create index if not exists station_airings_owner_idx
  on public.station_airings (owner_id, submitted_at desc);

alter table public.station_airings enable row level security;

-- The line is public: anyone can see how long it is and what is coming.
drop policy if exists station_airings_select on public.station_airings;
create policy station_airings_select on public.station_airings
  for select to anon, authenticated using (true);

drop policy if exists station_airings_own_write on public.station_airings;
create policy station_airings_own_write on public.station_airings
  for all to authenticated
  using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select on public.station_airings to anon, authenticated;
grant select, insert, update on public.station_airings to authenticated;
grant all on public.station_airings to service_role;

comment on table public.station_airings is
  'One submission of one track to The Station. FIFO, so position in line is a fact.';

-- ── Submit ─────────────────────────────────────────────────────────────────
create or replace function public.submit_to_station(p_drop uuid)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  uid uuid := auth.uid();
  d record;
  new_id uuid;
  ahead int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select dr.id, dr.author_id, dr.audience, a.duration_sec
    into d
    from public.drops dr
    left join public.assets a on a.id = dr.asset_id
   where dr.id = p_drop;

  if d.id is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;
  if d.author_id <> uid then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;
  -- The station is public listening; a private track must not be broadcast.
  if coalesce(d.audience, 'public') <> 'public' then
    return jsonb_build_object('ok', false, 'reason', 'not_public');
  end if;

  if exists (
    select 1 from public.station_airings
    where drop_id = p_drop and status in ('waiting', 'queued')
  ) then
    return jsonb_build_object('ok', false, 'reason', 'already_in_line');
  end if;

  insert into public.station_airings (drop_id, owner_id, duration_sec)
  values (p_drop, uid, d.duration_sec)
  returning id into new_id;

  select count(*) into ahead
    from public.station_airings
   where status = 'waiting'
     and submitted_at < (select submitted_at from public.station_airings where id = new_id);

  return jsonb_build_object('ok', true, 'id', new_id, 'ahead', ahead);
end
$fn$;

grant execute on function public.submit_to_station(uuid) to authenticated;

create or replace function public.cancel_station_airing(p_airing uuid)
returns boolean
language sql
security definer
set search_path = public
as $fn$
  update public.station_airings
     set status = 'cancelled'
   where id = p_airing
     and owner_id = auth.uid()
     and status = 'waiting'
  returning true;
$fn$;

grant execute on function public.cancel_station_airing(uuid) to authenticated;

-- ── The line ───────────────────────────────────────────────────────────────
-- Position and an estimated wait. The wait is a sum of measured durations, so it
-- is labelled an estimate: the station also plays bumpers, and a track with no
-- recorded duration contributes nothing to the total.
create or replace function public.station_line(p_drop uuid default null)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select jsonb_build_object(
    'waiting', (select count(*) from public.station_airings where status = 'waiting'),
    'mine', (
      select case when p_drop is null then null else (
        select jsonb_build_object(
          'id', s.id,
          'status', s.status,
          'submittedAt', s.submitted_at,
          'airedAt', s.aired_at,
          'ahead', (
            select count(*) from public.station_airings o
             where o.status = 'waiting' and o.submitted_at < s.submitted_at
          ),
          'estimatedWaitSec', (
            select coalesce(sum(o.duration_sec), 0)
              from public.station_airings o
             where o.status = 'waiting' and o.submitted_at < s.submitted_at
          )
        )
        from public.station_airings s
        where s.drop_id = p_drop and s.status in ('waiting', 'queued')
        limit 1
      ) end
    )
  );
$fn$;

grant execute on function public.station_line(uuid) to anon, authenticated;

-- ── Claim (service role, called by the vibes-radio edge on refill) ─────────
-- Takes the oldest waiting airing and marks it queued, so refill stops being a
-- lottery. Returns nothing when the line is empty, and the caller falls back to
-- the random pool so the station never goes silent.
create or replace function public.claim_next_airing()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  s record;
begin
  select a.id, a.drop_id, a.owner_id, a.duration_sec
    into s
    from public.station_airings a
   where a.status = 'waiting'
   order by a.submitted_at
   for update skip locked
   limit 1;

  if s.id is null then
    return jsonb_build_object('ok', false);
  end if;

  update public.station_airings
     set status = 'queued', queued_at = now()
   where id = s.id;

  return (
    select jsonb_build_object(
      'ok', true,
      'airingId', s.id,
      'dropId', s.drop_id,
      'title', coalesce(nullif(btrim(d.title), ''), 'Untitled'),
      'artist', p.username,
      'audioUrl', a.url,
      'durationSec', coalesce(s.duration_sec, a.duration_sec)
    )
    from public.drops d
    left join public.assets a on a.id = d.asset_id
    left join public.profiles p on p.id = d.author_id
    where d.id = s.drop_id
  );
end
$fn$;

revoke all on function public.claim_next_airing() from public, anon, authenticated;
grant execute on function public.claim_next_airing() to service_role;

create or replace function public.mark_airing_aired(p_drop uuid)
returns boolean
language sql
security definer
set search_path = public
as $fn$
  update public.station_airings
     set status = 'aired', aired_at = now()
   where drop_id = p_drop and status = 'queued'
  returning true;
$fn$;

revoke all on function public.mark_airing_aired(uuid) from public, anon, authenticated;
grant execute on function public.mark_airing_aired(uuid) to service_role;
