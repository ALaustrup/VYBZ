-- ===========================================================================
-- VYBZ Credits (Vc) — wallet ledger, fractional balances, signup grant, P2P
-- Peg: 1 Vc = $0.05 USD. Closed-loop. Future ticker VYBZ (2027). No cash-out.
-- ===========================================================================

set search_path = public, extensions;

-- Fractional balance (was integer whole credits)
alter table public.profiles
  alter column mod_points type numeric(18,4)
  using coalesce(mod_points, 0)::numeric(18,4);

alter table public.profiles
  alter column mod_points set default 0;

-- Append-only transaction registrar
create table if not exists public.vc_tx_ledger (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  from_id uuid references public.profiles(id) on delete set null,
  to_id uuid references public.profiles(id) on delete set null,
  amount numeric(18,4) not null check (amount > 0),
  balance_after numeric(18,4),
  kind text not null check (kind in (
    'signup_grant', 'social_earn', 'p2p', 'topup',
    'spend_cosmetic', 'spend_room', 'spend_repo', 'mod_reward', 'adjustment'
  )),
  ref_type text,
  ref_id text,
  memo text,
  idempotency_key text,
  meta jsonb not null default '{}'::jsonb
);

create unique index if not exists vc_tx_ledger_idem_uidx
  on public.vc_tx_ledger (idempotency_key)
  where idempotency_key is not null;

create index if not exists vc_tx_ledger_to_idx
  on public.vc_tx_ledger (to_id, created_at desc);

create index if not exists vc_tx_ledger_from_idx
  on public.vc_tx_ledger (from_id, created_at desc);

alter table public.vc_tx_ledger enable row level security;

drop policy if exists "vc ledger read mine" on public.vc_tx_ledger;
create policy "vc ledger read mine" on public.vc_tx_ledger
  for select using (from_id = auth.uid() or to_id = auth.uid());

grant select on public.vc_tx_ledger to authenticated;

-- Internal: mint / burn / transfer with row lock + ledger row
create or replace function public._vc_apply(
  p_from uuid,
  p_to uuid,
  p_amount numeric,
  p_kind text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_memo text default null,
  p_idempotency text default null,
  p_meta jsonb default '{}'::jsonb
)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  lid uuid;
  bal_from numeric(18,4);
  bal_to numeric(18,4);
  amt numeric(18,4) := round(coalesce(p_amount, 0)::numeric, 4);
begin
  if amt <= 0 then
    raise exception 'invalid amount';
  end if;
  if p_idempotency is not null then
    select id into lid from public.vc_tx_ledger where idempotency_key = p_idempotency;
    if lid is not null then return lid; end if;
  end if;

  if p_from is not null then
    select mod_points into bal_from from public.profiles where id = p_from for update;
    if bal_from is null then raise exception 'sender missing'; end if;
    if bal_from < amt then raise exception 'insufficient Vc'; end if;
    update public.profiles set mod_points = bal_from - amt where id = p_from;
    bal_from := bal_from - amt;
  end if;

  if p_to is not null then
    select mod_points into bal_to from public.profiles where id = p_to for update;
    if bal_to is null then raise exception 'recipient missing'; end if;
    update public.profiles set mod_points = bal_to + amt where id = p_to;
    bal_to := bal_to + amt;
  end if;

  insert into public.vc_tx_ledger (
    from_id, to_id, amount, balance_after, kind, ref_type, ref_id, memo, idempotency_key, meta
  ) values (
    p_from, p_to, amt,
    coalesce(bal_to, bal_from),
    p_kind, p_ref_type, p_ref_id, nullif(trim(coalesce(p_memo, '')), ''),
    p_idempotency, coalesce(p_meta, '{}'::jsonb)
  ) returning id into lid;

  return lid;
end;
$fn$;

revoke all on function public._vc_apply(uuid, uuid, numeric, text, text, text, text, text, jsonb) from public, anon, authenticated;

-- Signup grant: 20 Vc once (= $1 at $0.05)
create or replace function public.vc_signup_grant()
returns numeric
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  key text;
begin
  if uid is null then return 0; end if;
  key := 'signup_grant:' || uid::text;
  if exists (select 1 from public.vc_tx_ledger where idempotency_key = key) then
    return (select mod_points from public.profiles where id = uid);
  end if;
  perform public._vc_apply(null, uid, 20, 'signup_grant', 'system', 'signup', 'Welcome grant · $1 in Vc', key, '{}'::jsonb);
  return (select mod_points from public.profiles where id = uid);
end;
$fn$;
grant execute on function public.vc_signup_grant() to authenticated;

-- P2P transfer
create or replace function public.vc_transfer(p_to uuid, p_amount numeric, p_memo text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  amt numeric(18,4) := round(coalesce(p_amount, 0)::numeric, 4);
  lid uuid;
begin
  if uid is null then raise exception 'not signed in'; end if;
  if p_to is null or p_to = uid then raise exception 'invalid recipient'; end if;
  if amt < 0.01 then raise exception 'minimum 0.01 Vc'; end if;
  if amt > 10000 then raise exception 'amount too large'; end if;
  if exists (select 1 from public.profiles where id = p_to and coalesce(banned, false)) then
    raise exception 'recipient unavailable';
  end if;
  lid := public._vc_apply(
    uid, p_to, amt, 'p2p', 'user', p_to::text,
    coalesce(nullif(trim(p_memo), ''), 'P2P transfer'),
    'p2p:' || uid::text || ':' || p_to::text || ':' || amt::text || ':' || floor(extract(epoch from now()) * 1000)::text,
    '{}'::jsonb
  );
  return lid;
end;
$fn$;
grant execute on function public.vc_transfer(uuid, numeric, text) to authenticated;

-- Resolve username → transfer
create or replace function public.vc_transfer_username(p_username text, p_amount numeric, p_memo text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  tid uuid;
  uname text := lower(trim(coalesce(p_username, '')));
begin
  if uname = '' then raise exception 'username required'; end if;
  select id into tid from public.profiles where lower(username) = uname limit 1;
  if tid is null then raise exception 'user not found'; end if;
  return public.vc_transfer(tid, p_amount, p_memo);
end;
$fn$;
grant execute on function public.vc_transfer_username(text, numeric, text) to authenticated;

-- Social earn with daily caps (fragments)
create or replace function public.vc_award(
  p_event text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_idempotency text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  amt numeric(18,4) := 0;
  cap numeric(18,4) := 5;
  earned_today numeric(18,4);
  key text;
begin
  if uid is null then return 0; end if;

  amt := case p_event
    when 'daily_login' then 0.05
    when 'connection_accept' then 0.35
    when 'spark_match' then 0.40
    when 'dm_send' then 0.03
    when 'room_message' then 0.02
    when 'cam_call' then 0.50
    when 'video_message' then 0.50
    when 'listen_together' then 0.10
    when 'drop_react' then 0.05
    when 'go_live' then 1.00
    when 'intent_mix' then 0.50
    when 'profile_complete' then 0.50
    else 0
  end;

  if amt <= 0 then return 0; end if;

  key := coalesce(
    nullif(trim(p_idempotency), ''),
    'earn:' || uid::text || ':' || p_event || ':' || coalesce(p_ref_type, '') || ':' || coalesce(p_ref_id, '') || ':' || current_date::text
  );

  -- One-shot events use permanent keys (no date)
  if p_event in ('intent_mix', 'profile_complete', 'signup_grant') then
    key := 'earn:' || uid::text || ':' || p_event || ':' || coalesce(p_ref_id, 'once');
  end if;

  if exists (select 1 from public.vc_tx_ledger where idempotency_key = key) then
    return 0;
  end if;

  select coalesce(sum(amount), 0) into earned_today
  from public.vc_tx_ledger
  where to_id = uid and kind = 'social_earn' and created_at::date = current_date;

  if earned_today >= cap then return 0; end if;
  if earned_today + amt > cap then amt := greatest(0, cap - earned_today); end if;
  if amt <= 0 then return 0; end if;

  perform public._vc_apply(
    null, uid, amt, 'social_earn', p_ref_type, p_ref_id,
    'Earn · ' || p_event, key,
    jsonb_build_object('event', p_event)
  );
  return amt;
end;
$fn$;
grant execute on function public.vc_award(text, text, text, text) to authenticated;

-- Ledger history for wallet UI
create or replace function public.vc_list_ledger(p_limit int default 40, p_before timestamptz default null)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select
      id, created_at, from_id, to_id, amount, balance_after, kind,
      ref_type, ref_id, memo, meta
    from public.vc_tx_ledger
    where (from_id = auth.uid() or to_id = auth.uid())
      and (p_before is null or created_at < p_before)
    order by created_at desc
    limit greatest(1, least(coalesce(p_limit, 40), 100))
  ) t;
$fn$;
grant execute on function public.vc_list_ledger(int, timestamptz) to authenticated;

-- Patch fulfill_credit_topup to also ledger (keep jsonb return)
create or replace function public.fulfill_credit_topup(p_session_id text, p_payment_intent text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.credit_topups%rowtype;
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_session');
  end if;

  select * into r from public.credit_topups
    where stripe_session_id = p_session_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if r.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'credits', r.credits, 'userId', r.user_id);
  end if;

  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'bad_status', 'status', r.status);
  end if;

  update public.credit_topups set
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
  where id = r.id;

  update public.profiles
    set mod_points = mod_points + r.credits
  where id = r.user_id;

  begin
    if not exists (select 1 from public.vc_tx_ledger where idempotency_key = 'topup:' || p_session_id) then
      insert into public.vc_tx_ledger (
        from_id, to_id, amount, balance_after, kind, ref_type, ref_id, memo, idempotency_key, meta
      )
      select
        null, r.user_id, r.credits::numeric,
        p.mod_points, 'topup', 'stripe', p_session_id,
        'Top-up pack', 'topup:' || p_session_id,
        jsonb_build_object('pack_id', r.pack_id)
      from public.profiles p where p.id = r.user_id;
    end if;
  exception when others then
    null;
  end;

  return jsonb_build_object('ok', true, 'already', false, 'credits', r.credits, 'userId', r.user_id);
end;
$fn$;

revoke all on function public.fulfill_credit_topup(text, text) from public, anon, authenticated;
grant execute on function public.fulfill_credit_topup(text, text) to service_role;

comment on table public.vc_tx_ledger is
  'Append-only VYBZ Credits (Vc) transaction registrar. Closed-loop; no cash-out. Peg 1 Vc = $0.05 USD.';
