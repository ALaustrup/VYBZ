-- ===========================================================================
-- Unified Social Live — Phase 1 (schema + RLS + V¢ room subscriptions)
--
-- Promotes IDEAS_BACKLOG "Unified Social Live": one public live quality tier;
-- premium text/voice rooms monetized via recurring V¢ (closed-loop mod_points).
-- No UI / SFU in this migration — data plane only.
--
-- V¢ assumptions (owner-promoted closed-loop):
--   • Balance = profiles.mod_points (UI may label as V¢)
--   • Spend-only; no cash-out from room earnings
--   • Ledger rows are the audit source of truth; never trust the client
-- ===========================================================================

set search_path = public, extensions;

-- ── Live: unified public tier metadata (transport stays Phase 2) ─────────────
alter table public.live_sessions
  add column if not exists visibility text not null default 'public'
    check (visibility in ('public')),
  add column if not exists quality_tier text not null default 'ultra'
    check (quality_tier in ('ultra')),
  add column if not exists input_mode text
    check (input_mode is null or input_mode in ('camera', 'display', 'both')),
  add column if not exists scheduled_at timestamptz,
  add column if not exists vod_bunny_path text,
  add column if not exists monetization jsonb not null default '{}'::jsonb;

comment on column public.live_sessions.quality_tier is
  'Unified Social Live: single ultra-low-latency tier — no Clubz/fragmented tiers.';
comment on column public.live_sessions.monetization is
  'Host tips/goals config only; watching stays free. No paid quality tiers.';

-- Backfill input_mode from legacy source when null
update public.live_sessions
  set input_mode = source
where input_mode is null and source is not null;

create index if not exists live_sessions_top_public_idx
  on public.live_sessions (viewer_count desc, started_at desc)
  where status = 'live' and visibility = 'public';

-- Top N live for Social tab (Phase 3 UI will call this)
create or replace function public.top_live_sessions(p_limit int default 3)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select
      s.id, s.host_id, p.username, p.display_name, p.avatar_url,
      s.title, s.source, coalesce(s.input_mode, s.source) as input_mode,
      s.intent, s.viewer_count, s.playback_hls, s.started_at,
      s.quality_tier, s.visibility
    from public.live_sessions s
    join public.profiles p on p.id = s.host_id
    where s.status = 'live'
      and s.expires_at > now()
      and s.visibility = 'public'
      and coalesce(p.banned, false) = false
    order by s.viewer_count desc, s.started_at desc
    limit greatest(1, least(coalesce(p_limit, 3), 12))
  ) t;
$fn$;
grant execute on function public.top_live_sessions(int) to authenticated;

-- ── Rooms: additive social / premium columns (keep taxonomy rooms) ───────────
alter table public.rooms drop constraint if exists rooms_kind_check;
alter table public.rooms
  add constraint rooms_kind_check check (kind in ('role', 'genre', 'daw', 'social'));

alter table public.rooms
  add column if not exists owner_id uuid references public.profiles(id) on delete set null,
  add column if not exists access_tier text not null default 'free'
    check (access_tier in ('free', 'premium')),
  add column if not exists vc_price int
    check (vc_price is null or vc_price >= 0),
  add column if not exists billing_period text
    check (billing_period is null or billing_period in ('week', 'month')),
  add column if not exists perks jsonb not null default '{}'::jsonb,
  add column if not exists description text,
  add column if not exists is_active boolean not null default true,
  add column if not exists voice_enabled boolean not null default false;

-- Taxonomy rooms stay free/open; premium only allowed for kind=social
alter table public.rooms drop constraint if exists rooms_premium_social_chk;
alter table public.rooms
  add constraint rooms_premium_social_chk check (
    access_tier = 'free'
    or (kind = 'social' and owner_id is not null and vc_price is not null and vc_price > 0
        and billing_period is not null)
  );

create index if not exists rooms_social_idx on public.rooms(kind, access_tier)
  where kind = 'social' and is_active;

create index if not exists rooms_owner_idx on public.rooms(owner_id)
  where owner_id is not null;

-- ── Memberships + V¢ ledger ──────────────────────────────────────────────────
create table if not exists public.room_memberships (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'active'
    check (status in ('active', 'past_due', 'canceled', 'expired')),
  period_start timestamptz not null default now(),
  period_end timestamptz not null,
  cancel_at_period_end boolean not null default false,
  last_ledger_id uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (room_id, user_id)
);
create index if not exists room_memberships_active_idx
  on public.room_memberships(room_id, status)
  where status = 'active';
create index if not exists room_memberships_renew_idx
  on public.room_memberships(period_end)
  where status = 'active' and cancel_at_period_end = false;

alter table public.room_memberships enable row level security;

create table if not exists public.vc_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  counterparty_id uuid references public.profiles(id) on delete set null,
  room_id uuid references public.rooms(id) on delete set null,
  membership_id uuid references public.room_memberships(id) on delete set null,
  direction text not null check (direction in ('debit', 'credit')),
  amount int not null check (amount > 0),
  reason text not null check (reason in (
    'room_sub_initial', 'room_sub_renewal', 'room_sub_owner_share',
    'room_sub_platform_fee', 'adjustment'
  )),
  idempotency_key text not null,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (idempotency_key)
);
create index if not exists vc_ledger_user_idx on public.vc_ledger(user_id, created_at desc);
create index if not exists vc_ledger_room_idx on public.vc_ledger(room_id, created_at desc);

alter table public.vc_ledger enable row level security;

-- Deny-all direct writes; reads via policies / RPCs
create policy "room_memberships read own or owner"
  on public.room_memberships for select using (
    user_id = auth.uid()
    or exists (
      select 1 from public.rooms r
      where r.id = room_id and r.owner_id = auth.uid()
    )
  );

create policy "vc_ledger read own"
  on public.vc_ledger for select using (user_id = auth.uid() or counterparty_id = auth.uid());

grant select on public.room_memberships to authenticated;
grant select on public.vc_ledger to authenticated;

-- ── Access helpers ───────────────────────────────────────────────────────────
create or replace function public.has_active_room_membership(p_room uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.room_memberships m
    where m.room_id = p_room
      and m.user_id = p_uid
      and m.status = 'active'
      and m.period_end > now()
  );
$fn$;

create or replace function public.can_access_room(p_room uuid, p_uid uuid default auth.uid())
returns boolean language sql stable security definer set search_path = public as $fn$
  select case
    when p_uid is null then false
    when not exists (select 1 from public.rooms r where r.id = p_room and r.is_active) then false
    when exists (
      select 1 from public.rooms r
      where r.id = p_room and (r.access_tier = 'free' or r.owner_id = p_uid)
    ) then true
    else public.has_active_room_membership(p_room, p_uid)
  end;
$fn$;

grant execute on function public.has_active_room_membership(uuid, uuid) to authenticated;
grant execute on function public.can_access_room(uuid, uuid) to authenticated;

-- Tighten room message RLS for premium rooms (taxonomy free rooms unchanged)
drop policy if exists "room messages read" on public.room_messages;
drop policy if exists "room messages send" on public.room_messages;

create policy "room messages read" on public.room_messages
  for select using (public.can_access_room(room_id, auth.uid()));

create policy "room messages send" on public.room_messages
  for insert with check (
    sender_id = auth.uid()
    and length(btrim(body)) between 1 and 2000
    and public.can_access_room(room_id, auth.uid())
  );

-- Catalog: free rooms always listed; premium listed but join gated
drop function if exists public.list_rooms();
create or replace function public.list_rooms()
returns table(
  id uuid,
  kind text,
  ref_id text,
  title text,
  messages int,
  last_at timestamptz,
  access_tier text,
  vc_price int,
  billing_period text,
  owner_id uuid,
  voice_enabled boolean,
  perks jsonb
)
language sql security definer set search_path = public stable as $fn$
  select
    r.id, r.kind, r.ref_id, r.title,
    (select count(*)::int from public.room_messages m where m.room_id = r.id) as messages,
    (select max(m.created_at) from public.room_messages m where m.room_id = r.id) as last_at,
    r.access_tier, r.vc_price, r.billing_period, r.owner_id, r.voice_enabled, r.perks
  from public.rooms r
  where r.is_active
  order by
    case when r.kind = 'social' then 0 else 1 end,
    r.kind, r.sort, r.title;
$fn$;
grant execute on function public.list_rooms() to authenticated;

create or replace function public.list_social_rooms(p_limit int default 40)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select
      r.id, r.title, r.description, r.access_tier, r.vc_price, r.billing_period,
      r.perks, r.voice_enabled, r.owner_id, pr.username as owner_username,
      (select count(*)::int from public.room_memberships m
        where m.room_id = r.id and m.status = 'active' and m.period_end > now()) as members,
      public.can_access_room(r.id, auth.uid()) as can_access
    from public.rooms r
    left join public.profiles pr on pr.id = r.owner_id
    where r.kind = 'social' and r.is_active
    order by r.created_at desc
    limit greatest(1, least(coalesce(p_limit, 40), 100))
  ) t;
$fn$;
grant execute on function public.list_social_rooms(int) to authenticated;

-- ── Create premium / free social room ────────────────────────────────────────
create or replace function public.create_social_room(
  p_title text,
  p_description text default null,
  p_access_tier text default 'free',
  p_vc_price int default null,
  p_billing_period text default null,
  p_perks jsonb default '{}'::jsonb,
  p_voice_enabled boolean default false
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  rid uuid;
  slug text;
  tier text := coalesce(nullif(trim(p_access_tier), ''), 'free');
begin
  if uid is null or coalesce(trim(p_title), '') = '' then return null; end if;
  if tier not in ('free', 'premium') then tier := 'free'; end if;
  if tier = 'premium' then
    if p_vc_price is null or p_vc_price < 1 then return null; end if;
    if coalesce(p_billing_period, '') not in ('week', 'month') then return null; end if;
  end if;

  slug := lower(regexp_replace(trim(p_title), '[^a-zA-Z0-9]+', '-', 'g'));
  slug := trim(both '-' from slug);
  if slug = '' then slug := 'room'; end if;
  slug := left(slug, 40) || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  insert into public.rooms (
    kind, ref_id, title, sort, owner_id, access_tier, vc_price, billing_period,
    perks, description, voice_enabled
  ) values (
    'social', slug, trim(p_title), 0, uid, tier,
    case when tier = 'premium' then p_vc_price else null end,
    case when tier = 'premium' then p_billing_period else null end,
    coalesce(p_perks, '{}'::jsonb),
    nullif(trim(coalesce(p_description, '')), ''),
    coalesce(p_voice_enabled, false)
  ) returning id into rid;
  return rid;
end $fn$;
grant execute on function public.create_social_room(text, text, text, int, text, jsonb, boolean) to authenticated;

-- ── Internal: post ledger + mutate balances (closed-loop) ────────────────────
create or replace function public._vc_post(
  p_user uuid,
  p_counterparty uuid,
  p_room uuid,
  p_membership uuid,
  p_direction text,
  p_amount int,
  p_reason text,
  p_idempotency text,
  p_meta jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  lid uuid;
begin
  if p_amount is null or p_amount < 1 then
    raise exception 'invalid_vc_amount';
  end if;
  insert into public.vc_ledger (
    user_id, counterparty_id, room_id, membership_id,
    direction, amount, reason, idempotency_key, meta
  ) values (
    p_user, p_counterparty, p_room, p_membership,
    p_direction, p_amount, p_reason, p_idempotency, coalesce(p_meta, '{}'::jsonb)
  )
  on conflict (idempotency_key) do nothing
  returning id into lid;

  if lid is null then
    select id into lid from public.vc_ledger where idempotency_key = p_idempotency;
    return lid;
  end if;

  if p_direction = 'debit' then
    update public.profiles
      set mod_points = mod_points - p_amount
    where id = p_user and mod_points >= p_amount;
    if not found then
      delete from public.vc_ledger where id = lid;
      raise exception 'insufficient_vc';
    end if;
  else
    update public.profiles
      set mod_points = coalesce(mod_points, 0) + p_amount
    where id = p_user;
  end if;
  return lid;
end $fn$;

create or replace function public._room_period_interval(p_period text)
returns interval language sql immutable as $fn$
  select case p_period when 'week' then interval '7 days' else interval '1 month' end;
$fn$;

-- Subscribe (initial period debit) — member pays; owner gets share; 5% platform fee burned
create or replace function public.subscribe_room_vc(p_room uuid)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  r public.rooms%rowtype;
  mid uuid;
  period_end timestamptz;
  fee int;
  owner_get int;
  debit_id uuid;
  existing public.room_memberships%rowtype;
  idem text;
begin
  if uid is null then return null; end if;
  select * into r from public.rooms where id = p_room and is_active for update;
  if not found or r.access_tier <> 'premium' or r.kind <> 'social' then
    raise exception 'room_not_premium';
  end if;
  if r.owner_id = uid then raise exception 'owner_cannot_subscribe'; end if;

  select * into existing from public.room_memberships
  where room_id = p_room and user_id = uid;
  if found and existing.status = 'active' and existing.period_end > now() then
    return existing.id;
  end if;

  period_end := now() + public._room_period_interval(r.billing_period);
  fee := greatest(0, (r.vc_price * 5) / 100);
  owner_get := r.vc_price - fee;
  idem := 'room_sub_initial:' || p_room::text || ':' || uid::text || ':' || to_char(now(), 'YYYYMMDDHH24');

  if existing.id is null then
    insert into public.room_memberships (
      room_id, user_id, status, period_start, period_end
    ) values (p_room, uid, 'active', now(), period_end)
    returning id into mid;
  else
    update public.room_memberships set
      status = 'active',
      period_start = now(),
      period_end = period_end,
      cancel_at_period_end = false,
      updated_at = now()
    where id = existing.id
    returning id into mid;
  end if;

  begin
    debit_id := public._vc_post(
      uid, r.owner_id, p_room, mid, 'debit', r.vc_price,
      'room_sub_initial', idem || ':debit',
      jsonb_build_object('billing_period', r.billing_period)
    );
  exception when others then
    if existing.id is null then
      delete from public.room_memberships where id = mid;
    else
      update public.room_memberships set status = 'past_due', updated_at = now() where id = mid;
    end if;
    raise;
  end;

  perform public._vc_post(
    r.owner_id, uid, p_room, mid, 'credit', owner_get,
    'room_sub_owner_share', idem || ':owner',
    jsonb_build_object('from', uid)
  );
  -- Platform fee: informational ledger only (already withheld from owner_get; no balance mutate)
  if fee > 0 then
    insert into public.vc_ledger (
      user_id, counterparty_id, room_id, membership_id, direction, amount, reason, idempotency_key, meta
    ) values (
      r.owner_id, null, p_room, mid, 'debit', fee, 'room_sub_platform_fee', idem || ':fee',
      jsonb_build_object('burned', true, 'informational', true)
    ) on conflict (idempotency_key) do nothing;
  end if;

  update public.room_memberships set last_ledger_id = debit_id, updated_at = now() where id = mid;
  return mid;
end $fn$;
grant execute on function public.subscribe_room_vc(uuid) to authenticated;

create or replace function public.cancel_room_subscription(p_room uuid)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  update public.room_memberships
    set cancel_at_period_end = true, updated_at = now()
  where room_id = p_room and user_id = uid and status = 'active';
  return found;
end $fn$;
grant execute on function public.cancel_room_subscription(uuid) to authenticated;

-- Automated renewals: call from Edge cron / pg_cron with service role.
-- Idempotent per membership + period_end day.
create or replace function public.process_vc_room_renewals(p_limit int default 100)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  rec record;
  processed int := 0;
  failed int := 0;
  expired int := 0;
  fee int;
  owner_get int;
  period_end timestamptz;
  idem text;
  r public.rooms%rowtype;
begin
  -- Expire canceled or failed renewals past period_end
  update public.room_memberships m
    set status = 'expired', updated_at = now()
  where m.status in ('active', 'past_due')
    and m.period_end <= now()
    and (m.cancel_at_period_end = true or m.status = 'past_due');
  get diagnostics expired = row_count;

  for rec in
    select m.*
    from public.room_memberships m
    join public.rooms rm on rm.id = m.room_id and rm.access_tier = 'premium' and rm.is_active
    where m.status = 'active'
      and m.cancel_at_period_end = false
      and m.period_end <= now() + interval '1 hour'
    order by m.period_end
    limit greatest(1, least(coalesce(p_limit, 100), 500))
  loop
    select * into r from public.rooms where id = rec.room_id;
    fee := greatest(0, (r.vc_price * 5) / 100);
    owner_get := r.vc_price - fee;
    period_end := rec.period_end + public._room_period_interval(r.billing_period);
    idem := 'room_sub_renewal:' || rec.id::text || ':' || to_char(rec.period_end, 'YYYYMMDDHH24MI');

    begin
      perform public._vc_post(
        rec.user_id, r.owner_id, r.id, rec.id, 'debit', r.vc_price,
        'room_sub_renewal', idem || ':debit', '{}'::jsonb
      );
      perform public._vc_post(
        r.owner_id, rec.user_id, r.id, rec.id, 'credit', owner_get,
        'room_sub_owner_share', idem || ':owner', '{}'::jsonb
      );
      if fee > 0 then
        insert into public.vc_ledger (
          user_id, room_id, membership_id, direction, amount, reason, idempotency_key, meta
        ) values (
          r.owner_id, r.id, rec.id, 'debit', fee, 'room_sub_platform_fee', idem || ':fee',
          jsonb_build_object('burned', true, 'note', 'withheld; no balance change')
        ) on conflict (idempotency_key) do nothing;
      end if;

      update public.room_memberships set
        period_start = rec.period_end,
        period_end = period_end,
        status = 'active',
        updated_at = now()
      where id = rec.id;
      processed := processed + 1;
    exception when others then
      update public.room_memberships set status = 'past_due', updated_at = now() where id = rec.id;
      failed := failed + 1;
    end;
  end loop;

  return jsonb_build_object(
    'renewed', processed,
    'failed', failed,
    'expired', expired,
    'at', now()
  );
end $fn$;
-- Not granted to authenticated — service role / Edge cron only
revoke all on function public.process_vc_room_renewals(int) from public, anon, authenticated;
grant execute on function public.process_vc_room_renewals(int) to service_role;

comment on function public.process_vc_room_renewals(int) is
  'Unified Social Live Phase 1: invoke hourly via Edge cron (service role). Renews V¢ room subs; marks past_due on insufficient balance.';
