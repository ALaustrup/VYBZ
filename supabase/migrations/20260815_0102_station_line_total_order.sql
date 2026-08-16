-- Total order for the station line.
--
-- Found while testing 0101: two submissions inside one transaction share now(),
-- so `submitted_at < submitted_at` is false for both and each reported itself as
-- first. Position in line is the whole promise of the line, so the ordering has
-- to be total, not merely usually-distinct.
--
-- Comparing (submitted_at, id) as a row makes it total: the primary key breaks
-- any tie, deterministically, forever.

set search_path = public, extensions;

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
    from public.station_airings o, public.station_airings s
   where s.id = new_id
     and o.status = 'waiting'
     and (o.submitted_at, o.id) < (s.submitted_at, s.id);

  return jsonb_build_object('ok', true, 'id', new_id, 'ahead', ahead);
end
$fn$;

grant execute on function public.submit_to_station(uuid) to authenticated;

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
             where o.status = 'waiting'
               and (o.submitted_at, o.id) < (s.submitted_at, s.id)
          ),
          'estimatedWaitSec', (
            select coalesce(sum(o.duration_sec), 0)
              from public.station_airings o
             where o.status = 'waiting'
               and (o.submitted_at, o.id) < (s.submitted_at, s.id)
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
   order by a.submitted_at, a.id
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
