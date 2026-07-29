-- Down: 20260729_0085_storefront_perf_indexes

set search_path = public, extensions;

drop index if exists public.storefront_packs_user_status_idx;
drop index if exists public.storefront_orders_payment_intent_idx;
drop index if exists public.storefront_orders_status_settlement_idx;
