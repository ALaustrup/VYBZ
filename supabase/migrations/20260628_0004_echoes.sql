-- ===========================================================================
-- Echoes (Phase 4) — opt-in, owner-authored AI personas of a REAL user.
--
-- The highest-trust feature on the platform, so the guardrails are in the schema
-- itself, not just the UI:
--   • An Echo can ONLY exist for your own account (echoes.user_id = auth.uid()).
--     We never fabricate an AI of someone from observed/scraped data.
--   • Consent is recorded (consent_at + consent_version) and required to enable.
--   • Adults only (>= 18) and same age-layer; enforced again server-side.
--   • Always disclosed as AI in every surface and in the echo-chat persona.
--   • The owner can review every conversation and delete the Echo (which cascades
--     its messages). Visitors only ever see their own thread with an Echo.
--
-- Conversations live in echo_messages, written server-side by the echo-chat Edge
-- Function (service role). RLS lets the owner read all of their Echo's threads
-- (transcript review) and a visitor read only their own thread.
-- ===========================================================================

create table if not exists public.echoes (
  user_id         uuid primary key references public.profiles on delete cascade,
  enabled         boolean not null default false,
  display_name    text,
  tone            text not null default 'warm'
                    check (tone in ('warm', 'playful', 'direct', 'thoughtful')),
  greeting        text,
  bio_seed        text,
  consent_at      timestamptz,
  consent_version text,
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
alter table public.echoes enable row level security;

drop policy if exists "echoes owner all" on public.echoes;
create policy "echoes owner all" on public.echoes
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

create table if not exists public.echo_messages (
  id          uuid primary key default gen_random_uuid(),
  echo_owner  uuid not null references public.profiles on delete cascade,
  visitor_id  uuid not null references public.profiles on delete cascade,
  role        text not null check (role in ('user', 'assistant')),
  content     text not null,
  created_at  timestamptz not null default now()
);
create index if not exists echo_messages_thread_idx
  on public.echo_messages (echo_owner, visitor_id, created_at);
create index if not exists echo_messages_visitor_idx
  on public.echo_messages (visitor_id, created_at);

alter table public.echo_messages enable row level security;
-- Readable by the visitor (their own thread) or the Echo's owner (review).
-- Writes happen via the Edge Function (service role), so no insert policy.
drop policy if exists "echo_messages read" on public.echo_messages;
create policy "echo_messages read" on public.echo_messages
  for select using (visitor_id = auth.uid() or echo_owner = auth.uid());

-- ── Owner: read own Echo config ────────────────────────────────────────────
create or replace function public.echo_get()
returns table(
  enabled boolean, display_name text, tone text, greeting text,
  bio_seed text, consent_at timestamptz
)
language sql security definer set search_path = public stable as $fn$
  select enabled, display_name, tone, greeting, bio_seed, consent_at
  from public.echoes where user_id = auth.uid();
$fn$;
grant execute on function public.echo_get() to authenticated;

-- ── Owner: create / update Echo config (adult-gated; records consent) ───────
create or replace function public.echo_upsert(
  p_enabled boolean,
  p_display_name text,
  p_tone text,
  p_greeting text,
  p_bio_seed text,
  p_consent_version text
)
returns void language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  my_age int;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  select age into my_age from public.profiles where id = uid;
  -- Echoes are 18+ only.
  if coalesce(my_age, 0) < 18 then
    raise exception 'Echoes are available to verified adults (18+) only';
  end if;

  insert into public.echoes as e
    (user_id, enabled, display_name, tone, greeting, bio_seed,
     consent_at, consent_version, updated_at)
  values
    (uid, coalesce(p_enabled, false), nullif(trim(p_display_name), ''),
     coalesce(nullif(p_tone, ''), 'warm'), nullif(trim(p_greeting), ''),
     nullif(trim(p_bio_seed), ''),
     case when p_enabled then now() else null end, p_consent_version, now())
  on conflict (user_id) do update set
    enabled = coalesce(p_enabled, false),
    display_name = nullif(trim(p_display_name), ''),
    tone = coalesce(nullif(p_tone, ''), 'warm'),
    greeting = nullif(trim(p_greeting), ''),
    bio_seed = nullif(trim(p_bio_seed), ''),
    -- Stamp consent the first time it's enabled or when the terms version changes.
    consent_at = case
      when p_enabled and (e.consent_at is null or e.consent_version is distinct from p_consent_version)
        then now() else e.consent_at end,
    consent_version = case when p_enabled then p_consent_version else e.consent_version end,
    updated_at = now();
end $fn$;
grant execute on function public.echo_upsert(boolean, text, text, text, text, text) to authenticated;

-- ── Owner: quick enable/disable ────────────────────────────────────────────
create or replace function public.echo_set_enabled(p_enabled boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); my_age int;
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if p_enabled then
    select age into my_age from public.profiles where id = uid;
    if coalesce(my_age, 0) < 18 then
      raise exception 'Echoes are available to verified adults (18+) only';
    end if;
  end if;
  update public.echoes
    set enabled = p_enabled,
        consent_at = case when p_enabled and consent_at is null then now() else consent_at end,
        updated_at = now()
    where user_id = uid;
end $fn$;
grant execute on function public.echo_set_enabled(boolean) to authenticated;

-- ── Owner: delete Echo (cascades messages via FK) ──────────────────────────
create or replace function public.echo_delete()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.echo_messages where echo_owner = auth.uid();
  delete from public.echoes where user_id = auth.uid();
end $fn$;
grant execute on function public.echo_delete() to authenticated;

-- ── Visitor: is a target user's Echo available to me right now? ─────────────
-- Returns enabled=true only when: target opted in + enabled, both are adults in
-- the same age layer, and neither has blocked the other.
create or replace function public.echo_public(p_user uuid)
returns table(owner uuid, display_name text, tone text, greeting text, enabled boolean)
language plpgsql security definer set search_path = public stable as $fn$
declare
  uid uuid := auth.uid();
  my_age int;
  their_age int;
  ok boolean := false;
  e record;
begin
  if uid is null or p_user is null or p_user = uid then
    return query select p_user, null::text, null::text, null::text, false; return;
  end if;
  select age into my_age from public.profiles where id = uid;
  select age into their_age from public.profiles
    where id = p_user and coalesce(banned,false) = false;
  select * into e from public.echoes where user_id = p_user;

  ok := e.enabled is true
    and coalesce(my_age,0) >= 18 and coalesce(their_age,0) >= 18
    and not exists (
      select 1 from public.blocks b
      where (b.blocker_id = uid and b.blocked_id = p_user)
         or (b.blocker_id = p_user and b.blocked_id = uid)
    );

  return query select p_user,
    case when ok then coalesce(e.display_name, '') end,
    case when ok then e.tone end,
    case when ok then e.greeting end,
    coalesce(ok, false);
end $fn$;
grant execute on function public.echo_public(uuid) to authenticated;

-- ── Visitor: my conversation with a given Echo (oldest → newest) ───────────
create or replace function public.echo_history(p_owner uuid, p_limit int default 40)
returns table(role text, content text, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select role, content, created_at from (
    select role, content, created_at from public.echo_messages
    where echo_owner = p_owner and visitor_id = auth.uid()
    order by created_at desc limit greatest(1, least(100, p_limit))
  ) t order by created_at asc;
$fn$;
grant execute on function public.echo_history(uuid, int) to authenticated;

-- ── Owner: list of people who've talked to my Echo (transcript review) ──────
create or replace function public.echo_visitors()
returns table(visitor_id uuid, username text, alias text, last_at timestamptz, msgs int)
language sql security definer set search_path = public stable as $fn$
  select m.visitor_id, p.username, p.alias, max(m.created_at) as last_at, count(*)::int as msgs
  from public.echo_messages m
  join public.profiles p on p.id = m.visitor_id
  where m.echo_owner = auth.uid()
  group by m.visitor_id, p.username, p.alias
  order by max(m.created_at) desc
  limit 100;
$fn$;
grant execute on function public.echo_visitors() to authenticated;

-- ── Owner: full transcript with one visitor ────────────────────────────────
create or replace function public.echo_transcript(p_visitor uuid, p_limit int default 80)
returns table(role text, content text, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select role, content, created_at from (
    select role, content, created_at from public.echo_messages
    where echo_owner = auth.uid() and visitor_id = p_visitor
    order by created_at desc limit greatest(1, least(200, p_limit))
  ) t order by created_at asc;
$fn$;
grant execute on function public.echo_transcript(uuid, int) to authenticated;
