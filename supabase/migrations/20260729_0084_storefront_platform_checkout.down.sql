-- Down: 20260729_0084_storefront_platform_checkout

set search_path = public, extensions;

drop function if exists public.storefront_settle_order(uuid);

drop index if exists public.storefront_orders_settlement_idx;

alter table public.storefront_orders
  drop constraint if exists storefront_orders_settlement_status_check;

alter table public.storefront_orders
  drop column if exists settlement_status;
