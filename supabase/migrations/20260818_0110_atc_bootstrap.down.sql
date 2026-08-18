set search_path = public, extensions;
drop function if exists public.grant_bootstrap_atc();
-- get_airtime_balance stays as the 0110 body; restore from 0105 if rolling back by hand.
