-- Down: Phase 18 AI credit ledger / top-ups

set search_path = public, extensions;

drop function if exists public.fulfill_ai_topup(text, text);
drop function if exists public.admin_debit_ai_credits(uuid, numeric, text, numeric, jsonb);
drop function if exists public.debit_ai_credits(numeric, text, numeric, jsonb);
drop function if exists public.get_ai_credit_balance(uuid);

drop table if exists public.ai_topups;
drop table if exists public.ai_credit_ledger;
