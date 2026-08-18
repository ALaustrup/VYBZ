-- New-user bootstrap at the already-declared rate: 3600 ATC, 7-day window.
-- Does not mint reception_bonus or referral. Money cannot become ATC.

set search_path = public, extensions;

create or replace function public.grant_bootstrap_atc()
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  created timestamptz;
  rec public.airtime_balances;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  if exists (
    select 1 from public.airtime_ledger
    where user_id = uid and type = 'bootstrap'
  ) then
    return jsonb_build_object('ok', true, 'granted', false, 'reason', 'already');
  end if;

  select p.created_at into created from public.profiles p where p.id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'no_profile');
  end if;
  if created < now() - interval '7 days' then
    return jsonb_build_object('ok', true, 'granted', false, 'reason', 'window_closed');
  end if;

  rec := public._atc_ensure_balance(uid, null);
  update public.airtime_balances
    set earned_balance = earned_balance + 3600,
        updated_at = now()
  where user_id = uid
  returning * into rec;

  insert into public.airtime_ledger (user_id, amount, type, metadata)
  values (uid, 3600, 'bootstrap', jsonb_build_object('window_days', 7));

  return jsonb_build_object(
    'ok', true,
    'granted', true,
    'amount', 3600,
    'daily_free_remaining', rec.daily_free_remaining,
    'earned_balance', rec.earned_balance
  );
end
$fn$;

grant execute on function public.grant_bootstrap_atc() to authenticated;
revoke all on function public.grant_bootstrap_atc() from anon, public;

create or replace function public.get_airtime_balance(p_timezone text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  granted jsonb;
  boot jsonb;
begin
  granted := public.grant_daily_free(p_timezone);
  boot := public.grant_bootstrap_atc();
  if (boot->>'granted') = 'true' then
    granted := granted || jsonb_build_object(
      'earned_balance', (boot->>'earned_balance')::int,
      'bootstrap_granted', true
    );
  end if;
  return granted || jsonb_build_object(
    'total', coalesce((granted->>'daily_free_remaining')::int, 0)
           + coalesce((granted->>'earned_balance')::int, 0)
  );
end
$fn$;

comment on function public.grant_bootstrap_atc() is
  'One 3600 ATC earned grant inside 7 days of profile creation. Not reception or referral.';
