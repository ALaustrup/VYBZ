-- ===========================================================================
-- Profile data points + Matchmaking v3 (multi-signal affinity).
--
-- Adds a single rich, owner-private `profile` jsonb to public.profiles holding
-- the "many bits of info" a user can share (interests, intent, lifestyle,
-- personality, prompts, languages, links, …). Privacy is per top-level key via
-- profile->'_hidden' (an array of key names). The raw column is NEVER directly
-- selectable by clients (it is excluded from the column grant); it is served:
--   • in full to the owner            → public.my_profile() (SECURITY DEFINER)
--   • sanitized to everyone else      → public.public_profile() strips hidden keys
--   • read in full by the matcher     → user_matches() (SECURITY DEFINER) uses
--     even private interests to improve YOUR matches, but only ever emits the
--     aggregate match %/overlap — never the raw private values.
--
-- Matchmaking v3 blends behavioural taste (co-Vyb / co-Fail / disagreement) with
-- declared compatibility (shared interests + shared intent), and now also
-- surfaces candidates who simply share your interests — so brand-new users with
-- no voting history still get great matches. This is the data the leading social
-- and dating apps gate behind their ranking models; here it is transparent.
-- ===========================================================================

-- 1. The rich profile blob (owner-private; sanitized for the public). -------
alter table public.profiles
  add column if not exists profile jsonb not null default '{}'::jsonb;

-- GIN index so jsonb containment / interest lookups stay fast at scale.
create index if not exists profiles_profile_gin on public.profiles using gin (profile);

-- 2. Helper: count of overlapping text elements between two jsonb arrays. ----
create or replace function public.jsonb_overlap_count(a jsonb, b jsonb)
returns int language sql immutable as $fn$
  select count(*)::int from (
    select jsonb_array_elements_text(case when jsonb_typeof(a) = 'array' then a else '[]'::jsonb end)
    intersect
    select jsonb_array_elements_text(case when jsonb_typeof(b) = 'array' then b else '[]'::jsonb end)
  ) s;
$fn$;

-- Helper: the actual overlapping element names (for "you both love …" copy).
create or replace function public.jsonb_overlap_names(a jsonb, b jsonb)
returns text[] language sql immutable as $fn$
  select coalesce(array_agg(v), '{}') from (
    select jsonb_array_elements_text(case when jsonb_typeof(a) = 'array' then a else '[]'::jsonb end) as v
    intersect
    select jsonb_array_elements_text(case when jsonb_typeof(b) = 'array' then b else '[]'::jsonb end)
  ) s;
$fn$;

-- 3. public_profile: now returns the SANITIZED profile blob. -----------------
-- Output columns change, so drop + recreate (create-or-replace can't repaint).
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table(
  id uuid, alias text, emoji_key text, aura text, godmode boolean,
  identity_public boolean, gender text, age int, location text,
  cosmetic_loadout jsonb, music_url text, prefs jsonb, profile jsonb,
  created_at timestamptz
) language sql security definer set search_path = public stable as $fn$
  select p.id, p.alias, p.emoji_key, p.aura, coalesce(p.godmode,false),
         coalesce(p.identity_public,true),
         case when coalesce(p.identity_public,true) then p.gender end,
         case when coalesce(p.identity_public,true) then p.age end,
         case when coalesce(p.identity_public,true) then p.location end,
         p.cosmetic_loadout, p.music_url, p.prefs,
         -- Strip every key the owner marked private, plus the marker itself.
         (coalesce(p.profile, '{}'::jsonb)
            - (array(select jsonb_array_elements_text(
                 case when jsonb_typeof(p.profile->'_hidden') = 'array'
                      then p.profile->'_hidden' else '[]'::jsonb end))
               || array['_hidden'])) as profile,
         p.created_at
  from public.profiles p where p.id = p_id;
$fn$;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- 4. Matchmaking v3 — behavioural taste + declared compatibility. ------------
drop function if exists public.user_matches(int);
create or replace function public.user_matches(p_limit int default 12)
returns table(
  user_id uuid,
  username text,
  alias text,
  shared int,                  -- co-Vyb (both 'feel')
  shared_dislikes int,         -- co-Fail (both 'wild')
  disagreements int,           -- opposite reactions
  shared_interests int,        -- overlapping declared interests
  shared_intent int,           -- overlapping "looking for"
  shared_interest_names text[],-- the overlapping interest labels (for the UI)
  affinity numeric             -- 0..1 blended compatibility
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'interests','[]'::jsonb)  as interests,
           coalesce(profile->'lookingFor','[]'::jsonb) as intent
    from public.profiles where id = auth.uid()
  ),
  mine as (
    select confession_id, reaction from public.reactions where user_id = auth.uid()
  ),
  my_total as (select greatest(count(*), 1)::numeric as c from mine),
  -- Behavioural co-reaction signal.
  pair as (
    select
      r.user_id,
      count(*) filter (where m.reaction = 'feel' and r.reaction = 'feel') as agree_pos,
      count(*) filter (where m.reaction = 'wild' and r.reaction = 'wild') as agree_neg,
      count(*) filter (where m.reaction <> r.reaction)                    as disagree
    from public.reactions r
    join mine m on m.confession_id = r.confession_id
    where r.user_id <> auth.uid()
    group by r.user_id
  ),
  -- Declared-interest candidates (so new users match without voting history).
  interest_pool as (
    select p.id as user_id
    from public.profiles p, me
    where p.id <> auth.uid()
      and coalesce(p.anonymous,false) = false
      and coalesce(p.banned,false) = false
      and public.jsonb_overlap_count(p.profile->'interests', me.interests) >= 2
    limit 300
  ),
  candidates as (
    select user_id from pair
    union
    select user_id from interest_pool
  ),
  scored as (
    select
      c.user_id,
      coalesce(pr.agree_pos, 0) as agree_pos,
      coalesce(pr.agree_neg, 0) as agree_neg,
      coalesce(pr.disagree, 0)  as disagree,
      public.jsonb_overlap_count(p.profile->'interests', me.interests)  as ints,
      public.jsonb_overlap_count(p.profile->'lookingFor', me.intent)    as intent,
      public.jsonb_overlap_names(p.profile->'interests', me.interests)  as int_names
    from candidates c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join pair pr on pr.user_id = c.user_id
  ),
  blended as (
    select s.*,
      -- co-Vyb full, co-Fail strong, disagreement penalized, then declared
      -- interest + intent overlap (the compatibility layer dating apps hide).
      (s.agree_pos * 1.0 + s.agree_neg * 0.8 - s.disagree * 0.6
        + s.ints * 1.1 + s.intent * 1.6) as raw
    from scored s
  )
  select
    b.user_id,
    pr.username,
    pr.alias,
    b.agree_pos::int,
    b.agree_neg::int,
    b.disagree::int,
    b.ints::int,
    b.intent::int,
    b.int_names,
    round(least(1.0, greatest(0, b.raw) / ((select c from my_total) + 4)), 3) as affinity
  from blended b
  join public.profiles pr on pr.id = b.user_id
  where coalesce(pr.banned, false) = false
    and coalesce(pr.anonymous, false) = false
    and (b.agree_pos > 0 or b.agree_neg > 0 or b.ints >= 2)
    and not exists (
      select 1 from public.friendships f
      where f.status = 'friends'
        and ((f.requester_id = auth.uid() and f.addressee_id = b.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = b.user_id))
    )
  order by b.raw desc, b.agree_pos desc
  limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.user_matches(int) to authenticated;

-- my_vote_stats keeps its contract (counts via v3).
create or replace function public.my_vote_stats()
returns table(feels_given int, wilds_given int, matches int)
language sql security definer set search_path = public stable as $fn$
  select
    (select count(*) filter (where reaction='feel') from public.reactions where user_id = auth.uid())::int,
    (select count(*) filter (where reaction='wild') from public.reactions where user_id = auth.uid())::int,
    (select count(*) from public.user_matches(50))::int;
$fn$;
grant execute on function public.my_vote_stats() to authenticated;
