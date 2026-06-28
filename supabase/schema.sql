-- ===========================================================================
-- MYVYB — Supabase schema (optional real backend)
--
-- NOTE: Incremental changes made after this baseline live in ./migrations/*.sql
-- (applied to the live project but historically not folded back here). Apply the
-- migrations after this file for a fully reproducible environment, newest last.
--
-- Run this in the Supabase SQL editor for the project referenced by
-- VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY. The app works without it (local
-- mode); this enables real accounts, multi-user chat, and shared content.
-- ===========================================================================

-- Profiles ------------------------------------------------------------------
create table if not exists public.profiles (
  id          uuid primary key references auth.users on delete cascade,
  -- Identity = an emoji sequence (2–4). emoji_key is its canonical, unique form.
  alias           text not null,
  emoji_key       text unique,
  aura            text not null default 'veil',
  -- Self-disclosure. Sex and age are PERMANENT once set (enforced by the
  -- lock_permanent_identity trigger below); shown on unveiled posts only when
  -- public. Veiled is all-ages, so age allows 13+ (not 18-gated).
  gender          text check (gender in ('M','F')),
  age             int  check (age between 13 and 120),
  location        text,
  identity_public boolean not null default true,
  karma           int  not null default 0,
  godmode         boolean not null default false,
  -- Global "show sensitive (NSFW) content" opt-in (off by default).
  nsfw_opt_in     boolean not null default false,
  -- 18+ consent recorded when the user unlocks NSFW (with a verified contact).
  nsfw_consent    boolean not null default false,
  -- Operator/admin role + moderation state + one-time identity-change credit.
  is_admin        boolean not null default false,
  banned          boolean not null default false,
  identity_changes_remaining int not null default 1,
  -- V¢ (V-Credits) wallet. "Enter anonymously" users have no wallet.
  credits         int not null default 0,
  anonymous       boolean not null default false,
  last_bonus_at   timestamptz,
  -- Drives the weekly-inactivity reset (frees the emoji name, archives content).
  last_active_at  timestamptz not null default now(),
  created_at      timestamptz not null default now()
);

-- Confessions ---------------------------------------------------------------
create table if not exists public.confessions (
  id              uuid primary key default gen_random_uuid(),
  author_id       uuid not null references public.profiles(id) on delete cascade,
  -- Ephemeral, anonymous per-post display name (never the author's identity).
  alias           text,
  body            text not null,
  -- Background media URL (uploaded photo/video or an AI-generated image). The
  -- legacy name is kept; it now holds images AND videos.
  photo_url       text,
  -- 'image' (default, incl. AI-generated) or 'video'.
  media_kind      text not null default 'image' check (media_kind in ('image','video')),
  -- Non-destructive "virtual trim" window (seconds) for video — we store the
  -- original and only play this ≤15s slice. Null for images.
  clip_start      real,
  clip_end        real,
  -- Scheduled publish time (null = live immediately); feed filters on this.
  publish_at      timestamptz,
  lat             double precision,
  lng             double precision,
  feels           int not null default 0,
  wilds           int not null default 0,
  featured        boolean not null default false,
  seed            int not null default 0,
  aftermath       text,
  -- AI-suggested NSFW (never enforced): clients soft-blur with a personal Unveil.
  nsfw            boolean not null default false,
  hidden          boolean not null default false,
  report_count    int not null default 0,
  -- "Veiled" (archived) — hidden from public feeds after author inactivity, but
  -- still resolvable privately (DMs, Feels, other layers).
  archived        boolean not null default false,
  -- Identity snapshot, written at post time only when the author is public
  -- (so private users never leak via the world-readable profiles table).
  author_gender   text check (author_gender in ('M','F')),
  author_age      int,
  author_location text,
  -- Expression: free typography choice + premium (V¢/Godmode) text effect and
  -- the 3D "gyroscopic" media view. All optional; renderers default gracefully.
  font_style      text,
  text_fx         text,
  view_3d         boolean not null default false,
  created_at      timestamptz not null default now()
);

-- Backfill for existing projects (idempotent).
alter table public.confessions add column if not exists font_style text;
alter table public.confessions add column if not exists text_fx text;
alter table public.confessions add column if not exists view_3d boolean not null default false;

-- Account-synced personalization (dock theme/effect, background, page transition,
-- and V¢ unlocks) so customization follows the user across devices.
alter table public.profiles add column if not exists prefs jsonb not null default '{}'::jsonb;
create index if not exists confessions_created_idx on public.confessions (created_at desc);

-- Reactions (one per user per confession) -----------------------------------
create table if not exists public.reactions (
  confession_id uuid references public.confessions on delete cascade,
  user_id       uuid references public.profiles on delete cascade,
  reaction      text not null check (reaction in ('feel','wild')),
  created_at    timestamptz not null default now(),
  primary key (confession_id, user_id)
);

-- Unveils (gate + enforce max_unveils) --------------------------------------
create table if not exists public.unveils (
  confession_id uuid references public.confessions on delete cascade,
  user_id       uuid references public.profiles on delete cascade,
  created_at    timestamptz not null default now(),
  primary key (confession_id, user_id)
);

-- Comments (one per user per confession) ------------------------------------
create table if not exists public.comments (
  confession_id uuid references public.confessions on delete cascade,
  user_id       uuid references public.profiles on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now(),
  primary key (confession_id, user_id)
);

-- Direct messages (only between users who have unveiled each other) ----------
create table if not exists public.messages (
  id            uuid primary key default gen_random_uuid(),
  confession_id uuid references public.confessions on delete cascade,
  sender_id     uuid references public.profiles on delete cascade,
  recipient_id  uuid references public.profiles on delete cascade,
  body          text not null,
  created_at    timestamptz not null default now()
);
create index if not exists messages_thread_idx
  on public.messages (confession_id, created_at);

-- Friendships ---------------------------------------------------------------
create table if not exists public.friendships (
  requester_id uuid references public.profiles on delete cascade,
  addressee_id uuid references public.profiles on delete cascade,
  status       text not null default 'requested'
               check (status in ('requested','friends')),
  created_at   timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);

-- Name watchlist ("snipe"): a Godmode user can watch a currently-taken emoji
-- name. When it frees (holder reset for inactivity, or voluntary change) the
-- client surfaces a live claim alert; first to claim wins via the unique index
-- on profiles.emoji_key. `notified_at` records the 1-hour email heads-up so we
-- never spam. Watching never evicts the current holder.
create table if not exists public.name_watchers (
  user_id     uuid references public.profiles on delete cascade,
  emoji_key   text not null,
  notified_at timestamptz,
  created_at  timestamptz not null default now(),
  primary key (user_id, emoji_key)
);
create index if not exists name_watchers_key_idx on public.name_watchers (emoji_key);

-- Passkeys (WebAuthn): free, biometric, phishing-resistant sign-in. A passkey
-- binds to an email-anchored account; the `passkey` Edge Function verifies
-- ceremonies (service role) and mints a session via generateLink. Public keys
-- only — never a shared secret.
create table if not exists public.passkeys (
  credential_id text primary key,
  user_id       uuid not null references auth.users on delete cascade,
  public_key    text not null,
  counter       bigint not null default 0,
  transports    text[],
  label         text,
  created_at    timestamptz not null default now(),
  last_used_at  timestamptz
);
create index if not exists passkeys_user_idx on public.passkeys (user_id);
-- Short-lived WebAuthn challenges (consumed once, then deleted by the function).
create table if not exists public.webauthn_challenges (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid,
  challenge  text not null,
  kind       text not null,
  created_at timestamptz not null default now()
);

-- Row Level Security --------------------------------------------------------
alter table public.profiles      enable row level security;
alter table public.confessions   enable row level security;
alter table public.reactions     enable row level security;
alter table public.unveils       enable row level security;
alter table public.comments      enable row level security;
alter table public.messages      enable row level security;
alter table public.friendships   enable row level security;
alter table public.name_watchers enable row level security;

-- Profiles: world-readable (anonymous aliases), self-writable.
create policy "profiles read"   on public.profiles for select using (true);
create policy "profiles upsert" on public.profiles for insert with check (auth.uid() = id);
create policy "profiles update" on public.profiles for update using (auth.uid() = id);

-- Sex + age are permanent: once set they can never be changed or cleared. The
-- trigger silently preserves the original value, so updates to other fields
-- (location, identity_public, nsfw_*, etc.) still succeed.
create or replace function public.lock_permanent_identity() returns trigger
language plpgsql as $fn$
begin
  -- Controlled change RPCs (admin override + the user's one-time change) set
  -- this per-transaction GUC to bypass permanence.
  if coalesce(current_setting('veiled.allow_identity_change', true), '') = 'on' then
    return NEW;
  end if;
  if OLD.gender is not null then NEW.gender := OLD.gender; end if;
  if OLD.age    is not null then NEW.age    := OLD.age;    end if;
  return NEW;
end $fn$;
drop trigger if exists lock_permanent_identity_trg on public.profiles;
create trigger lock_permanent_identity_trg before update on public.profiles
  for each row execute function public.lock_permanent_identity();

-- Confessions: readable by all; only the author may write/modify.
create policy "confessions read"   on public.confessions for select using (true);
create policy "confessions insert" on public.confessions for insert with check (auth.uid() = author_id);
create policy "confessions update" on public.confessions for update using (auth.uid() = author_id);
create policy "confessions delete" on public.confessions for delete using (auth.uid() = author_id);

-- Reactions / unveils / comments: a user manages only their own rows.
create policy "reactions rw" on public.reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "reactions read" on public.reactions for select using (true);
create policy "unveils rw" on public.unveils for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
create policy "comments read" on public.comments for select using (true);
create policy "comments rw" on public.comments for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Messages: 1:1 — only the two participants can read; you may send as yourself
-- on a confession you authored or have unveiled.
create policy "messages read" on public.messages for select
  using (auth.uid() = sender_id or auth.uid() = recipient_id);
create policy "messages send" on public.messages for insert with check (
  auth.uid() = sender_id and (
    auth.uid() = (select author_id from public.confessions where id = confession_id)
    or exists (select 1 from public.unveils u
               where u.confession_id = confession_id and u.user_id = auth.uid())
  )
);

-- Direct friend DMs: a message with confession_id = null is allowed only
-- between two accepted friends (1:1 chat outside of any confession thread).
create policy "messages dm" on public.messages for insert with check (
  auth.uid() = sender_id and confession_id is null and exists (
    select 1 from public.friendships f
    where f.status = 'friends' and (
      (f.requester_id = auth.uid() and f.addressee_id = recipient_id) or
      (f.addressee_id = auth.uid() and f.requester_id = recipient_id)
    )
  )
);

-- Friendships: visible to and editable by either party.
create policy "friendships read" on public.friendships for select
  using (auth.uid() = requester_id or auth.uid() = addressee_id);
create policy "friendships write" on public.friendships for all
  using (auth.uid() = requester_id or auth.uid() = addressee_id)
  with check (auth.uid() = requester_id or auth.uid() = addressee_id);

-- Name watchlist: a user manages only their own watch rows.
create policy "name_watchers rw" on public.name_watchers for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- Passkeys: a user can read/delete their own; writes happen via the service role
-- (the passkey Edge Function), so no insert/update policy is granted to users.
alter table public.passkeys enable row level security;
create policy "passkeys read own" on public.passkeys for select using (auth.uid() = user_id);
create policy "passkeys delete own" on public.passkeys for delete using (auth.uid() = user_id);
-- Rename only (label); ceremony fields are written by the service role.
create policy "passkeys update own" on public.passkeys for update
  using (auth.uid() = user_id) with check (auth.uid() = user_id);
-- Challenges are only ever touched by the service role.
alter table public.webauthn_challenges enable row level security;

-- Storage: a PRIVATE 'confessions' bucket for post media --------------------
-- Private (no public CDN). Media is served only via short-lived signed URLs.
-- Reads are shared across signed-in users (the feed is shared) but never
-- anonymous; writes/deletes are strictly scoped to the uploader's own
-- `{uid}/…` folder. (See migration 20260627_0004_storage_rls_hardening.sql.)
insert into storage.buckets (id, name, public)
values ('confessions', 'confessions', false)
on conflict (id) do update set public = false;
create policy "confession photos read" on storage.objects
  for select to authenticated using (bucket_id = 'confessions');
create policy "confession photos insert" on storage.objects
  for insert to authenticated with check (
    bucket_id = 'confessions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
create policy "confession photos delete" on storage.objects
  for delete to authenticated using (
    bucket_id = 'confessions' and owner = auth.uid()
  );

-- Realtime: broadcast inserts on the social tables.
alter publication supabase_realtime add table
  public.messages, public.comments, public.reactions, public.confessions,
  public.friendships;

-- Server-authoritative community tally: keep confessions.feels/wilds in sync
-- with the reactions table so the blur level reflects real, shared votes.
create or replace function public.tally_reaction()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.confessions set
      feels = feels + (new.reaction = 'feel')::int,
      wilds = wilds + (new.reaction = 'wild')::int
      where id = new.confession_id;
  elsif tg_op = 'UPDATE' then
    if new.reaction <> old.reaction then
      update public.confessions set
        feels = feels + (new.reaction = 'feel')::int - (old.reaction = 'feel')::int,
        wilds = wilds + (new.reaction = 'wild')::int - (old.reaction = 'wild')::int
        where id = new.confession_id;
    end if;
  elsif tg_op = 'DELETE' then
    update public.confessions set
      feels = greatest(0, feels - (old.reaction = 'feel')::int),
      wilds = greatest(0, wilds - (old.reaction = 'wild')::int)
      where id = old.confession_id;
    return old;
  end if;
  return new;
end $$;
drop trigger if exists reaction_tally_trg on public.reactions;
create trigger reaction_tally_trg
  after insert or update or delete on public.reactions
  for each row execute function public.tally_reaction();

-- Safety: reporting, blocking, and report-driven auto-hide --------------------
-- Users can file reports but never read them; only moderators (service role).
create table if not exists public.reports (
  id          uuid primary key default gen_random_uuid(),
  reporter_id uuid references public.profiles on delete set null,
  target_type text not null check (target_type in ('confession','comment','message','profile')),
  target_id   text not null,
  reason      text,
  created_at  timestamptz not null default now()
);
alter table public.reports enable row level security;
create policy "reports insert" on public.reports for insert
  with check (auth.uid() = reporter_id);

create table if not exists public.blocks (
  blocker_id uuid references public.profiles on delete cascade,
  blocked_id uuid references public.profiles on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);
alter table public.blocks enable row level security;
create policy "blocks rw" on public.blocks for all
  using (auth.uid() = blocker_id) with check (auth.uid() = blocker_id);

-- A confession is auto-hidden once it accrues enough distinct reports.
alter table public.confessions add column if not exists report_count int not null default 0;
alter table public.confessions add column if not exists hidden boolean not null default false;

create or replace function public.bump_report_count()
returns trigger language plpgsql security definer as $$
begin
  if new.target_type = 'confession'
     and new.target_id ~ '^[0-9a-fA-F-]{36}$' then
    update public.confessions
      set report_count = report_count + 1,
          hidden = (report_count + 1 >= 3)
      where id = new.target_id::uuid;
  end if;
  return new;
end $$;
drop trigger if exists report_bump_trg on public.reports;
create trigger report_bump_trg after insert on public.reports
  for each row execute function public.bump_report_count();

-- Public chat rooms ----------------------------------------------------------
-- Open to everyone (including anonymous accounts). Active-user lists use
-- Realtime Presence (no table). Shared images are clear by default; AI-suggested
-- NSFW images are soft-blurred per-user with a personal Unveil.
create table if not exists public.rooms (
  id         text primary key,
  name       text not null,
  topic      text,
  kind       text not null default 'public' check (kind in ('public','local')),
  sort       int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.rooms enable row level security;
create policy "rooms read" on public.rooms for select using (true);

insert into public.rooms (id,name,topic,kind,sort) values
  ('lobby','The Lobby','Anything goes — say hi.','public',0),
  ('live','Confessions Live','React to fresh secrets together.','public',1),
  ('latenight','Late Night','For the 3am thoughts.','public',2),
  ('vent','Vent','Let it out, no judgment.','public',3),
  ('hype','Hype','Gas each other up.','public',4),
  ('confessions','Confessions','Say the thing out loud.','public',5)
on conflict (id) do nothing;

create table if not exists public.room_messages (
  id          uuid primary key default gen_random_uuid(),
  room_id     text not null references public.rooms on delete cascade,
  sender_id   uuid references public.profiles on delete set null,
  -- 'mod'/'system' messages are written by the disclosed moderation agent
  -- (service role) and render with a <MOD> badge.
  sender_kind text not null default 'user' check (sender_kind in ('user','mod','system')),
  alias       text not null,
  aura        text not null default 'veil',
  body        text,
  image_url   text,
  nsfw        boolean not null default false,
  unveils     int not null default 0,
  veils       int not null default 0,
  hidden      boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists room_messages_room_idx on public.room_messages (room_id, created_at);
alter table public.room_messages enable row level security;
create policy "room messages read" on public.room_messages for select using (true);
create policy "room messages insert" on public.room_messages for insert
  with check (auth.uid() = sender_id and sender_kind = 'user');

-- Per-image community blur (mirrors confession reactions).
create table if not exists public.room_message_reactions (
  message_id uuid references public.room_messages on delete cascade,
  user_id    uuid references public.profiles on delete cascade,
  reaction   text not null check (reaction in ('feel','wild')),
  created_at timestamptz not null default now(),
  primary key (message_id, user_id)
);
alter table public.room_message_reactions enable row level security;
create policy "room reactions rw" on public.room_message_reactions for all
  using (auth.uid() = user_id) with check (auth.uid() = user_id);

create or replace function public.tally_room_reaction()
returns trigger language plpgsql security definer as $$
begin
  if tg_op = 'INSERT' then
    update public.room_messages set
      unveils = unveils + (new.reaction='feel')::int,
      veils   = veils   + (new.reaction='wild')::int
      where id = new.message_id;
  elsif tg_op = 'UPDATE' then
    if new.reaction <> old.reaction then
      update public.room_messages set
        unveils = unveils + (new.reaction='feel')::int - (old.reaction='feel')::int,
        veils   = veils   + (new.reaction='wild')::int - (old.reaction='wild')::int
        where id = new.message_id;
    end if;
  elsif tg_op = 'DELETE' then
    update public.room_messages set
      unveils = greatest(0, unveils - (old.reaction='feel')::int),
      veils   = greatest(0, veils   - (old.reaction='wild')::int)
      where id = old.message_id;
    return old;
  end if;
  return new;
end $$;
drop trigger if exists room_reaction_tally_trg on public.room_message_reactions;
create trigger room_reaction_tally_trg
  after insert or update or delete on public.room_message_reactions
  for each row execute function public.tally_room_reaction();

alter publication supabase_realtime add table public.room_messages;

-- Weekly inactivity reset --------------------------------------------------
-- After 7 days with no activity, free the account's emoji name for reuse and
-- "Veil" (archive) its content so it leaves public feeds but stays resolvable
-- privately. Runs daily via pg_cron. `last_active_at` is stamped on each session.
create or replace function public.veil_inactive_accounts() returns void
language plpgsql security definer as $fn$
begin
  update public.confessions c
    set archived = true
    from public.profiles p
    where c.author_id = p.id
      and p.last_active_at < now() - interval '7 days'
      and c.archived = false;
  update public.profiles
    set emoji_key = null
    where last_active_at < now() - interval '7 days'
      and emoji_key is not null;
end $fn$;

create extension if not exists pg_cron;
-- select cron.schedule('veil-inactive', '0 4 * * *',
--   $$ select public.veil_inactive_accounts(); $$);

-- Disclosed moderation agent ("Veiled Guide") --------------------------------
-- A DB trigger calls the `room-mod` Edge Function whenever a USER posts. The
-- function (service role) runs keyword moderation and, at will, posts tips or
-- replies with sender_kind='mod' (shown with a transparent <MOD> badge). Mod
-- messages are sender_kind='mod' so they never re-trigger this.
-- Setup: deploy the function with --no-verify-jwt, set the MOD_SECRET secret,
-- then replace <PROJECT_REF> and <MOD_SECRET> below.
create extension if not exists pg_net;
create or replace function public.notify_room_mod()
returns trigger language plpgsql security definer as $fn$
begin
  if new.sender_kind = 'user' then
    perform net.http_post(
      url := 'https://<PROJECT_REF>.supabase.co/functions/v1/room-mod',
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-mod-secret', '<MOD_SECRET>'
      ),
      body := jsonb_build_object(
        'message_id', new.id, 'room_id', new.room_id,
        'body', new.body, 'sender_kind', new.sender_kind
      )
    );
  end if;
  return new;
end $fn$;
drop trigger if exists room_mod_trg on public.room_messages;
create trigger room_mod_trg after insert on public.room_messages
  for each row execute function public.notify_room_mod();

-- Watchlist heads-up ("name drop") ------------------------------------------
-- Hourly, ping the `name-drop-notify` Edge Function. It finds watched names
-- whose holder is ~1 hour from the inactivity reset, emails those watchers a
-- one-time heads-up (via Resend), and stamps name_watchers.notified_at so we
-- never double-send. The live in-app "claim it now" alert + first-to-claim race
-- are handled client-side the moment the name actually frees.
-- Setup: deploy the function, set DROP_SECRET + RESEND_API_KEY, then
--   select cron.schedule('name-drop-notify', '0 * * * *', $$
--     select net.http_post(
--       url := 'https://<PROJECT_REF>.supabase.co/functions/v1/name-drop-notify',
--       headers := jsonb_build_object('x-drop-secret', '<DROP_SECRET>')
--     ); $$);

-- Admin / operator subsystem -------------------------------------------------
-- Privileged actions are SECURITY DEFINER RPCs that each verify the caller is an
-- admin (or, for self_change_identity, act only on the caller). No broad write
-- RLS is granted to clients. Bootstrap once with a code stored in app_secrets.
create or replace function public.is_admin(uid uuid) returns boolean
language sql stable security definer as $fn$
  select coalesce((select is_admin from public.profiles where id = uid), false);
$fn$;

create table if not exists public.app_secrets (key text primary key, value text not null);
alter table public.app_secrets enable row level security;

create table if not exists public.admin_actions (
  id uuid primary key default gen_random_uuid(),
  admin_id uuid, action text not null, target text, detail jsonb,
  created_at timestamptz not null default now()
);
alter table public.admin_actions enable row level security;
create policy "admin_actions read" on public.admin_actions for select using (public.is_admin(auth.uid()));
create policy "reports admin read" on public.reports for select using (public.is_admin(auth.uid()));

-- See migration in supabase/admin.sql equivalents: claim_admin, admin_set_godmode,
-- admin_set_banned, admin_set_hidden, admin_change_identity,
-- admin_grant_identity_change, admin_create_post, self_change_identity.
-- (Full bodies are applied to the project; summarized here to keep schema.sql
-- focused. The confessions insert policy also blocks banned authors.)

-- Social Circles -------------------------------------------------------------
-- User-created chat communities (tables: circles, circle_members,
-- circle_messages). Visibility public/unlisted/private/secret; membership-
-- enforced RLS (is_circle_member); all writes via SECURITY DEFINER RPCs:
-- create_circle (caps 5 standard / 15 Godmode), join_circle, leave_circle,
-- send_circle_message (gates anonymous via circles.allow_anonymous + bans/mutes),
-- rename_circle (one-time), update_circle_settings, set_circle_member (owner/mod
-- ban/mute/promote). member_count kept by the circle_members tally trigger;
-- circle_messages added to realtime. Full bodies applied to the project.
-- Phase B: circles.join_code; join_circle(code) handles open/request/code
-- policies; approve_circle_member (approve/reject pending); set_circle_access
-- (visibility + policy + (re)generate code); get_circle_code (owner/mod only);
-- circle_message_safety trigger (severe content hidden + crisis support, no LLM);
-- circle_messages replica identity full (so UPDATE/hide-sync is delivered).
-- Phase C: circles.dues + theme; circle_members.supporter/last_paid_at;
-- set_circle_dues/support, pay_circle_dues (opt-in daily V¢ support; never
-- blocks public chat), set_circle_theme, set_circle_slug (Godmode vanity),
-- and 18+ gating (nsfw_consent required to flag a circle 18+ and to post in one).

-- V¢ (V-Credits) economy -----------------------------------------------------
-- Non-cashable, cosmetic-only currency. Earned by posting (award_on_post
-- trigger, +10) and a gentle daily bonus (claim_daily_bonus, +5); spent via
-- buy_cosmetic (price read from the cosmetics catalog), spend_credits (one-off
-- purchases such as a post's premium text effects) or tipped with
-- tip_credits. All SECURITY DEFINER + balance-checked; anonymous accounts are
-- excluded. credit_ledger (read own), cosmetics (catalog, world-read),
-- cosmetics_owned (read own). Full bodies applied to the project.

-- spend_credits: deduct V¢ for a one-off purchase (e.g. premium post effects).
-- SECURITY DEFINER + balance-checked; anonymous accounts excluded. Versioned
-- here so it can be (re)applied to a fresh project.
create or replace function public.spend_credits(p_amount integer, p_reason text)
returns boolean
language plpgsql
security definer
as $function$
declare uid uuid := auth.uid(); bal int; anon boolean;
begin
  if uid is null or coalesce(p_amount, 0) <= 0 then return false; end if;
  select credits, anonymous into bal, anon from public.profiles where id = uid;
  if coalesce(anon, false) then return false; end if;
  if coalesce(bal, 0) < p_amount then return false; end if;
  update public.profiles set credits = credits - p_amount where id = uid;
  insert into public.credit_ledger(user_id, delta, reason, ref)
    values (uid, -p_amount, coalesce(p_reason, 'spend'), null);
  return true;
end $function$;
grant execute on function public.spend_credits(integer, text) to authenticated;

-- ---------------------------------------------------------------------------
-- Game leaderboards (deployed via the Management API; recorded here for source
-- control). SECURITY DEFINER so they can read across the RLS-restricted
-- game_scores table, but they only ever expose already-public profile fields.
-- ---------------------------------------------------------------------------
create or replace function public.game_leaderboard(p_game text, p_limit int default 20)
returns table(
  user_id uuid,
  emoji_key text,
  alias text,
  godmode boolean,
  best int,
  plays int,
  rank int,
  is_me boolean
)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select gs.user_id,
           p.emoji_key,
           p.alias,
           coalesce(p.godmode, false) as godmode,
           gs.best,
           gs.plays,
           rank() over (order by gs.best desc, gs.updated_at asc) as rank
    from public.game_scores gs
    join public.profiles p on p.id = gs.user_id
    where gs.game = p_game
      and gs.best > 0
      and coalesce(p.banned, false) = false
      and coalesce(p.anonymous, false) = false
  )
  select user_id, emoji_key, alias, godmode, best, plays, rank::int,
         (user_id = auth.uid()) as is_me
  from ranked
  order by rank
  limit greatest(1, least(100, p_limit));
$$;

create or replace function public.my_game_rank(p_game text)
returns table(best int, plays int, rank int)
language sql
security definer
set search_path = public
as $$
  with ranked as (
    select gs.user_id, gs.best, gs.plays,
           rank() over (order by gs.best desc, gs.updated_at asc) as rank
    from public.game_scores gs
    join public.profiles p on p.id = gs.user_id
    where gs.game = p_game
      and gs.best > 0
      and coalesce(p.banned, false) = false
      and coalesce(p.anonymous, false) = false
  )
  select best, plays, rank::int from ranked where user_id = auth.uid();
$$;

grant execute on function public.game_leaderboard(text, int) to anon, authenticated;
grant execute on function public.my_game_rank(text) to authenticated;

-- Recent game activity from a caller's accepted friends (Games center).
create or replace function public.friends_recent_plays(p_limit int default 8)
returns table(
  user_id uuid,
  emoji_key text,
  alias text,
  game text,
  best int,
  plays int,
  updated_at timestamptz
)
language sql
security definer
set search_path = public
as $$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'friends'
      and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select gs.user_id, p.emoji_key, p.alias, gs.game, gs.best, gs.plays, gs.updated_at
  from public.game_scores gs
  join my_friends f on f.fid = gs.user_id
  join public.profiles p on p.id = gs.user_id
  where coalesce(p.banned, false) = false
  order by gs.updated_at desc
  limit greatest(1, least(50, p_limit));
$$;
grant execute on function public.friends_recent_plays(int) to authenticated;

-- ===========================================================================
-- Veiled Roulette — random 1:1 ephemeral text chat. Matchmaking + age-layer
-- gating are server-enforced; messages are broadcast-only (never stored).
-- ===========================================================================
create table if not exists public.roulette_queue (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  age_layer text not null check (age_layer in ('teen','adult')),
  enqueued_at timestamptz not null default now()
);
alter table public.roulette_queue enable row level security;

create table if not exists public.roulette_sessions (
  id uuid primary key default gen_random_uuid(),
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid
);
alter table public.roulette_sessions enable row level security;
drop policy if exists "roulette session read own" on public.roulette_sessions;
create policy "roulette session read own" on public.roulette_sessions
  for select using (a = auth.uid() or b = auth.uid());

create or replace function public.roulette_enqueue()
returns table(session_id uuid, partner_id uuid, waiting boolean, eligible boolean)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_age int; my_layer text; anon boolean; is_banned boolean;
  partner uuid; new_session uuid;
begin
  if uid is null then return query select null::uuid, null::uuid, false, false; return; end if;
  select age, coalesce(anonymous,false), coalesce(banned,false)
    into my_age, anon, is_banned from public.profiles where id = uid;
  if anon or is_banned or my_age is null then
    return query select null::uuid, null::uuid, false, false; return;
  end if;
  my_layer := case when my_age < 18 then 'teen' else 'adult' end;
  select q.user_id into partner
  from public.roulette_queue q
  where q.user_id <> uid and q.age_layer = my_layer
    and not exists (select 1 from public.blocks b
      where (b.blocker_id = uid and b.blocked_id = q.user_id)
         or (b.blocker_id = q.user_id and b.blocked_id = uid))
  order by q.enqueued_at asc limit 1 for update skip locked;
  if partner is not null then
    delete from public.roulette_queue where user_id in (partner, uid);
    insert into public.roulette_sessions(a, b) values (partner, uid) returning id into new_session;
    return query select new_session, partner, false, true;
  else
    insert into public.roulette_queue(user_id, age_layer) values (uid, my_layer)
      on conflict (user_id) do update set enqueued_at = now(), age_layer = excluded.age_layer;
    return query select null::uuid, null::uuid, true, true;
  end if;
end $$;

create or replace function public.roulette_cancel()
returns void language sql security definer set search_path = public as $$
  delete from public.roulette_queue where user_id = auth.uid();
$$;

create or replace function public.roulette_end(p_session uuid)
returns void language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  update public.roulette_sessions set ended_at = now(), ended_by = uid
   where id = p_session and (a = uid or b = uid) and ended_at is null;
  delete from public.roulette_queue where user_id = uid;
end $$;

grant execute on function public.roulette_enqueue() to authenticated;
grant execute on function public.roulette_cancel() to authenticated;
grant execute on function public.roulette_end(uuid) to authenticated;

-- ===========================================================================
-- Author-targeted notifications. Triggers fan a row out to the recipient when
-- someone reacts to / comments on their confession; clients subscribe per-user
-- via Realtime (RLS scopes each person to their own rows). DMs are handled
-- client-side, so there's no DM trigger here.
-- ===========================================================================
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid,
  kind text not null,
  title text not null,
  body text not null default '',
  confession_id uuid,
  created_at timestamptz not null default now(),
  read boolean not null default false
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);
alter table public.notifications enable row level security;
drop policy if exists "notifications read own" on public.notifications;
create policy "notifications read own" on public.notifications for select using (user_id = auth.uid());
drop policy if exists "notifications update own" on public.notifications;
create policy "notifications update own" on public.notifications for update using (user_id = auth.uid());
drop policy if exists "notifications delete own" on public.notifications;
create policy "notifications delete own" on public.notifications for delete using (user_id = auth.uid());

create or replace function public.notify_on_reaction() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.confessions where id = new.confession_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, title, body, confession_id)
    values (author, new.user_id, 'vote',
      case when new.reaction = 'feel' then 'Someone felt your confession'
           else 'Someone veiled your confession' end,
      '', new.confession_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_reaction on public.reactions;
create trigger trg_notify_reaction after insert on public.reactions
  for each row execute function public.notify_on_reaction();

create or replace function public.notify_on_comment() returns trigger
language plpgsql security definer set search_path = public as $$
declare author uuid;
begin
  select author_id into author from public.confessions where id = new.confession_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications(user_id, actor_id, kind, title, body, confession_id)
    values (author, new.user_id, 'comment', 'New comment on your confession',
      left(coalesce(new.body, ''), 80), new.confession_id);
  end if;
  return new;
end $$;
drop trigger if exists trg_notify_comment on public.comments;
create trigger trg_notify_comment after insert on public.comments
  for each row execute function public.notify_on_comment();

-- ---------------------------------------------------------------------------
-- Updates (applied live via Management API):
--  * game_leaderboard gains a p_local scope (ranks within the caller's location).
--  * roulette_enqueue now requires BOTH a permanent age and sex.
-- ---------------------------------------------------------------------------
drop function if exists public.game_leaderboard(text, int);
create or replace function public.game_leaderboard(p_game text, p_limit int default 20, p_local boolean default false)
returns table(user_id uuid, emoji_key text, alias text, godmode boolean, best int, plays int, rank int, is_me boolean)
language sql security definer set search_path = public as $$
  with ranked as (
    select gs.user_id, p.emoji_key, p.alias, coalesce(p.godmode,false) as godmode, gs.best, gs.plays,
           rank() over (order by gs.best desc, gs.updated_at asc) as rank
    from public.game_scores gs join public.profiles p on p.id = gs.user_id
    where gs.game = p_game and gs.best > 0
      and coalesce(p.banned,false) = false and coalesce(p.anonymous,false) = false
      and (not p_local or (p.location is not null
            and lower(p.location) = lower((select location from public.profiles where id = auth.uid()))))
  )
  select user_id, emoji_key, alias, godmode, best, plays, rank::int, (user_id = auth.uid()) as is_me
  from ranked order by rank limit greatest(1, least(100, p_limit));
$$;
grant execute on function public.game_leaderboard(text, int, boolean) to anon, authenticated;

-- Genuine connections only: reject any friendship where either side is an
-- anonymous account (existing rows were also purged in Phase B).
create or replace function public.friendships_require_identified() returns trigger
language plpgsql security definer set search_path = public as $$
declare a_anon boolean; b_anon boolean;
begin
  select coalesce(anonymous, false) into a_anon from public.profiles where id = new.requester_id;
  select coalesce(anonymous, false) into b_anon from public.profiles where id = new.addressee_id;
  if coalesce(a_anon, true) or coalesce(b_anon, true) then
    raise exception 'Friendships require identified (non-anonymous) accounts';
  end if;
  return new;
end $$;
drop trigger if exists trg_friendships_identified on public.friendships;
create trigger trg_friendships_identified
  before insert or update on public.friendships
  for each row execute function public.friendships_require_identified();

-- ===========================================================================
-- Security Finding 1 (resolved): lock gender/age/location from direct client
-- SELECT; serve them only via SECURITY DEFINER read paths.
-- ===========================================================================
create or replace function public.my_profile()
returns setof public.profiles language sql security definer set search_path = public stable as $$
  select * from public.profiles where id = auth.uid();
$$;
grant execute on function public.my_profile() to authenticated;

create or replace function public.public_profile(p_id uuid)
returns table(
  id uuid, alias text, emoji_key text, aura text, godmode boolean,
  identity_public boolean, gender text, age int, location text,
  cosmetic_loadout jsonb, music_url text, prefs jsonb, created_at timestamptz
) language sql security definer set search_path = public stable as $$
  select p.id, p.alias, p.emoji_key, p.aura, coalesce(p.godmode,false),
         coalesce(p.identity_public,true),
         case when coalesce(p.identity_public,true) then p.gender end,
         case when coalesce(p.identity_public,true) then p.age end,
         case when coalesce(p.identity_public,true) then p.location end,
         p.cosmetic_loadout, p.music_url, p.prefs, p.created_at
  from public.profiles p where p.id = p_id;
$$;
grant execute on function public.public_profile(uuid) to anon, authenticated;

create or replace function public.admin_list_users(p_query text default '', p_limit int default 30)
returns table(id uuid, alias text, emoji_key text, godmode boolean, banned boolean, gender text, age int)
language sql security definer set search_path = public stable as $$
  select p.id, p.alias, p.emoji_key, coalesce(p.godmode,false), coalesce(p.banned,false), p.gender, p.age
  from public.profiles p
  where exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
    and (coalesce(p_query,'') = '' or p.alias ilike '%'||p_query||'%'
         or p.emoji_key ilike '%'||p_query||'%' or p.id::text = p_query)
  order by p.last_active_at desc nulls last
  limit greatest(1, least(200, p_limit));
$$;
grant execute on function public.admin_list_users(text, int) to authenticated;

revoke select on public.profiles from anon, authenticated;
grant select (
  id, alias, aura, karma, godmode, created_at, identity_public, nsfw_opt_in,
  emoji_key, last_active_at, nsfw_consent, is_admin, banned,
  identity_changes_remaining, credits, anonymous, last_bonus_at,
  cosmetic_loadout, music_url, prefs
) on public.profiles to anon, authenticated;
