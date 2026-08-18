-- Reception bonus and referral stay on the ledger CHECK.
-- Their mint amounts are Not measured. These RPCs insert nothing.

set search_path = public, extensions;

create or replace function public.award_reception_bonus()
returns jsonb
language sql
stable
as $fn$
  select jsonb_build_object(
    'ok', false,
    'error', 'rates_not_measured',
    'type', 'reception_bonus',
    'amount', 'Not measured'
  );
$fn$;

create or replace function public.award_referral()
returns jsonb
language sql
stable
as $fn$
  select jsonb_build_object(
    'ok', false,
    'error', 'rates_not_measured',
    'type', 'referral',
    'amount', 'Not measured'
  );
$fn$;

grant execute on function public.award_reception_bonus() to authenticated;
grant execute on function public.award_referral() to authenticated;
revoke all on function public.award_reception_bonus() from anon, public;
revoke all on function public.award_referral() from anon, public;

comment on function public.award_reception_bonus() is
  'Refuses to mint ATC. Reception bonus amount is Not measured.';
comment on function public.award_referral() is
  'Refuses to mint ATC. Referral amount is Not measured.';
