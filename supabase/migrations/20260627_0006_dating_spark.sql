-- ===========================================================================
-- Spark — a minimal, interests-first dating layer.
--
-- Tinder-style swipe-to-match built on the rich profile data points already in
-- public.profiles.profile. Candidates are ranked by shared interests + locality
-- (same free-text location) and strictly kept within the swiper's age layer
-- (adult/minor computed inline — there is no cross-layer matching, ever). A
-- mutual like creates a symmetric match row. All access flows through
-- SECURITY DEFINER RPCs so raw like/pass history is never client-readable.
-- ===========================================================================

create table if not exists public.dating_likes (
  liker_id uuid not null references public.profiles(id) on delete cascade,
  liked_id uuid not null references public.profiles(id) on delete cascade,
  liked boolean not null,                 -- true = like, false = pass
  created_at timestamptz not null default now(),
  primary key (liker_id, liked_id)
);
create index if not exists dating_likes_liked_idx
  on public.dating_likes (liked_id) where liked;
alter table public.dating_likes enable row level security;
-- No client policies: all reads/writes go through the RPCs below.

create table if not exists public.dating_matches (
  a uuid not null references public.profiles(id) on delete cascade,
  b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (a, b),
  check (a < b)
);
alter table public.dating_matches enable row level security;

-- Sanitize the public profile blob (strip owner-hidden keys + the marker).
create or replace function public.sanitize_profile(p jsonb)
returns jsonb language sql immutable set search_path = public as $fn$
  select coalesce(p, '{}'::jsonb)
    - (array(select jsonb_array_elements_text(
         case when jsonb_typeof(p->'_hidden') = 'array' then p->'_hidden' else '[]'::jsonb end))
       || array['_hidden']);
$fn$;

-- Deck: discoverable people in my age layer I haven't swiped yet, ranked by
-- same-area first, then shared-interest overlap.
create or replace function public.dating_deck(p_limit int default 20)
returns table(
  user_id uuid, username text, alias text, gender text, age int,
  location text, profile jsonb, shared_interests int,
  shared_interest_names text[], same_area boolean
) language sql security definer set search_path = public stable as $fn$
  with me as (
    select id, age, location,
           coalesce(profile->'interests', '[]'::jsonb) as interests,
           case when age >= 18 then 'adult' else 'minor' end as layer
    from public.profiles where id = auth.uid()
  )
  select
    p.id, p.username, p.alias, p.gender, p.age, p.location,
    public.sanitize_profile(p.profile) as profile,
    public.jsonb_overlap_count(p.profile->'interests', me.interests) as shared_interests,
    public.jsonb_overlap_names(p.profile->'interests', me.interests) as shared_interest_names,
    (me.location is not null and p.location is not null
       and lower(p.location) = lower(me.location)) as same_area
  from public.profiles p, me
  where p.id <> auth.uid()
    and coalesce(p.banned, false) = false
    and coalesce(p.identity_public, true) = true
    and p.age is not null
    and (case when p.age >= 18 then 'adult' else 'minor' end) = me.layer
    and not exists (
      select 1 from public.dating_likes dl
      where dl.liker_id = auth.uid() and dl.liked_id = p.id
    )
  order by
    (me.location is not null and p.location is not null
       and lower(p.location) = lower(me.location)) desc,
    public.jsonb_overlap_count(p.profile->'interests', me.interests) desc,
    p.id
  limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.dating_deck(int) to authenticated;

-- Record a like/pass; on a reciprocated like, create the symmetric match.
create or replace function public.spark_like(p_target uuid, p_like boolean)
returns table(matched boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  reciprocal boolean;
begin
  if p_target = auth.uid() then
    return query select false;
    return;
  end if;
  insert into public.dating_likes (liker_id, liked_id, liked)
  values (auth.uid(), p_target, p_like)
  on conflict (liker_id, liked_id)
    do update set liked = excluded.liked, created_at = now();

  if not p_like then
    return query select false;
    return;
  end if;

  select exists(
    select 1 from public.dating_likes d
    where d.liker_id = p_target and d.liked_id = auth.uid() and d.liked
  ) into reciprocal;

  if reciprocal then
    insert into public.dating_matches (a, b)
    values (least(auth.uid(), p_target), greatest(auth.uid(), p_target))
    on conflict do nothing;
    return query select true;
  end if;
  return query select false;
end;
$fn$;
grant execute on function public.spark_like(uuid, boolean) to authenticated;

-- My matches (the other side of each match row).
create or replace function public.my_sparks(p_limit int default 50)
returns table(
  user_id uuid, username text, alias text, gender text, age int,
  location text, profile jsonb, matched_at timestamptz
) language sql security definer set search_path = public stable as $fn$
  select
    p.id, p.username, p.alias, p.gender, p.age, p.location,
    public.sanitize_profile(p.profile) as profile,
    m.created_at as matched_at
  from public.dating_matches m
  join public.profiles p
    on p.id = case when m.a = auth.uid() then m.b else m.a end
  where m.a = auth.uid() or m.b = auth.uid()
  order by m.created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.my_sparks(int) to authenticated;
