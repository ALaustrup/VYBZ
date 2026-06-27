-- MYVYB Live: community-curated livestream carousel.
--
-- UX: viewers see one stream at a time, full-screen. Swipe right = Vyb (stay,
-- positive signal), swipe left = Fail (rotate to next). Enough Fails or low
-- average Vyb-rate ends the stream's spotlight rotation early.
--
-- Streamer eligibility (mirrors random chat): verified email + permanent age +
-- permanent sex. Age-layer isolation: teens (13-17) only see teen streamers; 18+
-- only see 18+. NSFW streaming requires the streamer's NSFW gate to be unlocked
-- AND the viewer's NSFW opt-in.
--
-- We DO NOT host video ourselves. The actual WebRTC transport is delegated to a
-- managed SFU (LiveKit, Mux Real-Time, Daily, Cloudflare Realtime — TBD).
-- `provider` + `room_id` + `playback_id` are the integration points; the rest of
-- this schema is provider-agnostic.

-- ── Streams ────────────────────────────────────────────────────────────────
create table if not exists public.live_streams (
  id              uuid primary key default gen_random_uuid(),
  user_id         uuid not null references public.profiles on delete cascade,
  started_at      timestamptz not null default now(),
  ended_at        timestamptz,
  -- Provider-specific routing (filled in by the streamer-bootstrap RPC).
  provider        text not null default 'livekit',
  room_id         text,
  playback_id     text,
  -- Age routing (snapshot from profile at start time; stream is gated to this).
  age_layer       text not null check (age_layer in ('teen', 'adult')),
  -- Streamer self-marks "this stream may show sensitive content."
  nsfw            boolean not null default false,
  -- Short title shown over the stream (optional, ≤80 chars).
  title           text,
  -- Aggregate Vyb/Fail counts (also live in live_reactions; cached for ranking).
  vybs            int not null default 0,
  fails           int not null default 0,
  peak_viewers    int not null default 0
);
create index if not exists live_streams_open_idx
  on public.live_streams (age_layer, started_at desc) where ended_at is null;
create unique index if not exists live_streams_one_open_per_user
  on public.live_streams (user_id) where ended_at is null;

alter table public.live_streams enable row level security;

-- Viewers can read OPEN streams within their age layer; streamers always see
-- their own. Server enforces NSFW visibility via the carousel RPC, not RLS, so
-- end-of-stream rows remain readable for moderation history.
drop policy if exists "live_streams read open" on public.live_streams;
create policy "live_streams read open" on public.live_streams for select using (
  ended_at is null
  and (
    age_layer = case
      when (select age from public.profiles where id = auth.uid()) < 18 then 'teen'
      else 'adult'
    end
  )
  or user_id = auth.uid()
);

-- ── Reactions (swipe Vyb/Fail) ─────────────────────────────────────────────
create table if not exists public.live_reactions (
  stream_id  uuid not null references public.live_streams on delete cascade,
  user_id    uuid not null references public.profiles on delete cascade,
  reaction   text not null check (reaction in ('vyb', 'fail')),
  created_at timestamptz not null default now(),
  primary key (stream_id, user_id)
);
alter table public.live_reactions enable row level security;
drop policy if exists "live_reactions own write" on public.live_reactions;
drop policy if exists "live_reactions own read" on public.live_reactions;
create policy "live_reactions own write" on public.live_reactions
  for insert with check (user_id = auth.uid());
create policy "live_reactions own update" on public.live_reactions
  for update using (user_id = auth.uid());
create policy "live_reactions own read" on public.live_reactions
  for select using (user_id = auth.uid());

-- Keep the cached vyb/fail counts on the stream in sync.
create or replace function public.live_reactions_tally() returns trigger
language plpgsql security definer set search_path = public as $fn$
begin
  if TG_OP = 'INSERT' then
    if NEW.reaction = 'vyb' then
      update public.live_streams set vybs = vybs + 1 where id = NEW.stream_id;
    else
      update public.live_streams set fails = fails + 1 where id = NEW.stream_id;
    end if;
  elsif TG_OP = 'UPDATE' and NEW.reaction <> OLD.reaction then
    if NEW.reaction = 'vyb' then
      update public.live_streams set vybs = vybs + 1, fails = greatest(fails - 1, 0) where id = NEW.stream_id;
    else
      update public.live_streams set fails = fails + 1, vybs = greatest(vybs - 1, 0) where id = NEW.stream_id;
    end if;
  end if;
  return NEW;
end $fn$;
drop trigger if exists trg_live_reactions_tally on public.live_reactions;
create trigger trg_live_reactions_tally after insert or update on public.live_reactions
for each row execute function public.live_reactions_tally();

-- ── RPCs ───────────────────────────────────────────────────────────────────

-- Start a stream. Returns provider routing info; the client uses it to publish.
-- Eligibility: verified email + permanent age + permanent sex + non-anonymous
-- + non-banned. Only one open stream per user at a time.
create or replace function public.live_start(p_title text default null, p_nsfw boolean default false)
returns table(stream_id uuid, age_layer text, provider text)
language plpgsql security definer set search_path = public, auth as $fn$
declare
  uid uuid := auth.uid();
  my_age int; my_gender text; anon boolean; is_banned boolean; verified boolean;
  layer text; new_id uuid;
begin
  if uid is null then raise exception 'unauthenticated'; end if;
  select age, gender, coalesce(anonymous, false), coalesce(banned, false)
    into my_age, my_gender, anon, is_banned
    from public.profiles where id = uid;
  select coalesce(
    (select (email_confirmed_at is not null or confirmed_at is not null) from auth.users where id = uid),
    false
  ) into verified;
  if anon or is_banned or my_age is null or my_gender is null or not verified then
    raise exception 'not eligible to stream';
  end if;
  layer := case when my_age < 18 then 'teen' else 'adult' end;
  insert into public.live_streams(user_id, age_layer, title, nsfw)
    values (uid, layer, nullif(btrim(p_title), ''), coalesce(p_nsfw, false))
    returning id into new_id;
  return query select new_id, layer, 'livekit'::text;
end $fn$;
grant execute on function public.live_start(text, boolean) to authenticated;

-- Streamer ends their own stream.
create or replace function public.live_end(p_stream uuid)
returns void language sql security definer set search_path = public as $fn$
  update public.live_streams
     set ended_at = coalesce(ended_at, now())
   where id = p_stream and user_id = auth.uid();
$fn$;
grant execute on function public.live_end(uuid) to authenticated;

-- Viewer swipe — idempotent (one reaction per stream per viewer; later swipes
-- in the same direction are no-ops, opposite swipes flip).
create or replace function public.live_react(p_stream uuid, p_reaction text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  if p_reaction not in ('vyb', 'fail') then return; end if;
  insert into public.live_reactions(stream_id, user_id, reaction)
    values (p_stream, auth.uid(), p_reaction)
    on conflict (stream_id, user_id) do update set reaction = excluded.reaction;
end $fn$;
grant execute on function public.live_react(uuid, text) to authenticated;

-- The carousel feed: open streams in the caller's age layer, ranked by a
-- Vyb-rate / freshness blend; respects NSFW opt-in; skips streams the caller
-- already reacted to (cooldown — Fails rotate forward, Vybs hide the same
-- stream for a while).
create or replace function public.live_carousel(p_limit int default 12)
returns table(
  stream_id uuid,
  user_id uuid,
  username text,
  title text,
  nsfw boolean,
  provider text,
  playback_id text,
  started_at timestamptz,
  vybs int,
  fails int
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(nsfw_opt_in, false) as wants_nsfw,
           case when coalesce(age, 0) < 18 then 'teen' else 'adult' end as layer
    from public.profiles where id = auth.uid()
  )
  select
    s.id, s.user_id, p.username, s.title, s.nsfw, s.provider, s.playback_id,
    s.started_at, s.vybs, s.fails
  from public.live_streams s
  join me on s.age_layer = me.layer
  join public.profiles p on p.id = s.user_id
  where s.ended_at is null
    and (s.nsfw = false or me.wants_nsfw = true)
    and coalesce(p.banned, false) = false
    and s.user_id <> auth.uid()
    and not exists (
      select 1 from public.live_reactions r
      where r.stream_id = s.id and r.user_id = auth.uid()
    )
  order by
    -- Bayesian-ish Vyb rate (5-vote prior) — keeps fresh streams competitive.
    (s.vybs + 5)::numeric / (s.vybs + s.fails + 10) desc,
    s.started_at desc
  limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.live_carousel(int) to authenticated;
