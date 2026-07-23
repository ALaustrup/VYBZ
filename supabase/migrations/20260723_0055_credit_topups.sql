-- ===========================================================================
-- VYBZ — Stripe credit top-ups (Lane A). Card purchases add cosmetic-store
-- credits (profiles.mod_points). Platform Checkout — no Connect Express.
-- Writes via service-role edge functions only; RLS governs owner reads.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.credit_topups (
  id                    uuid primary key default gen_random_uuid(),
  user_id               uuid not null references public.profiles(id) on delete cascade,
  pack_id               text not null,
  amount_cents          int not null check (amount_cents > 0),
  credits               int not null check (credits > 0),
  status                text not null default 'pending' check (status in ('pending','paid','failed')),
  stripe_session_id     text unique,
  stripe_payment_intent text,
  created_at            timestamptz not null default now(),
  paid_at               timestamptz
);
create index if not exists credit_topups_user_idx on public.credit_topups(user_id, created_at desc);
alter table public.credit_topups enable row level security;

drop policy if exists "credit_topups read own" on public.credit_topups;
create policy "credit_topups read own" on public.credit_topups
  for select using (user_id = auth.uid());
grant select on public.credit_topups to authenticated;

-- Idempotent fulfill: pending → paid + credit mod_points once. Safe under Stripe retries.
create or replace function public.fulfill_credit_topup(p_session_id text, p_payment_intent text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  r public.credit_topups%rowtype;
begin
  if p_session_id is null or length(trim(p_session_id)) = 0 then
    return jsonb_build_object('ok', false, 'reason', 'missing_session');
  end if;

  select * into r from public.credit_topups
    where stripe_session_id = p_session_id
    for update;

  if not found then
    return jsonb_build_object('ok', false, 'reason', 'not_found');
  end if;

  if r.status = 'paid' then
    return jsonb_build_object('ok', true, 'already', true, 'credits', r.credits, 'userId', r.user_id);
  end if;

  if r.status <> 'pending' then
    return jsonb_build_object('ok', false, 'reason', 'bad_status', 'status', r.status);
  end if;

  update public.credit_topups set
    status = 'paid',
    paid_at = now(),
    stripe_payment_intent = coalesce(p_payment_intent, stripe_payment_intent)
  where id = r.id;

  update public.profiles
    set mod_points = mod_points + r.credits
  where id = r.user_id;

  return jsonb_build_object('ok', true, 'already', false, 'credits', r.credits, 'userId', r.user_id);
end;
$fn$;

-- Service role / edge only — not for clients.
revoke all on function public.fulfill_credit_topup(text, text) from public, anon, authenticated;
grant execute on function public.fulfill_credit_topup(text, text) to service_role;
