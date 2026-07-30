-- Phase 14: Cost Sentinel — cost_events ledger + edge_flags kill-switches.
-- Users read own cost_events; platform admins read all. Service role writes via RPC.

set search_path = public, extensions;

create table if not exists public.cost_events (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users(id) on delete cascade,
  feature       text not null,
  units         numeric not null default 0 check (units >= 0),
  usd_estimate  numeric not null default 0 check (usd_estimate >= 0),
  meta          jsonb not null default '{}'::jsonb,
  created_at    timestamptz not null default now()
);

create index if not exists cost_events_user_created_idx
  on public.cost_events (user_id, created_at desc);

create index if not exists cost_events_feature_created_idx
  on public.cost_events (feature, created_at desc);

create index if not exists cost_events_created_idx
  on public.cost_events (created_at desc);

comment on table public.cost_events is
  'Phase 14 Cost Sentinel telemetry — feature unit + USD estimate per event.';

alter table public.cost_events enable row level security;

drop policy if exists cost_events_select_own on public.cost_events;
create policy cost_events_select_own
  on public.cost_events for select to authenticated
  using (user_id = auth.uid() or public.is_platform_admin());

drop policy if exists cost_events_insert_own on public.cost_events;
create policy cost_events_insert_own
  on public.cost_events for insert to authenticated
  with check (user_id = auth.uid());

-- No update/delete for clients — append-only ledger.

create table if not exists public.edge_flags (
  flag_name    text primary key,
  enabled      boolean not null default true,
  reason       text,
  set_by       uuid references auth.users(id) on delete set null,
  updated_at   timestamptz not null default now()
);

comment on table public.edge_flags is
  'Kill-switch / soft feature flags (e.g. feature:visual-generate:disabled).';

alter table public.edge_flags enable row level security;

drop policy if exists edge_flags_select_authenticated on public.edge_flags;
create policy edge_flags_select_authenticated
  on public.edge_flags for select to authenticated
  using (true);

drop policy if exists edge_flags_select_anon on public.edge_flags;
create policy edge_flags_select_anon
  on public.edge_flags for select to anon
  using (true);

-- Writes only via security definer RPCs / service_role.

create or replace function public.record_cost_event(
  p_feature text,
  p_units numeric,
  p_usd_estimate numeric default 0,
  p_meta jsonb default '{}'::jsonb
)
returns public.cost_events
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.cost_events;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if nullif(btrim(p_feature), '') is null then
    raise exception 'feature required';
  end if;

  insert into public.cost_events (user_id, feature, units, usd_estimate, meta)
  values (
    auth.uid(),
    lower(btrim(p_feature)),
    greatest(0, coalesce(p_units, 0)),
    greatest(0, coalesce(p_usd_estimate, 0)),
    coalesce(p_meta, '{}'::jsonb)
  )
  returning * into r;

  return r;
end;
$fn$;

grant execute on function public.record_cost_event(text, numeric, numeric, jsonb) to authenticated;

create or replace function public.set_edge_flag(
  p_flag_name text,
  p_enabled boolean,
  p_reason text default null
)
returns public.edge_flags
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.edge_flags;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if not public.is_platform_admin() then
    raise exception 'admin only';
  end if;
  if nullif(btrim(p_flag_name), '') is null then
    raise exception 'flag_name required';
  end if;

  insert into public.edge_flags (flag_name, enabled, reason, set_by, updated_at)
  values (btrim(p_flag_name), coalesce(p_enabled, true), nullif(btrim(coalesce(p_reason, '')), ''), auth.uid(), now())
  on conflict (flag_name) do update
    set enabled = excluded.enabled,
        reason = excluded.reason,
        set_by = excluded.set_by,
        updated_at = now()
  returning * into r;

  return r;
end;
$fn$;

grant execute on function public.set_edge_flag(text, boolean, text) to authenticated;

-- Soft-limit helper: when monthly USD for a user exceeds cap, set kill-switch.
-- Called from Edge / client after recordCost (admin or self for own soft disable pattern).
create or replace function public.cost_sentinel_apply_kill_switch(
  p_feature text,
  p_reason text default 'monthly_cap_exceeded'
)
returns public.edge_flags
language plpgsql
security definer
set search_path = public
as $fn$
declare
  flag text;
  r public.edge_flags;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  flag := 'feature:' || lower(btrim(p_feature)) || ':disabled';

  insert into public.edge_flags (flag_name, enabled, reason, set_by, updated_at)
  values (flag, true, coalesce(nullif(btrim(p_reason), ''), 'monthly_cap_exceeded'), auth.uid(), now())
  on conflict (flag_name) do update
    set enabled = true,
        reason = excluded.reason,
        set_by = excluded.set_by,
        updated_at = now()
  returning * into r;

  return r;
end;
$fn$;

grant execute on function public.cost_sentinel_apply_kill_switch(text, text) to authenticated;

create or replace function public.cost_events_month_total_usd(p_user uuid default auth.uid())
returns numeric
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce(sum(usd_estimate), 0)
  from public.cost_events
  where user_id = coalesce(p_user, auth.uid())
    and created_at >= date_trunc('month', now() at time zone 'utc');
$fn$;

grant execute on function public.cost_events_month_total_usd(uuid) to authenticated;
