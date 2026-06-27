-- Lifelines — peer support that turns a confession into a person.
--
-- A user in crisis taps "Talk to someone now"; the server pops the longest-
-- waiting available volunteer ("Lifeline") who matches age layer + language and
-- creates an ephemeral 1:1 session. Text-only for v1; LiveKit-backed voice
-- comes in v2. Messages are NEVER stored — only the session shell (so we can
-- detect bad actors and end sessions cleanly).
--
-- This is PEER support, not professional crisis services. Every UI surface
-- carries that disclaimer and prominently links 988 (US) / international
-- helplines. Lifelines explicitly accept a code of conduct before opting in.

-- ── Lifeline opt-in + availability ────────────────────────────────────────
alter table public.profiles add column if not exists lifeline boolean not null default false;
alter table public.profiles add column if not exists lifeline_available boolean not null default false;
alter table public.profiles add column if not exists lifeline_language text;       -- ISO 639-1, e.g. 'en'
alter table public.profiles add column if not exists lifeline_completed int not null default 0;

-- Eligibility: verified email, permanent age + sex, 18+, not banned, not anon.
create or replace function public.become_lifeline(p_lang text default 'en')
returns boolean language plpgsql security definer set search_path = public, auth as $fn$
declare
  uid uuid := auth.uid();
  my_age int; my_gender text; anon boolean; is_banned boolean; verified boolean;
begin
  if uid is null then return false; end if;
  select age, gender, coalesce(anonymous, false), coalesce(banned, false)
    into my_age, my_gender, anon, is_banned
    from public.profiles where id = uid;
  select coalesce(
    (select (email_confirmed_at is not null or confirmed_at is not null) from auth.users where id = uid),
    false
  ) into verified;
  if anon or is_banned or my_age is null or my_age < 18 or my_gender is null or not verified then
    return false;
  end if;
  update public.profiles
     set lifeline = true,
         lifeline_language = coalesce(nullif(btrim(p_lang), ''), lifeline_language, 'en')
   where id = uid;
  return true;
end $fn$;
grant execute on function public.become_lifeline(text) to authenticated;

create or replace function public.set_lifeline_available(p_on boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  -- Going "available" requires the opt-in flag (set by become_lifeline).
  if p_on and not coalesce((select lifeline from public.profiles where id = uid), false) then
    raise exception 'not a lifeline';
  end if;
  update public.profiles set lifeline_available = coalesce(p_on, false) where id = uid;
end $fn$;
grant execute on function public.set_lifeline_available(boolean) to authenticated;

-- ── Queue + sessions ───────────────────────────────────────────────────────
create table if not exists public.lifeline_queue (
  user_id uuid primary key references public.profiles on delete cascade,
  language text not null default 'en',
  age_layer text not null check (age_layer in ('teen', 'adult')),
  enqueued_at timestamptz not null default now()
);
alter table public.lifeline_queue enable row level security;

create table if not exists public.lifeline_sessions (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles on delete cascade,
  lifeline_id uuid not null references public.profiles on delete cascade,
  language text not null default 'en',
  age_layer text not null check (age_layer in ('teen', 'adult')),
  started_at timestamptz not null default now(),
  ended_at timestamptz,
  ended_by uuid,
  ended_reason text -- 'requester', 'lifeline', 'reported', '988_handoff', 'expired'
);
alter table public.lifeline_sessions enable row level security;

-- Either party may read their own session shell (no message bodies stored).
drop policy if exists "lifeline_sessions read own" on public.lifeline_sessions;
create policy "lifeline_sessions read own" on public.lifeline_sessions for select using (
  requester_id = auth.uid() or lifeline_id = auth.uid()
);

-- ── Match RPC ──────────────────────────────────────────────────────────────
-- Requester pops the longest-waiting available Lifeline who matches their age
-- layer (teens with teens, adults with adults) and language. Returns the
-- session id when matched, or waiting=true when none available right now.
create or replace function public.lifeline_request(p_language text default 'en')
returns table(session_id uuid, lifeline_id uuid, waiting boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  my_age int; is_banned boolean; layer text; lang text;
  partner uuid; new_sess uuid;
begin
  if uid is null then return query select null::uuid, null::uuid, false; return; end if;
  select age, coalesce(banned, false) into my_age, is_banned from public.profiles where id = uid;
  if is_banned or my_age is null then
    return query select null::uuid, null::uuid, false; return;
  end if;
  layer := case when my_age < 18 then 'teen' else 'adult' end;
  lang := coalesce(nullif(btrim(p_language), ''), 'en');

  -- Pick the longest-waiting AVAILABLE Lifeline who matches age layer + language
  -- and isn't already in an active session, and isn't the requester themselves.
  select p.id into partner
    from public.profiles p
    where coalesce(p.lifeline_available, false) = true
      and coalesce(p.banned, false) = false
      and p.id <> uid
      and (case when coalesce(p.age, 0) < 18 then 'teen' else 'adult' end) = layer
      and coalesce(p.lifeline_language, 'en') = lang
      and not exists (
        select 1 from public.lifeline_sessions s
        where s.lifeline_id = p.id and s.ended_at is null
      )
    order by p.lifeline_available desc, p.last_active_at asc nulls first
    limit 1;

  if partner is not null then
    insert into public.lifeline_sessions(requester_id, lifeline_id, language, age_layer)
      values (uid, partner, lang, layer) returning id into new_sess;
    -- Take the Lifeline off the available pool while they're in session.
    update public.profiles set lifeline_available = false where id = partner;
    -- Clean up any stale queue row for the requester.
    delete from public.lifeline_queue where user_id = uid;
    return query select new_sess, partner, false; return;
  end if;

  -- No Lifeline available right now — queue.
  insert into public.lifeline_queue(user_id, language, age_layer)
    values (uid, lang, layer)
    on conflict (user_id) do update
      set language = excluded.language,
          age_layer = excluded.age_layer,
          enqueued_at = now();
  return query select null::uuid, null::uuid, true;
end $fn$;
grant execute on function public.lifeline_request(text) to authenticated;

-- Cancel an in-flight request (user changed their mind).
create or replace function public.lifeline_cancel()
returns void language sql security definer set search_path = public as $fn$
  delete from public.lifeline_queue where user_id = auth.uid();
$fn$;
grant execute on function public.lifeline_cancel() to authenticated;

-- End a session (either party). The Lifeline becomes available again unless
-- they ended it themselves (in which case they probably need a break) — they
-- can flip availability back on manually.
create or replace function public.lifeline_end(p_session uuid, p_reason text default 'requester')
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); s record;
begin
  select * into s from public.lifeline_sessions
    where id = p_session and (requester_id = uid or lifeline_id = uid);
  if s.id is null or s.ended_at is not null then return; end if;
  update public.lifeline_sessions
     set ended_at = now(), ended_by = uid,
         ended_reason = coalesce(nullif(btrim(p_reason), ''), 'requester')
   where id = s.id;
  -- A completed session counts toward the Lifeline's gentle recognition badge.
  update public.profiles set lifeline_completed = coalesce(lifeline_completed, 0) + 1
    where id = s.lifeline_id;
  -- If the requester ended, the Lifeline goes back on shift.
  if uid = s.requester_id then
    update public.profiles set lifeline_available = true where id = s.lifeline_id and lifeline = true;
  end if;
end $fn$;
grant execute on function public.lifeline_end(uuid, text) to authenticated;

-- Quick UI count: how many Lifelines are available right now in the caller's
-- age layer / language. Used by the "Talk to someone now" sheet so we can show
-- truthful availability instead of pretending.
create or replace function public.lifeline_count_available(p_language text default 'en')
returns int language sql security definer set search_path = public stable as $fn$
  select count(*)::int
    from public.profiles p
    where coalesce(p.lifeline_available, false) = true
      and coalesce(p.banned, false) = false
      and (case when coalesce(p.age, 0) < 18 then 'teen' else 'adult' end) =
          (case when coalesce(
              (select age from public.profiles where id = auth.uid()), 0
            ) < 18 then 'teen' else 'adult' end)
      and coalesce(p.lifeline_language, 'en') = coalesce(nullif(btrim(p_language), ''), 'en');
$fn$;
grant execute on function public.lifeline_count_available(text) to anon, authenticated;

-- The waiting requester's signal that a session was just created for them.
-- (Realtime listener on lifeline_sessions inserts where requester_id = me.)
-- Realtime needs the table in the supabase_realtime publication:
alter publication supabase_realtime add table public.lifeline_sessions;
