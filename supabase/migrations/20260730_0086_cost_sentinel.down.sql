-- Down: Phase 14 Cost Sentinel tables / RPCs

set search_path = public, extensions;

drop function if exists public.cost_events_month_total_usd(uuid);
drop function if exists public.cost_sentinel_apply_kill_switch(text, text);
drop function if exists public.set_edge_flag(text, boolean, text);
drop function if exists public.record_cost_event(text, numeric, numeric, jsonb);

drop table if exists public.edge_flags;
drop table if exists public.cost_events;
