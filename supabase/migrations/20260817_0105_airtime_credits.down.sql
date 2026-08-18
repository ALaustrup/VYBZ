-- Reverse 0105. Drops ATC ledger objects. Does not touch Station or V¢.

set search_path = public, extensions;

drop function if exists public.atc_abuse_review(int);
drop function if exists public.can_start_live();
drop function if exists public.report_listen_heartbeat(uuid, boolean, boolean);
drop function if exists public._atc_award_verified(uuid, uuid, int);
drop function if exists public._atc_quality_for(uuid, uuid, int);
drop function if exists public.award_listen_credit(uuid, int, boolean, boolean, boolean, boolean);
drop function if exists public.consume_airtime(uuid, int);
drop function if exists public.get_airtime_balance(text);
drop function if exists public.grant_daily_free(text);
drop function if exists public._atc_ensure_balance(uuid, text);

drop table if exists public.listen_credit_sessions;
drop table if exists public.listen_credit_events;
drop table if exists public.airtime_ledger;
drop table if exists public.airtime_balances;
