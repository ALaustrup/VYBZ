-- Phase 11: additive storefront hot-path indexes (EXPLAIN-friendly).
-- pack_id index already exists as storefront_orders_pack_idx (0080).

set search_path = public, extensions;

create index if not exists storefront_orders_status_settlement_idx
  on public.storefront_orders (status, settlement_status, created_at desc);

create index if not exists storefront_orders_payment_intent_idx
  on public.storefront_orders (stripe_payment_intent)
  where stripe_payment_intent is not null;

create index if not exists storefront_packs_user_status_idx
  on public.storefront_packs (user_id, status, updated_at desc);
