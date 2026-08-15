-- Listens — how far people actually got.
--
-- `drop_plays` records only that a play happened: (drop_id, user_id, created_at).
-- That is the same fiction every platform sells — a "play" that says nothing
-- about whether anyone heard the thing. An artist cannot learn from it.
--
-- One row per listening session, carrying the furthest point reached and whether
-- the audio element actually reported the end. Aggregates go to the owner;
-- individual rows stay private to the listener.
--
-- What this deliberately does NOT do: infer. A session that stopped at 1:47 is
-- reported as stopping at 1:47, never as "lost interest". Anything unknown is
-- reported as unknown.

set search_path = public, extensions;

create table if not exists public.drop_listens (
  -- Client-generated per session so a resumed listen updates rather than duplicates.
  id uuid primary key,
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reached_sec numeric not null default 0 check (reached_sec >= 0),
  -- Track length as known to the client; null when it was never reported.
  duration_sec numeric check (duration_sec is null or duration_sec > 0),
  -- True only when playback actually reached the end, never guessed from position.
  completed boolean not null default false,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drop_listens_drop_idx
  on public.drop_listens (drop_id, started_at desc);
create index if not exists drop_listens_user_idx
  on public.drop_listens (user_id, drop_id);

alter table public.drop_listens enable row level security;

drop policy if exists "drop_listens own" on public.drop_listens;
create policy "drop_listens own" on public.drop_listens
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select, insert, update on public.drop_listens to authenticated;

comment on table public.drop_listens is
  'One row per listening session. reached_sec is the furthest point observed; completed is set only when playback reported the end.';

-- ── Record ─────────────────────────────────────────────────────────────────
-- Upsert so a session writes a few times rather than once per tick, and so a
-- later report can never move the furthest point backwards.
create or replace function public.record_listen(
  p_session uuid,
  p_drop uuid,
  p_reached_sec numeric,
  p_duration_sec numeric default null,
  p_completed boolean default false
)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_session is null or p_drop is null then return false; end if;
  if p_reached_sec is null or p_reached_sec < 0 then return false; end if;

  insert into public.drop_listens (id, drop_id, user_id, reached_sec, duration_sec, completed)
  values (p_session, p_drop, uid, p_reached_sec, p_duration_sec, coalesce(p_completed, false))
  on conflict (id) do update
    set reached_sec = greatest(public.drop_listens.reached_sec, excluded.reached_sec),
        duration_sec = coalesce(excluded.duration_sec, public.drop_listens.duration_sec),
        completed = public.drop_listens.completed or excluded.completed,
        updated_at = now()
    where public.drop_listens.user_id = uid;
  return true;
end
$fn$;

grant execute on function public.record_listen(uuid, uuid, numeric, numeric, boolean) to authenticated;

-- ── Report (owner only) ────────────────────────────────────────────────────
-- Counts and distribution only. An owner learns what happened, never who.
create or replace function public.listen_report(p_drop uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not exists (
      select 1 from public.drops d where d.id = p_drop and d.author_id = auth.uid()
    ) then jsonb_build_object('ok', false)
    else (
      select jsonb_build_object(
        'ok', true,
        'sessions', count(*),
        'listeners', count(distinct l.user_id),
        'finished', count(*) filter (where l.completed),
        -- Someone who came back on a different day is a different kind of signal
        -- from someone who replayed it twice in a row.
        'returning', (
          select count(*) from (
            select user_id
            from public.drop_listens
            where drop_id = p_drop
            group by user_id
            having count(distinct date_trunc('day', started_at)) > 1
          ) r
        ),
        'medianReachedSec', percentile_cont(0.5) within group (order by l.reached_sec),
        'maxReachedSec', max(l.reached_sec),
        -- Null when no session ever reported a duration; the caller must show
        -- "Not measured" rather than substituting a plausible number.
        'durationSec', max(l.duration_sec)
      )
      from public.drop_listens l
      where l.drop_id = p_drop
    )
  end;
$fn$;

grant execute on function public.listen_report(uuid) to authenticated;

-- Where listeners stopped, bucketed, for the owner only.
create or replace function public.listen_dropoff(p_drop uuid, p_buckets integer default 10)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((
    select jsonb_agg(jsonb_build_object('bucket', b.bucket, 'stopped', b.stopped) order by b.bucket)
    from (
      select
        least(
          greatest(1, least(coalesce(p_buckets, 10), 50)) - 1,
          floor(l.reached_sec / nullif(l.duration_sec, 0) * greatest(1, least(coalesce(p_buckets, 10), 50)))
        )::int as bucket,
        count(*) as stopped
      from public.drop_listens l
      where l.drop_id = p_drop
        and l.duration_sec is not null
        and not l.completed
        and exists (select 1 from public.drops d where d.id = p_drop and d.author_id = auth.uid())
      group by 1
    ) b
  ), '[]'::jsonb);
$fn$;

grant execute on function public.listen_dropoff(uuid, integer) to authenticated;
