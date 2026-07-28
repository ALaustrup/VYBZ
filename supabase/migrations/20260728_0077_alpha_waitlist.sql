-- Alpha waitlist for official launch notify-on-launch (Resend).
-- Public join via waitlist-join Edge Function (service role).
-- Admin blast via waitlist-notify (WAITLIST_NOTIFY_SECRET).

create table if not exists public.alpha_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text not null,
  email_norm text generated always as (lower(trim(email))) stored,
  source text not null default 'landing',
  created_at timestamptz not null default now(),
  notified_at timestamptz,
  unsub_token uuid not null default gen_random_uuid(),
  unsubscribed_at timestamptz,
  constraint alpha_waitlist_email_norm_unique unique (email_norm)
);

create index if not exists alpha_waitlist_pending_idx
  on public.alpha_waitlist (created_at)
  where notified_at is null and unsubscribed_at is null;

alter table public.alpha_waitlist enable row level security;

-- No direct client access; Edge Functions use service role.
revoke all on public.alpha_waitlist from anon, authenticated;
grant select, insert, update on public.alpha_waitlist to service_role;

comment on table public.alpha_waitlist is
  'Marketing alpha waitlist emails; notified_at set by waitlist-notify blast.';
