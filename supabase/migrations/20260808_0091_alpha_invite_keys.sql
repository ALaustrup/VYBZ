-- ===========================================================================
-- OR-023 — Alpha invite keys (hard gate).
--
-- Invite-only alpha: signed-in users need profiles.alpha_access_at (or admin)
-- before the suite shell. Existing profiles are grandfathered so current
-- accounts are not locked out. New signups redeem a one-time (or limited)
-- invite key. Codes are stored hashed; plaintext is returned only at mint.
-- ===========================================================================

set search_path = public, extensions;

-- ── Entitlement column ─────────────────────────────────────────────────────
alter table public.profiles
  add column if not exists alpha_access_at timestamptz;

comment on column public.profiles.alpha_access_at is
  'When the account received alpha access (invite redeem or grandfather). Null = gated. Admins bypass via is_platform_admin().';

create index if not exists profiles_alpha_access_at_idx
  on public.profiles (alpha_access_at)
  where alpha_access_at is not null;

-- Grandfather everyone who already has a profile so the hard gate does not
-- lock out the owner or early testers who signed up before invite keys.
update public.profiles
set alpha_access_at = coalesce(alpha_access_at, created_at, now())
where alpha_access_at is null;

-- ── Keys ───────────────────────────────────────────────────────────────────
create table if not exists public.invite_keys (
  id uuid primary key default gen_random_uuid(),
  code_hash text not null,
  code_prefix text not null,
  batch_id text not null default 'A1',
  note text,
  max_redemptions integer not null default 1
    check (max_redemptions >= 1 and max_redemptions <= 100),
  redeemed_count integer not null default 0
    check (redeemed_count >= 0),
  expires_at timestamptz,
  revoked_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  constraint invite_keys_code_hash_unique unique (code_hash),
  constraint invite_keys_redeemed_lte_max check (redeemed_count <= max_redemptions)
);

create index if not exists invite_keys_batch_idx
  on public.invite_keys (batch_id, created_at desc);

create index if not exists invite_keys_prefix_idx
  on public.invite_keys (code_prefix);

create table if not exists public.invite_redemptions (
  id uuid primary key default gen_random_uuid(),
  key_id uuid not null references public.invite_keys(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  redeemed_at timestamptz not null default now(),
  constraint invite_redemptions_user_unique unique (user_id),
  constraint invite_redemptions_key_user_unique unique (key_id, user_id)
);

create index if not exists invite_redemptions_key_idx
  on public.invite_redemptions (key_id, redeemed_at desc);

alter table public.invite_keys enable row level security;
alter table public.invite_redemptions enable row level security;

revoke all on public.invite_keys from anon, authenticated;
revoke all on public.invite_redemptions from anon, authenticated;
grant select, insert, update on public.invite_keys to service_role;
grant select, insert on public.invite_redemptions to service_role;

comment on table public.invite_keys is
  'Alpha invite keys; code_hash only. Mint via mint_invite_keys; redeem via redeem_invite_key.';
comment on table public.invite_redemptions is
  'One redeem row per user; binds invite_keys → profiles.alpha_access_at.';

-- ── Helpers ────────────────────────────────────────────────────────────────
create or replace function public._invite_normalize_code(p_code text)
returns text
language sql
immutable
as $fn$
  select upper(regexp_replace(trim(coalesce(p_code, '')), '\s+', '', 'g'));
$fn$;

create or replace function public._invite_hash_code(p_code text)
returns text
language sql
stable
set search_path = public, extensions
as $fn$
  select encode(digest(public._invite_normalize_code(p_code), 'sha256'), 'hex');
$fn$;

create or replace function public.has_alpha_access()
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((
    select alpha_access_at is not null
        or platform_role = 'admin'
        or coalesce(is_admin, false)
    from public.profiles
    where id = auth.uid()
  ), false);
$fn$;

grant execute on function public.has_alpha_access() to authenticated;

-- ── Mint (admin) ───────────────────────────────────────────────────────────
create or replace function public.mint_invite_keys(
  p_count integer default 1,
  p_batch text default 'A1',
  p_note text default null,
  p_expires_days integer default 30,
  p_max_redemptions integer default 1
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  uid uuid := auth.uid();
  n int := greatest(1, least(coalesce(p_count, 1), 100));
  batch text := upper(regexp_replace(coalesce(nullif(trim(p_batch), ''), 'A1'), '[^A-Z0-9]', '', 'g'));
  max_r int := greatest(1, least(coalesce(p_max_redemptions, 1), 100));
  exp_days int := greatest(1, least(coalesce(p_expires_days, 30), 365));
  exp_at timestamptz := now() + make_interval(days => exp_days);
  note text := nullif(btrim(coalesce(p_note, '')), '');
  i int;
  token text;
  code text;
  hid text;
  kid uuid;
  codes jsonb := '[]'::jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;
  if not public.is_platform_admin() then
    return jsonb_build_object('ok', false, 'reason', 'admin_only');
  end if;
  if length(batch) < 2 then batch := 'A1'; end if;
  if length(batch) > 12 then batch := left(batch, 12); end if;

  for i in 1..n loop
    loop
      token := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
      code := 'VYBZ-A1-' || batch || '-' || token;
      hid := public._invite_hash_code(code);
      begin
        insert into public.invite_keys (
          code_hash, code_prefix, batch_id, note, max_redemptions, expires_at, created_by
        ) values (
          hid, left(code, 14), batch, note, max_r, exp_at, uid
        )
        returning id into kid;
        exit;
      exception when unique_violation then
        -- rare hash collision; retry
        null;
      end;
    end loop;

    codes := codes || jsonb_build_array(jsonb_build_object(
      'id', kid,
      'code', code,
      'batchId', batch,
      'expiresAt', exp_at,
      'maxRedemptions', max_r
    ));
  end loop;

  perform public._staff_log(uid, 'mint_invite_keys', 'invite_batch', null,
    format('%s keys batch=%s expires_days=%s', n, batch, exp_days), 0);

  return jsonb_build_object(
    'ok', true,
    'count', n,
    'batchId', batch,
    'expiresAt', exp_at,
    'codes', codes
  );
end
$fn$;

grant execute on function public.mint_invite_keys(integer, text, text, integer, integer) to authenticated;

-- ── Redeem (any signed-in user) ────────────────────────────────────────────
create or replace function public.redeem_invite_key(p_code text)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  uid uuid := auth.uid();
  norm text := public._invite_normalize_code(p_code);
  hid text;
  k public.invite_keys%rowtype;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  if exists (select 1 from public.profiles where id = uid and coalesce(banned, false)) then
    return jsonb_build_object('ok', false, 'reason', 'account_unavailable');
  end if;

  if exists (
    select 1 from public.profiles
    where id = uid and (alpha_access_at is not null or platform_role = 'admin' or coalesce(is_admin, false))
  ) then
    return jsonb_build_object('ok', true, 'already', true);
  end if;

  if norm = '' or length(norm) < 10 or length(norm) > 64 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;

  hid := public._invite_hash_code(norm);

  select * into k from public.invite_keys where code_hash = hid for update;
  if not found then
    return jsonb_build_object('ok', false, 'reason', 'invalid_code');
  end if;
  if k.revoked_at is not null then
    return jsonb_build_object('ok', false, 'reason', 'revoked');
  end if;
  if k.expires_at is not null and k.expires_at < now() then
    return jsonb_build_object('ok', false, 'reason', 'expired');
  end if;
  if k.redeemed_count >= k.max_redemptions then
    return jsonb_build_object('ok', false, 'reason', 'already_used');
  end if;

  insert into public.invite_redemptions (key_id, user_id)
  values (k.id, uid);

  update public.invite_keys
  set redeemed_count = redeemed_count + 1
  where id = k.id;

  update public.profiles
  set alpha_access_at = now()
  where id = uid and alpha_access_at is null;

  return jsonb_build_object('ok', true, 'already', false, 'batchId', k.batch_id);
exception
  when unique_violation then
    -- Concurrent redeem or user already redeemed another key.
    if exists (
      select 1 from public.profiles where id = uid and alpha_access_at is not null
    ) then
      return jsonb_build_object('ok', true, 'already', true);
    end if;
    return jsonb_build_object('ok', false, 'reason', 'already_used');
end
$fn$;

grant execute on function public.redeem_invite_key(text) to authenticated;

-- ── Admin grant / revoke / list ────────────────────────────────────────────
create or replace function public.admin_grant_alpha_access(p_user uuid, p_note text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;
  if not public.is_platform_admin() then
    return jsonb_build_object('ok', false, 'reason', 'admin_only');
  end if;
  if p_user is null then
    return jsonb_build_object('ok', false, 'reason', 'invalid_user');
  end if;

  update public.profiles
  set alpha_access_at = coalesce(alpha_access_at, now())
  where id = p_user;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'user_not_found');
  end if;

  perform public._staff_log(uid, 'grant_alpha_access', 'profile', p_user,
    nullif(btrim(coalesce(p_note, '')), ''), 0);

  return jsonb_build_object('ok', true);
end
$fn$;

grant execute on function public.admin_grant_alpha_access(uuid, text) to authenticated;

create or replace function public.admin_revoke_invite_keys(
  p_batch text default null,
  p_key_id uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  n int := 0;
  batch text := upper(regexp_replace(coalesce(nullif(trim(p_batch), ''), ''), '[^A-Z0-9]', '', 'g'));
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;
  if not public.is_platform_admin() then
    return jsonb_build_object('ok', false, 'reason', 'admin_only');
  end if;
  if p_key_id is null and batch = '' then
    return jsonb_build_object('ok', false, 'reason', 'batch_or_id_required');
  end if;

  if p_key_id is not null then
    update public.invite_keys
    set revoked_at = coalesce(revoked_at, now())
    where id = p_key_id and revoked_at is null;
    get diagnostics n = row_count;
  else
    update public.invite_keys
    set revoked_at = coalesce(revoked_at, now())
    where batch_id = batch and revoked_at is null;
    get diagnostics n = row_count;
  end if;

  perform public._staff_log(uid, 'revoke_invite_keys', 'invite_batch', p_key_id,
    format('revoked=%s batch=%s', n, nullif(batch, '')), 0);

  return jsonb_build_object('ok', true, 'revoked', n);
end
$fn$;

grant execute on function public.admin_revoke_invite_keys(text, uuid) to authenticated;

create or replace function public.admin_list_invite_keys(p_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not public.is_platform_admin() then '[]'::jsonb
    else coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x."createdAt" desc)
      from (
        select
          k.id as "id",
          k.code_prefix as "codePrefix",
          k.batch_id as "batchId",
          k.note as "note",
          k.max_redemptions as "maxRedemptions",
          k.redeemed_count as "redeemedCount",
          k.expires_at as "expiresAt",
          k.revoked_at as "revokedAt",
          k.created_at as "createdAt",
          k.created_by as "createdBy"
        from public.invite_keys k
        order by k.created_at desc
        limit greatest(1, least(coalesce(p_limit, 100), 500))
      ) x
    ), '[]'::jsonb)
  end;
$fn$;

grant execute on function public.admin_list_invite_keys(integer) to authenticated;
