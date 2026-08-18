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
-- Phase 1 left award_listen_credit callable with client-supplied flags.
-- Phase 2: revoke that. Credit only through verified heartbeats.
revoke all on function public.award_listen_credit(uuid, int, boolean, boolean, boolean, boolean)
  from public, anon, authenticated;
grant execute on function public.award_listen_credit(uuid, int, boolean, boolean, boolean, boolean)
  to service_role;

comment on table public.airtime_balances is
  'ATC hosting balances. Not Station Airtime. Not purchasable. Server writes only.';
comment on table public.airtime_ledger is
  'Append-only ATC movements. Positive creates, negative destroys.';

-- ── Phase 2: verified listen heartbeats ─────────────────────────────────────

create table if not exists public.listen_credit_sessions (
  listener_id uuid not null references public.profiles(id) on delete cascade,
  host_session_id uuid not null references public.live_sessions(id) on delete cascade,
  last_heartbeat_at timestamptz not null default now(),
  last_focus_at timestamptz,
  last_awarded_at timestamptz,
  credited_seconds int not null default 0 check (credited_seconds >= 0),
  rate_limited boolean not null default false,
  primary key (listener_id, host_session_id)
);

create index if not exists listen_credit_sessions_active_idx
  on public.listen_credit_sessions (listener_id, last_heartbeat_at desc);

alter table public.listen_credit_sessions enable row level security;

drop policy if exists "listen_credit_sessions own read" on public.listen_credit_sessions;
create policy "listen_credit_sessions own read"
  on public.listen_credit_sessions for select using (listener_id = auth.uid());

grant select on public.listen_credit_sessions to authenticated;

create or replace function public._atc_quality_for(
  p_listener uuid,
  p_session uuid,
  p_credited_after int
)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  sess public.live_sessions%rowtype;
  spark boolean := false;
  stay boolean := false;
  discovery boolean := false;
  first_listen boolean := false;
  concentrated boolean := false;
  avg_viewers numeric;
  host_dur numeric;
  day_atc int;
  top2_atc int;
begin
  select * into sess from public.live_sessions where id = p_session;
  if not found then
    return jsonb_build_object('spark', false, 'stay', false, 'discovery', false, 'first_listen', false);
  end if;

  spark := exists (
    select 1 from public.live_messages m
    where m.session_id = p_session and m.sender_id = p_listener
  );

  host_dur := extract(epoch from (coalesce(sess.ended_at, now()) - sess.started_at));
  stay := p_credited_after >= 1200
    or (host_dur is not null and host_dur > 0 and p_credited_after >= 0.6 * host_dur);

  select avg(s.viewer_count) into avg_viewers
  from public.live_sessions s
  where s.host_id = sess.host_id
    and s.id <> p_session
    and s.started_at > now() - interval '7 days';
  discovery := avg_viewers is null or avg_viewers < 5;

  first_listen := not exists (
    select 1
    from public.listen_credit_events e
    join public.live_sessions s on s.id = e.host_session_id
    where e.listener_id = p_listener
      and s.host_id = sess.host_id
      and e.created_at >= date_trunc('day', timezone('utc', now()))
      and e.host_session_id <> p_session
  );

  select coalesce(sum(e.atc_awarded), 0) into day_atc
  from public.listen_credit_events e
  where e.listener_id = p_listener
    and e.created_at > now() - interval '24 hours';

  select coalesce(sum(x.atc), 0) into top2_atc
  from (
    select sum(e.atc_awarded) as atc
    from public.listen_credit_events e
    join public.live_sessions s on s.id = e.host_session_id
    where e.listener_id = p_listener
      and e.created_at > now() - interval '24 hours'
    group by s.host_id
    order by sum(e.atc_awarded) desc
    limit 2
  ) x;

  concentrated := day_atc >= 200 and top2_atc::numeric / day_atc > 0.8;
  if concentrated then
    discovery := false;
  end if;

  return jsonb_build_object(
    'spark', spark,
    'stay', stay,
    'discovery', discovery,
    'first_listen', first_listen,
    'concentrated', concentrated
  );
end
$fn$;
revoke all on function public._atc_quality_for(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public._atc_quality_for(uuid, uuid, int) to service_role;

create or replace function public._atc_award_verified(
  p_listener uuid,
  p_session uuid,
  p_seconds int
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  rec public.airtime_balances;
  q jsonb;
  credited_after int;
  spark boolean;
  stay boolean;
  discovery boolean;
  first_listen boolean;
  mult numeric := 1;
  awarded int;
begin
  if p_seconds < 1 then
    return jsonb_build_object('ok', false, 'error', 'invalid_seconds');
  end if;

  select coalesce(credited_seconds, 0) + p_seconds into credited_after
  from public.listen_credit_sessions
  where listener_id = p_listener and host_session_id = p_session;
  credited_after := coalesce(credited_after, p_seconds);
  q := public._atc_quality_for(p_listener, p_session, credited_after);
  spark := coalesce((q->>'spark')::boolean, false);
  stay := coalesce((q->>'stay')::boolean, false);
  discovery := coalesce((q->>'discovery')::boolean, false);
  first_listen := coalesce((q->>'first_listen')::boolean, false);

  if spark then mult := mult * 1.2; end if;
  if stay then mult := mult * 1.15; end if;
  if discovery then mult := mult * 1.25; end if;
  if first_listen then mult := mult * 1.1; end if;
  if mult > 1.8 then mult := 1.8; end if;

  awarded := floor((p_seconds * 50 * mult) / 60.0);
  rec := public._atc_ensure_balance(p_listener, null);

  if awarded > 0 then
    update public.airtime_balances
      set earned_balance = earned_balance + awarded,
          updated_at = now()
    where user_id = p_listener
    returning * into rec;

    insert into public.airtime_ledger (
      user_id, amount, type, source_live_session_id, metadata
    ) values (
      p_listener, awarded, 'listen_earn', p_session,
      jsonb_build_object(
        'verified_seconds', p_seconds,
        'multiplier', mult,
        'spark', spark,
        'stay', stay,
        'discovery', discovery,
        'first_listen', first_listen
      )
    );
  else
    select * into rec from public.airtime_balances where user_id = p_listener;
  end if;

  insert into public.listen_credit_events (
    listener_id, host_session_id, verified_seconds, quality_score, atc_awarded
  ) values (p_listener, p_session, p_seconds, mult, awarded);

  return jsonb_build_object(
    'ok', true,
    'atc_awarded', awarded,
    'multiplier', mult,
    'daily_free_remaining', rec.daily_free_remaining,
    'earned_balance', rec.earned_balance
  );
end
$fn$;
revoke all on function public._atc_award_verified(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public._atc_award_verified(uuid, uuid, int) to service_role;

create or replace function public.report_listen_heartbeat(
  p_session uuid,
  p_focused boolean,
  p_playing boolean
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  sess public.live_sessions%rowtype;
  row public.listen_credit_sessions;
  concurrent int;
  focused boolean := coalesce(p_focused, false);
  playing boolean := coalesce(p_playing, false);
  active boolean;
  award jsonb;
  chunk int := 30;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  select * into sess from public.live_sessions where id = p_session;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if sess.host_id = uid then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;
  if sess.status <> 'live' then
    return jsonb_build_object('ok', false, 'error', 'not_live');
  end if;

  insert into public.listen_credit_sessions (listener_id, host_session_id)
  values (uid, p_session)
  on conflict (listener_id, host_session_id) do nothing;

  select * into row
  from public.listen_credit_sessions
  where listener_id = uid and host_session_id = p_session
  for update;

  select count(*)::int into concurrent
  from public.listen_credit_sessions c
  join public.live_sessions s on s.id = c.host_session_id
  where c.listener_id = uid
    and s.status = 'live'
    and c.last_focus_at is not null
    and c.last_focus_at > now() - interval '45 seconds';

  if concurrent >= 4 then
    update public.listen_credit_sessions
      set last_heartbeat_at = now(), rate_limited = true
    where listener_id = uid and host_session_id = p_session;
    return jsonb_build_object('ok', true, 'awarded', 0, 'error', 'rate_limited');
  end if;

  active := focused and playing;

  if row.last_heartbeat_at is not null
     and row.last_heartbeat_at < now() - interval '45 seconds' then
    row.last_awarded_at := now();
  end if;

  if active then
    row.last_focus_at := now();
  end if;
  row.last_heartbeat_at := now();
  row.rate_limited := false;

  if active
     and (row.last_awarded_at is null or row.last_awarded_at <= now() - interval '30 seconds') then
    if row.last_awarded_at is null then
      row.last_awarded_at := now();
      award := jsonb_build_object('ok', true, 'atc_awarded', 0);
    else
      award := public._atc_award_verified(uid, p_session, chunk);
      row.last_awarded_at := now();
      row.credited_seconds := row.credited_seconds + chunk;
    end if;
  else
    award := jsonb_build_object('ok', true, 'atc_awarded', 0);
  end if;

  update public.listen_credit_sessions set
    last_heartbeat_at = row.last_heartbeat_at,
    last_focus_at = row.last_focus_at,
    last_awarded_at = row.last_awarded_at,
    credited_seconds = row.credited_seconds,
    rate_limited = row.rate_limited
  where listener_id = uid and host_session_id = p_session;

  return jsonb_build_object(
    'ok', true,
    'atc_awarded', coalesce((award->>'atc_awarded')::int, 0),
    'credited_seconds', row.credited_seconds,
    'daily_free_remaining', (award->>'daily_free_remaining')::int,
    'earned_balance', (award->>'earned_balance')::int
  );
end
$fn$;
grant execute on function public.report_listen_heartbeat(uuid, boolean, boolean) to authenticated;
revoke all on function public.report_listen_heartbeat(uuid, boolean, boolean) from anon, public;

-- ── Phase 3: host start gate ────────────────────────────────────────────────

create or replace function public.can_start_live()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  granted jsonb;
  total int;
begin
  granted := public.get_airtime_balance(null);
  if coalesce((granted->>'ok')::boolean, false) is not true then
    return granted;
  end if;
  total := coalesce((granted->>'total')::int, 0);
  if total < 300 then
    return granted || jsonb_build_object('ok', false, 'error', 'insufficient', 'minimum', 300);
  end if;
  return granted || jsonb_build_object('ok', true, 'minimum', 300);
end
$fn$;
grant execute on function public.can_start_live() to authenticated;
revoke all on function public.can_start_live() from anon, public;

create or replace function public.atc_abuse_review(p_limit int default 20)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
begin
  if not public.is_admin() then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  return (
    select jsonb_build_object(
      'ok', true,
      'rows', coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
    )
    from (
      select
        e.listener_id,
        count(*)::int as events_24h,
        coalesce(sum(e.atc_awarded), 0)::int as atc_24h,
        count(distinct s.host_id)::int as hosts_24h,
        bool_or(c.rate_limited) as rate_limited
      from public.listen_credit_events e
      join public.live_sessions s on s.id = e.host_session_id
      left join public.listen_credit_sessions c
        on c.listener_id = e.listener_id and c.host_session_id = e.host_session_id
      where e.created_at > now() - interval '24 hours'
      group by e.listener_id
      order by sum(e.atc_awarded) desc nulls last
      limit greatest(1, least(coalesce(p_limit, 20), 100))
    ) t
  );
end
$fn$;
grant execute on function public.atc_abuse_review(int) to authenticated;
revoke all on function public.atc_abuse_review(int) from anon, public;
