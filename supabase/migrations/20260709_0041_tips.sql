-- ===========================================================================
-- VYBZ — Stripe Connect tips (Phase O3b). The patron/supporter loop: real-money
-- tips flow supporter → creator via Stripe Connect (destination charges), so
-- creators are paid directly. On-mission per §4.1 Lane A — optional, never gates
-- anything, no ads, no paywalls.
--
-- Rows here are written ONLY by the Stripe edge functions (service role, which
-- bypasses RLS): `stripe-connect-onboard` (creates the connected account),
-- `stripe-webhook` (flips charges_enabled on account.updated; marks tips paid on
-- checkout.session.completed), `stripe-tip` (inserts the pending tip). RLS below
-- governs READS by the app.
-- ===========================================================================

set search_path = public, extensions;

-- A creator's Stripe Connect (Express) account + payout readiness.
create table if not exists public.creator_payouts (
  user_id           uuid primary key references public.profiles(id) on delete cascade,
  stripe_account_id text unique,
  charges_enabled   boolean not null default false,
  details_submitted boolean not null default false,
  payouts_enabled   boolean not null default false,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
alter table public.creator_payouts enable row level security;
-- Owners can read their own payout status; all writes go through the service role.
drop policy if exists "creator_payouts read own" on public.creator_payouts;
create policy "creator_payouts read own" on public.creator_payouts for select using (user_id = auth.uid());
grant select on public.creator_payouts to authenticated;

-- Tip ledger.
create table if not exists public.tips (
  id                   uuid primary key default gen_random_uuid(),
  from_user            uuid references public.profiles(id) on delete set null,
  to_user              uuid not null references public.profiles(id) on delete cascade,
  amount_cents         int not null check (amount_cents > 0),
  currency             text not null default 'usd',
  status               text not null default 'pending' check (status in ('pending','paid','failed')),
  stripe_session_id    text unique,
  stripe_payment_intent text,
  message              text,
  created_at           timestamptz not null default now(),
  paid_at              timestamptz
);
create index if not exists tips_to_user_idx on public.tips(to_user, created_at desc);
create index if not exists tips_from_user_idx on public.tips(from_user, created_at desc);
alter table public.tips enable row level security;
-- Sender and recipient can each read their own tips; writes via service role only.
drop policy if exists "tips read own" on public.tips;
create policy "tips read own" on public.tips for select using (to_user = auth.uid() or from_user = auth.uid());
grant select on public.tips to authenticated;

-- ── Read RPCs ───────────────────────────────────────────────────────────────

-- Anyone can check whether a creator accepts tips (drives the Tip button).
create or replace function public.creator_tips_enabled(p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select charges_enabled from public.creator_payouts where user_id = p_uid), false);
$fn$;
grant execute on function public.creator_tips_enabled(uuid) to anon, authenticated;

-- The caller's own payout onboarding status.
create or replace function public.my_payout_status()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'hasAccount', exists (select 1 from public.creator_payouts where user_id = auth.uid() and stripe_account_id is not null),
    'chargesEnabled', coalesce((select charges_enabled from public.creator_payouts where user_id = auth.uid()), false),
    'detailsSubmitted', coalesce((select details_submitted from public.creator_payouts where user_id = auth.uid()), false)
  );
$fn$;
grant execute on function public.my_payout_status() to authenticated;

-- Public tip summary for a creator's profile ("supported N times").
create or replace function public.tips_summary(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'count', (select count(*) from public.tips where to_user = p_uid and status = 'paid'),
    'supporters', (select count(distinct from_user) from public.tips where to_user = p_uid and status = 'paid')
  );
$fn$;
grant execute on function public.tips_summary(uuid) to anon, authenticated;
