-- Airtime Credits (ATC) — hosting commons. Additive. Not Station Airtime.
-- Phase 1: ledger + RPCs. Host start is not gated here.

set search_path = public, extensions;

create table if not exists public.airtime_balances (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  daily_free_remaining int not null default 0 check (daily_free_remaining >= 0),
  earned_balance int not null default 0 check (earned_balance >= 0),
  last_free_grant_at timestamptz,
  timezone text not null default 'UTC',
  updated_at timestamptz not null default now()
);

create table if not exists public.airtime_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  amount int not null check (amount <> 0),
  type text not null check (type in (
    'daily_grant', 'listen_earn', 'host_consume',
    'reception_bonus', 'referral', 'bootstrap', 'admin_adjust'
  )),
  source_live_session_id uuid references public.live_sessions(id) on delete set null,
  source_listen_session_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists airtime_ledger_user_idx
  on public.airtime_ledger (user_id, created_at desc);

create table if not exists public.listen_credit_events (
  id uuid primary key default gen_random_uuid(),
  listener_id uuid not null references public.profiles(id) on delete cascade,
  host_session_id uuid not null references public.live_sessions(id) on delete cascade,
  verified_seconds int not null check (verified_seconds >= 1),
  quality_score numeric not null check (quality_score > 0),
  atc_awarded int not null check (atc_awarded >= 0),
  created_at timestamptz not null default now()
);

create index if not exists listen_credit_events_listener_idx
  on public.listen_credit_events (listener_id, created_at desc);
create index if not exists listen_credit_events_session_idx
  on public.listen_credit_events (host_session_id, created_at desc);

alter table public.airtime_balances enable row level security;
alter table public.airtime_ledger enable row level security;
alter table public.listen_credit_events enable row level security;

drop policy if exists "airtime_balances own read" on public.airtime_balances;
create policy "airtime_balances own read"
  on public.airtime_balances for select using (user_id = auth.uid());

drop policy if exists "airtime_ledger own read" on public.airtime_ledger;
create policy "airtime_ledger own read"
  on public.airtime_ledger for select using (user_id = auth.uid());

drop policy if exists "listen_credit_events own read" on public.listen_credit_events;
create policy "listen_credit_events own read"
  on public.listen_credit_events for select using (listener_id = auth.uid());

grant select on public.airtime_balances to authenticated;
grant select on public.airtime_ledger to authenticated;
grant select on public.listen_credit_events to authenticated;

-- No client writes. Mutations go through the RPCs below.

create or replace function public._atc_ensure_balance(p_uid uuid, p_timezone text default null)
returns public.airtime_balances
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rec public.airtime_balances;
  tz text := coalesce(nullif(trim(p_timezone), ''), 'UTC');
begin
  insert into public.airtime_balances (user_id, timezone)
  values (p_uid, tz)
  on conflict (user_id) do update
    set timezone = case
      when p_timezone is not null and length(trim(p_timezone)) > 0 then tz
      else public.airtime_balances.timezone
    end
  returning * into rec;
  return rec;
end
$fn$;
revoke all on function public._atc_ensure_balance(uuid, text) from public, anon, authenticated;
grant execute on function public._atc_ensure_balance(uuid, text) to service_role;

create or replace function public.grant_daily_free(p_timezone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.airtime_balances;
  tz text;
  grant_date date;
  last_date date;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  rec := public._atc_ensure_balance(uid, p_timezone);
  tz := rec.timezone;
  begin
    grant_date := (timezone(tz, now()))::date;
  exception when invalid_parameter_value then
    tz := 'UTC';
    update public.airtime_balances set timezone = 'UTC' where user_id = uid;
    grant_date := (timezone('UTC', now()))::date;
  end;
  last_date := case
    when rec.last_free_grant_at is null then null
    else (timezone(tz, rec.last_free_grant_at))::date
  end;
  if last_date is not null and last_date = grant_date then
    return jsonb_build_object(
      'ok', true,
      'granted', false,
      'daily_free_remaining', rec.daily_free_remaining,
      'earned_balance', rec.earned_balance
    );
  end if;

  update public.airtime_balances
    set daily_free_remaining = 7200,
        last_free_grant_at = now(),
        updated_at = now()
  where user_id = uid
  returning * into rec;

  insert into public.airtime_ledger (user_id, amount, type, metadata)
  values (uid, 7200, 'daily_grant', jsonb_build_object('overwrote', true, 'timezone', tz));

  return jsonb_build_object(
    'ok', true,
    'granted', true,
    'daily_free_remaining', rec.daily_free_remaining,
    'earned_balance', rec.earned_balance
  );
end
$fn$;
grant execute on function public.grant_daily_free(text) to authenticated;
revoke all on function public.grant_daily_free(text) from anon, public;

create or replace function public.get_airtime_balance(p_timezone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  granted jsonb;
begin
  granted := public.grant_daily_free(p_timezone);
  return granted || jsonb_build_object(
    'total', coalesce((granted->>'daily_free_remaining')::int, 0)
           + coalesce((granted->>'earned_balance')::int, 0)
  );
end
$fn$;
grant execute on function public.get_airtime_balance(text) to authenticated;
revoke all on function public.get_airtime_balance(text) from anon, public;

create or replace function public.consume_airtime(p_session uuid, p_seconds int)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.airtime_balances;
  sess public.live_sessions%rowtype;
  need int := coalesce(p_seconds, 0);
  from_daily int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if need < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_seconds');
  end if;
  select * into sess from public.live_sessions where id = p_session;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if sess.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if sess.status <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'not_live');
  end if;

  rec := public._atc_ensure_balance(uid, null);
  perform public.grant_daily_free(null);

  select * into rec from public.airtime_balances where user_id = uid for update;
  if rec.daily_free_remaining + rec.earned_balance < need then
    return jsonb_build_object(
      'ok', false,
      'error', 'insufficient',
      'daily_free_remaining', rec.daily_free_remaining,
      'earned_balance', rec.earned_balance
    );
  end if;

  from_daily := least(rec.daily_free_remaining, need);
  rec.daily_free_remaining := rec.daily_free_remaining - from_daily;
  rec.earned_balance := rec.earned_balance - (need - from_daily);

  update public.airtime_balances
    set daily_free_remaining = rec.daily_free_remaining,
        earned_balance = rec.earned_balance,
        updated_at = now()
  where user_id = uid;

  insert into public.airtime_ledger (
    user_id, amount, type, source_live_session_id, metadata
  ) values (
    uid, -need, 'host_consume', p_session,
    jsonb_build_object('from_daily', from_daily, 'from_earned', need - from_daily)
  );

  return jsonb_build_object(
    'ok', true,
    'daily_free_remaining', rec.daily_free_remaining,
    'earned_balance', rec.earned_balance,
    'total', rec.daily_free_remaining + rec.earned_balance
  );
end
$fn$;
grant execute on function public.consume_airtime(uuid, int) to authenticated;
revoke all on function public.consume_airtime(uuid, int) from anon, public;

create or replace function public.award_listen_credit(
  p_session uuid,
  p_verified_seconds int,
  p_spark boolean default false,
  p_stay boolean default false,
  p_discovery boolean default false,
  p_first_listen boolean default false
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.airtime_balances;
  sess public.live_sessions%rowtype;
  secs int := coalesce(p_verified_seconds, 0);
  mult numeric := 1;
  awarded int;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if secs < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_seconds');
  end if;
  select * into sess from public.live_sessions where id = p_session;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if sess.host_id = uid then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;

  if p_spark then mult := mult * 1.2; end if;
  if p_stay then mult := mult * 1.15; end if;
  if p_discovery then mult := mult * 1.25; end if;
  if p_first_listen then mult := mult * 1.1; end if;
  if mult > 1.8 then mult := 1.8; end if;

  awarded := floor((secs * 50 * mult) / 60.0);
  rec := public._atc_ensure_balance(uid, null);

  if awarded > 0 then
    update public.airtime_balances
      set earned_balance = earned_balance + awarded,
          updated_at = now()
    where user_id = uid
    returning * into rec;

    insert into public.airtime_ledger (
      user_id, amount, type, source_live_session_id, metadata
    ) values (
      uid, awarded, 'listen_earn', p_session,
      jsonb_build_object('verified_seconds', secs, 'multiplier', mult)
    );
  else
    select * into rec from public.airtime_balances where user_id = uid;
  end if;

  insert into public.listen_credit_events (
    listener_id, host_session_id, verified_seconds, quality_score, atc_awarded
  ) values (uid, p_session, secs, mult, awarded);

  return jsonb_build_object(
    'ok', true,
    'atc_awarded', awarded,
    'daily_free_remaining', rec.daily_free_remaining,
    'earned_balance', rec.earned_balance
  );
end
$fn$;
grant execute on function public.award_listen_credit(uuid, int, boolean, boolean, boolean, boolean) to authenticated;
revoke all on function public.award_listen_credit(uuid, int, boolean, boolean, boolean, boolean) from anon, public;

comment on table public.airtime_balances is
  'ATC hosting balances. Not Station Airtime. Not purchasable. Server writes only.';
comment on table public.airtime_ledger is
  'Append-only ATC movements. Positive creates, negative destroys.';
