-- Passkeys (WebAuthn) storage for VYBZ identity-first auth.
--
-- Two tables back the `passkey` Edge Function:
--   • passkeys              — one row per registered credential (owned by a user)
--   • webauthn_challenges   — short-lived ceremony challenges (server-only)
--
-- The Edge Function talks to these with the service-role key (bypasses RLS), so
-- RLS here exists to lock DOWN direct client access: a user may read/manage only
-- their own passkeys, and no client may ever touch the challenge table.

-- ── Credentials ──────────────────────────────────────────────────────────────
create table if not exists public.passkeys (
  credential_id text primary key,
  user_id       uuid not null references auth.users(id) on delete cascade,
  public_key    text not null,
  counter       bigint not null default 0,
  transports    text[],
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys(user_id);

alter table public.passkeys enable row level security;

-- Owners can see and manage (rename/revoke) their own passkeys. Inserts are
-- performed only by the Edge Function (service role), never by clients.
drop policy if exists "passkeys select own" on public.passkeys;
create policy "passkeys select own" on public.passkeys
  for select using (user_id = auth.uid());

drop policy if exists "passkeys update own" on public.passkeys;
create policy "passkeys update own" on public.passkeys
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());

drop policy if exists "passkeys delete own" on public.passkeys;
create policy "passkeys delete own" on public.passkeys
  for delete using (user_id = auth.uid());

-- ── Ceremony challenges (server-only) ────────────────────────────────────────
create table if not exists public.webauthn_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users(id) on delete cascade,
  challenge  text not null,
  kind       text not null check (kind in ('register','auth','signup')),
  created_at timestamptz not null default now()
);
create index if not exists webauthn_challenges_created_idx
  on public.webauthn_challenges(created_at);

-- RLS on with no policies → clients get zero access; only the service role
-- (Edge Function) can read/write challenges.
alter table public.webauthn_challenges enable row level security;

-- Housekeeping: drop challenges older than an hour whenever a new one lands.
create or replace function public.prune_webauthn_challenges()
returns trigger language plpgsql as $$
begin
  delete from public.webauthn_challenges where created_at < now() - interval '1 hour';
  return null;
end $$;

drop trigger if exists trg_prune_webauthn_challenges on public.webauthn_challenges;
create trigger trg_prune_webauthn_challenges
  after insert on public.webauthn_challenges
  for each statement execute function public.prune_webauthn_challenges();
