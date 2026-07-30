-- Phase 18: AI minute billing — prepaid seconds ledger + Stripe top-up fulfill.
-- Positive delta_seconds on purchase; negative on AI job debit. Balance = SUM(delta).

set search_path = public, extensions;

create table if not exists public.ai_credit_ledger (
  id             uuid primary key default gen_random_uuid(),
  user_id        uuid not null references auth.users(id) on delete cascade,
  delta_seconds  numeric not null,
  usd            numeric not null default 0,
  reason         text not null,
  meta           jsonb not null default '{}'::jsonb,
  created_at     timestamptz not null default now()
);

create index if not exists ai_credit_ledger_user_created_idx
  on public.ai_credit_ledger (user_id, created_at desc);

comment on table public.ai_credit_ledger is
  'Phase 18 prepaid AI mastering seconds — purchase (+), job debit (−).';

alter table public.ai_credit_ledger enable row level security;

drop policy if exists ai_credit_ledger_select_own on public.ai_credit_ledger;
create policy ai_credit_ledger_select_own
  on public.ai_credit_ledger for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

-- Clients never insert/update/delete — RPCs + service_role only.

create table if not exists public.ai_topups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  pack_id               text not null,
  amount_cents          int not null check (amount_cents > 0),
  seconds               int not null check (seconds > 0),
  status                text not null default 'pending'
                        check (status in ('pending', 'paid', 'failed')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);

create index if not exists ai_topups_user_idx
  on public.ai_topups (user_id, created_at desc);

alter table public.ai_topups enable row level security;

drop policy if exists ai_topups_read_own on public.ai_topups;
create policy ai_topups_read_own on public.ai_topups
  for select to authenticated
  using (user_id = auth.uid());

grant select on public.ai_topups to authenticated;
grant select on public.ai_credit_ledger to authenticated;

create or replace function public.get_ai_credit_balance(p_user_id uuid default null)
returns numeric
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  uid uuid := coalesce(p_user_id, auth.uid());
  bal numeric;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if p_user_id is not null and p_user_id is distinct from auth.uid()
     and auth.uid() is not null
     and not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  select coalesce(sum(delta_seconds), 0) into bal
  from public.ai_credit_ledger
  where user_id = uid;

  return bal;
end;
$fn$;

grant execute on function public.get_ai_credit_balance(uuid) to authenticated, service_role;

create or replace function public.debit_ai_credits(
  p_seconds numeric,
  p_reason text default 'ai_mastering',
  p_usd numeric default 0,
  p_meta jsonb default '{}'::jsonb
)
returns public.ai_credit_ledger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  bal numeric;
  secs numeric := greatest(0, coalesce(p_seconds, 0));
  r public.ai_credit_ledger;
begin
  if uid is null then
    raise exception 'not authenticated';
  end if;
  if secs <= 0 then
    raise exception 'seconds must be positive';
  end if;

  perform pg_advisory_xact_lock(hashtextextended(uid::text, 0));

  select coalesce(sum(delta_seconds), 0) into bal
  from public.ai_credit_ledger
  where user_id = uid;

  if bal < secs then
    raise exception 'ai_credits_insufficient' using errcode = 'P0001';
  end if;

  insert into public.ai_credit_ledger (user_id, delta_seconds, usd, reason, meta)
  values (
    uid,
    -secs,
    greatest(0, coalesce(p_usd, 0)),
    coalesce(nullif(btrim(p_reason), ''), 'ai_mastering'),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning * into r;

  return r;
end;
$fn$;

grant execute on function public.debit_ai_credits(numeric, text, numeric, jsonb) to authenticated;

-- Service-role debit (Edge AI jobs after auth.uid() is unavailable on admin client).
create or replace function public.admin_debit_ai_credits(
  p_user_id uuid,
  p_seconds numeric,
  p_reason text default 'ai_mastering',
  p_usd numeric default 0,
  p_meta jsonb default '{}'::jsonb
)
returns public.ai_credit_ledger
language plpgsql
security definer
set search_path = public
as $fn$
declare
  bal numeric;
  secs numeric := greatest(0, coalesce(p_seconds, 0));
  r public.ai_credit_ledger;
begin
  if p_user_id is null then
    raise exception 'user_id required';
  end if;
  if secs <= 0 then
    raise exception 'seconds must be positive';
  end if;

  -- Serialize debits per user (advisory lock keyed by user uuid).
  perform pg_advisory_xact_lock(hashtextextended(p_user_id::text, 0));

  select coalesce(sum(delta_seconds), 0) into bal
  from public.ai_credit_ledger
  where user_id = p_user_id;

  if bal < secs then
    raise exception 'ai_credits_insufficient' using errcode = 'P0001';
  end if;

  insert into public.ai_credit_ledger (user_id, delta_seconds, usd, reason, meta)
  values (
    p_user_id,
    -secs,
    greatest(0, coalesce(p_usd, 0)),
    coalesce(nullif(btrim(p_reason), ''), 'ai_mastering'),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning * into r;

  return r;
end;
$fn$;

revoke all on function public.admin_debit_ai_credits(uuid, numeric, text, numeric, jsonb)
  from public, anon, authenticated;
grant execute on function public.admin_debit_ai_credits(uuid, numeric, text, numeric, jsonb)
  to service_role;

create or replace function public.fulfill_ai_topup(
  p_session_id text,
  p_payment_intent text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.ai_topups%rowtype;
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_session');
  end if;

  select * into r from public.ai_topups
    where stripe_session_id = p_session_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if r.status = 'paid' then
    return jsonb_build_object(
      'ok', true, 'already', true,
      'seconds', r.seconds, 'userId', r.user_id
    );
  end if;

  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'bad_status', 'status', r.status);
  end if;

  update public.ai_topups set
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
  where id = r.id;

  insert into public.ai_credit_ledger (user_id, delta_seconds, usd, reason, meta)
  values (
    r.user_id,
    r.seconds,
    round(r.amount_cents::numeric / 100.0, 4),
    'purchase',
    jsonb_build_object(
      'pack_id', r.pack_id,
      'stripe_session_id', r.stripe_session_id,
      'ai_topup_id', r.id
    )
  );

  return jsonb_build_object(
    'ok', true, 'already', false,
    'seconds', r.seconds, 'userId', r.user_id
  );
end;
$fn$;

revoke all on function public.fulfill_ai_topup(text, text) from public, anon, authenticated;
grant execute on function public.fulfill_ai_topup(text, text) to service_role;
