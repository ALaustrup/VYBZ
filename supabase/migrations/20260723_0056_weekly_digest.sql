-- ===========================================================================
-- VYBZ — Weekly best-fit digest (habit loop). Opt-in email of top Connect
-- matches via Resend edge function. Default off (privacy).
-- ===========================================================================

set search_path = public, extensions;

alter table public.profiles
  add column if not exists digest_opt_in boolean not null default false;

create table if not exists public.digest_sends (
  user_id     uuid not null references public.profiles(id) on delete cascade,
  week_start  date not null,
  sent_at     timestamptz not null default now(),
  match_count int not null default 0 check (match_count >= 0),
  primary key (user_id, week_start)
);
create index if not exists digest_sends_week_idx on public.digest_sends(week_start);
alter table public.digest_sends enable row level security;
-- No client policies — service role / SECURITY DEFINER only.
revoke all on public.digest_sends from anon, authenticated;

-- Monday (UTC) of the current week — stable idempotency key.
create or replace function public.digest_week_start(p_at timestamptz default now())
returns date
language sql
stable
set search_path = public
as $fn$
  select (date_trunc('week', p_at at time zone 'UTC')::date);
$fn$;

create or replace function public.my_digest_opt_in()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((select digest_opt_in from public.profiles where id = auth.uid()), false);
$fn$;
grant execute on function public.my_digest_opt_in() to authenticated;

create or replace function public.set_digest_opt_in(p_on boolean)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  update public.profiles set digest_opt_in = coalesce(p_on, false) where id = auth.uid();
  return coalesce(p_on, false);
end;
$fn$;
grant execute on function public.set_digest_opt_in(boolean) to authenticated;

-- Candidates due for this week (service role / edge only).
create or replace function public.list_digest_due(p_week date default public.digest_week_start(), p_limit int default 40)
returns table(user_id uuid)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role only';
  end if;
  return query
    select p.id
    from public.profiles p
    where p.digest_opt_in = true
      and coalesce(p.banned, false) = false
      and p.username is not null
      and not exists (
        select 1 from public.digest_sends d
        where d.user_id = p.id and d.week_start = p_week
      )
    order by p.id
    limit greatest(1, least(200, coalesce(p_limit, 40)));
end;
$fn$;
revoke all on function public.list_digest_due(date, int) from public, anon, authenticated;
grant execute on function public.list_digest_due(date, int) to service_role;

create or replace function public.record_digest_send(p_user uuid, p_week date, p_match_count int)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role only';
  end if;
  insert into public.digest_sends (user_id, week_start, match_count)
  values (p_user, p_week, greatest(0, coalesce(p_match_count, 0)))
  on conflict (user_id, week_start) do update
    set sent_at = now(), match_count = excluded.match_count;
end;
$fn$;
revoke all on function public.record_digest_send(uuid, date, int) from public, anon, authenticated;
grant execute on function public.record_digest_send(uuid, date, int) to service_role;

-- Reuse live collab_matches by impersonating the subject via JWT claim GUC.
create or replace function public.collab_matches_for(p_user uuid, p_limit int default 5)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[], confidence numeric, role_class text,
  shared_professions text[]
)
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if coalesce(auth.role(), '') <> 'service_role' then
    raise exception 'service_role only';
  end if;
  if p_user is null then
    raise exception 'p_user required';
  end if;
  perform set_config('request.jwt.claim.sub', p_user::text, true);
  return query
    select * from public.collab_matches(
      greatest(1, least(20, coalesce(p_limit, 5))),
      null, null, null, null
    );
end;
$fn$;
revoke all on function public.collab_matches_for(uuid, int) from public, anon, authenticated;
grant execute on function public.collab_matches_for(uuid, int) to service_role;

-- Optional cron stub: operators should schedule the Edge Function in the
-- Supabase Dashboard (POST weekly-digest + x-digest-secret). We only ensure
-- pg_cron can exist; we do not embed HTTP secrets in SQL.
do $cron$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
    exception when others then
      raise notice 'pg_cron unavailable: %', sqlerrm;
    end;
  end if;
end;
$cron$;
