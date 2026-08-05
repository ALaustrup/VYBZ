-- ===========================================================================
-- VYBZ Pro — the hosting entitlement, purchased with Vc.
--
-- Model: analysis, mastering, readiness and export are on-device compute and
-- stay free. Pro pays for the two things that cost money — storing a creator's
-- audio and serving it to listeners.
--
-- Price: 60 Vc per 30 days (= $3.00 at the 1 Vc = $0.05 peg), plus 6 Vc per GB
-- per period above a 10 GB allowance. Every debit goes through _vc_apply, so it
-- lands in the append-only ledger with an idempotency key.
--
-- Additive only. Nothing is dropped and no existing row is rewritten.
-- ===========================================================================

set search_path = public, extensions;

-- ── Entitlement ────────────────────────────────────────────────────────────
-- A real column rather than a jsonb field, so it can be indexed and enforced.
-- `purchase_pro` is the only writer.
alter table public.profiles
  add column if not exists pro_until timestamptz;

comment on column public.profiles.pro_until is
  'End of the paid VYBZ Pro hosting period. Written only by purchase_pro. Null means never subscribed.';

-- Supports the lapse sweep and any "expiring soon" reporting.
create index if not exists profiles_pro_until_idx
  on public.profiles (pro_until)
  where pro_until is not null;

-- ── Ledger kind ────────────────────────────────────────────────────────────
-- Widen the allowed transaction kinds to include the Pro spend.
alter table public.vc_tx_ledger drop constraint if exists vc_tx_ledger_kind_check;
alter table public.vc_tx_ledger add constraint vc_tx_ledger_kind_check
  check (kind in (
    'signup_grant', 'social_earn', 'p2p', 'topup',
    'spend_cosmetic', 'spend_room', 'spend_repo', 'mod_reward', 'adjustment',
    'spend_pro'
  ));

-- ── Purchase ───────────────────────────────────────────────────────────────
-- Charges Vc and extends the period. Extends from the later of now and the
-- existing end, so renewing early never destroys paid time.
create or replace function public.purchase_pro(p_storage_gb numeric default 0)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  base_vc numeric(18,4) := 60;
  incl_gb numeric := 10;
  over_rate numeric(18,4) := 6;
  period_days int := 30;
  over_gb numeric;
  total_vc numeric(18,4);
  bal numeric(18,4);
  cur_until timestamptz;
  new_until timestamptz;
  key text;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  if exists (select 1 from public.profiles where id = uid and coalesce(banned, false)) then
    return jsonb_build_object('ok', false, 'reason', 'account_unavailable');
  end if;

  -- Guard accidental double submission. A deliberate second period is still
  -- possible a few seconds later.
  if exists (
    select 1 from public.vc_tx_ledger
    where from_id = uid and kind = 'spend_pro' and created_at > now() - interval '15 seconds'
  ) then
    select pro_until into cur_until from public.profiles where id = uid;
    return jsonb_build_object(
      'ok', true, 'already', true,
      'proUntil', cur_until,
      'charged', 0,
      'balance', (select mod_points from public.profiles where id = uid)
    );
  end if;

  over_gb := greatest(0, ceil(coalesce(p_storage_gb, 0) - incl_gb));
  total_vc := round(base_vc + (over_gb * over_rate), 4);

  select mod_points, pro_until into bal, cur_until
  from public.profiles where id = uid for update;

  if bal is null then
    return jsonb_build_object('ok', false, 'reason', 'profile_missing');
  end if;

  if bal < total_vc then
    return jsonb_build_object(
      'ok', false, 'reason', 'insufficient_vc',
      'required', total_vc, 'balance', bal, 'shortfall', round(total_vc - bal, 4)
    );
  end if;

  new_until := greatest(coalesce(cur_until, now()), now()) + make_interval(days => period_days);
  key := 'pro:' || uid::text || ':' || floor(extract(epoch from new_until))::text;

  -- Charge through the shared registrar so the ledger and balance stay in step.
  perform public._vc_apply(
    uid, null, total_vc, 'spend_pro', 'entitlement', 'pro',
    'VYBZ Pro hosting · ' || period_days || ' days', key,
    jsonb_build_object(
      'periodDays', period_days,
      'storageGb', coalesce(p_storage_gb, 0),
      'includedGb', incl_gb,
      'overageGb', over_gb,
      'baseVc', base_vc,
      'overageVc', round(over_gb * over_rate, 4)
    )
  );

  update public.profiles set pro_until = new_until where id = uid;

  return jsonb_build_object(
    'ok', true, 'already', false,
    'proUntil', new_until,
    'charged', total_vc,
    'overageGb', over_gb,
    'balance', (select mod_points from public.profiles where id = uid)
  );
end;
$fn$;

grant execute on function public.purchase_pro(numeric) to authenticated;

comment on function public.purchase_pro(numeric) is
  'Charge Vc for one VYBZ Pro hosting period and extend profiles.pro_until. Extends from the later of now and the current end so early renewal never loses paid time.';

-- ── Read-only status ───────────────────────────────────────────────────────
-- Lets the client read entitlement without selecting the whole profile row.
create or replace function public.pro_status()
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  select jsonb_build_object(
    'proUntil', p.pro_until,
    'active', (p.pro_until is not null and p.pro_until > now()),
    'balance', p.mod_points
  )
  from public.profiles p
  where p.id = auth.uid();
$fn$;

grant execute on function public.pro_status() to authenticated;

-- ── Correct the ledger description ─────────────────────────────────────────
-- The 0071 header described a future exchange ticker. Masterplan Law 6 forbids
-- that framing, and it was withdrawn on 2026-08-05. Applied migration history is
-- never rewritten, so the authoritative comment is restated here.
comment on table public.vc_tx_ledger is
  'Append-only VYBZ Credits (Vc) transaction registrar. Closed-loop utility credit at a fixed $0.05 reference. Not tradeable, no cash-out, not a token.';
