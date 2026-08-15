-- Self-serve alpha keys.
--
-- OR-023 shipped an admin-minted, invite-only gate. This adds a public path: a
-- visitor enters an email, receives a key bound to that email, and redeems it
-- through the existing flow. Redemption already binds key -> user, so the chain
-- email -> key -> account -> username is complete without new plumbing.
--
-- This deliberately converts the gate from "invite-only" to "email-tagged open
-- alpha". Anyone with an email address can obtain a key. What it buys is
-- attribution and a throttle, not exclusivity.
--
-- Additive only: new columns, one new table, two new functions. Existing
-- admin minting and redemption are untouched.

set search_path = public, extensions;

-- ── Bind a key to the address that requested it ────────────────────────────
alter table public.invite_keys
  add column if not exists issued_to_email text,
  add column if not exists source text not null default 'admin';

comment on column public.invite_keys.issued_to_email is
  'Email a self-serve key was issued to. Null for admin-minted batches.';
comment on column public.invite_keys.source is
  'admin | self — how the key came to exist.';

create index if not exists invite_keys_email_idx
  on public.invite_keys (lower(issued_to_email))
  where issued_to_email is not null;

-- ── Throttle ───────────────────────────────────────────────────────────────
-- IPs are stored hashed; the edge function salts them so a raw address is never
-- written here.
create table if not exists public.alpha_key_requests (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  ip_hash text,
  created_at timestamptz not null default now()
);

create index if not exists alpha_key_requests_email_idx
  on public.alpha_key_requests (lower(email), created_at desc);
create index if not exists alpha_key_requests_ip_idx
  on public.alpha_key_requests (ip_hash, created_at desc)
  where ip_hash is not null;

alter table public.alpha_key_requests enable row level security;
revoke all on public.alpha_key_requests from anon, authenticated;
grant select, insert on public.alpha_key_requests to service_role;

comment on table public.alpha_key_requests is
  'Rate-limit ledger for self-serve alpha keys. Hashed IPs only.';

-- ── Issue (service role only; called by the alpha-key edge function) ───────
create or replace function public.issue_self_alpha_key(
  p_email text,
  p_ip_hash text default null
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  norm_email text := lower(btrim(coalesce(p_email, '')));
  per_email_limit constant int := 3;
  per_ip_limit constant int := 10;
  window_span constant interval := interval '24 hours';
  recent_email int;
  recent_ip int;
  token text;
  code text;
  hid text;
  kid uuid;
  exp_at timestamptz := now() + interval '30 days';
begin
  if norm_email = '' or norm_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' or length(norm_email) > 254 then
    return jsonb_build_object('ok', false, 'reason', 'invalid_email');
  end if;

  select count(*) into recent_email
    from public.alpha_key_requests
   where lower(email) = norm_email
     and created_at > now() - window_span;
  if recent_email >= per_email_limit then
    return jsonb_build_object('ok', false, 'reason', 'rate_limited_email');
  end if;

  if p_ip_hash is not null then
    select count(*) into recent_ip
      from public.alpha_key_requests
     where ip_hash = p_ip_hash
       and created_at > now() - window_span;
    if recent_ip >= per_ip_limit then
      return jsonb_build_object('ok', false, 'reason', 'rate_limited_ip');
    end if;
  end if;

  -- Only the newest key for an address stays live, so re-requesting cannot
  -- accumulate a pile of working keys.
  update public.invite_keys
     set revoked_at = now()
   where source = 'self'
     and lower(issued_to_email) = norm_email
     and revoked_at is null
     and redeemed_count = 0;

  loop
    token := upper(substr(encode(gen_random_bytes(6), 'hex'), 1, 8));
    code := 'VYBZ-A1-SELF-' || token;
    hid := public._invite_hash_code(code);
    begin
      insert into public.invite_keys (
        code_hash, code_prefix, batch_id, note,
        max_redemptions, expires_at, issued_to_email, source
      ) values (
        hid, left(code, 14), 'SELF', 'self-serve alpha key',
        1, exp_at, norm_email, 'self'
      )
      returning id into kid;
      exit;
    exception when unique_violation then
      null; -- rare hash collision; retry
    end;
  end loop;

  insert into public.alpha_key_requests (email, ip_hash)
  values (norm_email, p_ip_hash);

  return jsonb_build_object(
    'ok', true,
    'code', code,
    'keyId', kid,
    'expiresAt', exp_at
  );
end
$fn$;

revoke all on function public.issue_self_alpha_key(text, text) from public, anon, authenticated;
grant execute on function public.issue_self_alpha_key(text, text) to service_role;

-- ── Who redeemed what (admin view of the email -> account chain) ───────────
create or replace function public.admin_self_key_chain(p_limit integer default 100)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select case
    when not public.is_platform_admin() then '[]'::jsonb
    else coalesce((
      select jsonb_agg(row_to_json(x)::jsonb order by x."issuedAt" desc)
      from (
        select
          k.issued_to_email as "email",
          k.code_prefix     as "codePrefix",
          k.created_at      as "issuedAt",
          k.redeemed_count  as "redeemedCount",
          k.revoked_at      as "revokedAt",
          p.username        as "username",
          r.redeemed_at     as "redeemedAt"
        from public.invite_keys k
        left join public.invite_redemptions r on r.key_id = k.id
        left join public.profiles p on p.id = r.user_id
        where k.source = 'self'
        order by k.created_at desc
        limit greatest(1, least(coalesce(p_limit, 100), 500))
      ) x
    ), '[]'::jsonb)
  end;
$fn$;

grant execute on function public.admin_self_key_chain(integer) to authenticated;
