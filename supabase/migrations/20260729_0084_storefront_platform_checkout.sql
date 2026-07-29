-- Platform checkout: storefront orders settle off Connect (manual ACH/Zelle/Vc).
-- Charges land on the platform Stripe account; producers paid outside Stripe Connect.

set search_path = public, extensions;

alter table public.storefront_orders
  add column if not exists settlement_status text not null default 'pending_manual';

alter table public.storefront_orders
  drop constraint if exists storefront_orders_settlement_status_check;

alter table public.storefront_orders
  add constraint storefront_orders_settlement_status_check
  check (settlement_status in ('pending_manual', 'settled_off_platform'));

comment on column public.storefront_orders.settlement_status is
  'pending_manual | settled_off_platform — platform Stripe collects; producer paid off-platform (ACH/Zelle/Vc).';

create index if not exists storefront_orders_settlement_idx
  on public.storefront_orders (settlement_status, created_at desc);

-- Pack owner marks an order settled after manual payout (no automated transfer).
create or replace function public.storefront_settle_order(p_order_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.storefront_orders%rowtype;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  select o.* into r
  from public.storefront_orders o
  join public.storefront_packs p on p.id = o.pack_id
  where o.id = p_order_id
    and p.user_id = auth.uid()
  limit 1;

  if not found then
    raise exception 'order not found';
  end if;

  if r.settlement_status = 'settled_off_platform' then
    return jsonb_build_object(
      'id', r.id,
      'settlement_status', r.settlement_status
    );
  end if;

  update public.storefront_orders
  set settlement_status = 'settled_off_platform'
  where id = p_order_id
  returning * into r;

  return jsonb_build_object(
    'id', r.id,
    'settlement_status', r.settlement_status
  );
end;
$fn$;

grant execute on function public.storefront_settle_order(uuid) to authenticated;
