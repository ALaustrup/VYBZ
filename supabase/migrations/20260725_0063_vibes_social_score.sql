-- Phase 1 (Vibes): profile geo + Social Score v0 + feed vibe cards.
-- Cosmetics never enter fit. Connection stays free. Identity-first.

-- ── Geo columns (optional; haversine when both peers have coords) ────────────
alter table public.profiles
  add column if not exists lat double precision,
  add column if not exists lng double precision;

alter table public.profiles
  drop constraint if exists profiles_lat_range;
alter table public.profiles
  add constraint profiles_lat_range check (lat is null or (lat >= -90 and lat <= 90));
alter table public.profiles
  drop constraint if exists profiles_lng_range;
alter table public.profiles
  add constraint profiles_lng_range check (lng is null or (lng >= -180 and lng <= 180));

create index if not exists profiles_lat_lng_idx
  on public.profiles (lat, lng)
  where lat is not null and lng is not null;

-- ── Social Score tables ─────────────────────────────────────────────────────
create table if not exists public.social_scores (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  dimensions jsonb not null default '{}'::jsonb,
  confidence real not null default 0,
  matchable boolean not null default false,
  why_hints text[] not null default '{}',
  updated_at timestamptz not null default now()
);

alter table public.social_scores enable row level security;

drop policy if exists social_scores_select_own on public.social_scores;
create policy social_scores_select_own on public.social_scores
  for select to authenticated
  using (user_id = auth.uid());

-- Events are append-only via definer RPCs; no direct client writes.
create table if not exists public.social_score_events (
  id bigint generated always as identity primary key,
  user_id uuid not null references public.profiles (id) on delete cascade,
  kind text not null,
  payload jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists social_score_events_user_created_idx
  on public.social_score_events (user_id, created_at desc);

alter table public.social_score_events enable row level security;

drop policy if exists social_score_events_select_own on public.social_score_events;
create policy social_score_events_select_own on public.social_score_events
  for select to authenticated
  using (user_id = auth.uid());

revoke insert, update, delete on public.social_scores from anon, authenticated;
revoke insert, update, delete on public.social_score_events from anon, authenticated;
grant select on public.social_scores to authenticated;
grant select on public.social_score_events to authenticated;

-- ── Helpers ─────────────────────────────────────────────────────────────────
create or replace function public.haversine_miles(
  lat1 double precision, lng1 double precision,
  lat2 double precision, lng2 double precision
) returns double precision
language sql immutable parallel safe as $$
  select case
    when lat1 is null or lng1 is null or lat2 is null or lng2 is null then null
    else (
      3958.7613 * 2 * asin(sqrt(
        power(sin(radians(lat2 - lat1) / 2), 2)
        + cos(radians(lat1)) * cos(radians(lat2))
          * power(sin(radians(lng2 - lng1) / 2), 2)
      ))
    )
  end;
$$;

create or replace function public.profile_jsonb_text_array(p jsonb, p_key text)
returns text[]
language sql immutable parallel safe as $$
  select coalesce(
    array(
      select jsonb_array_elements_text(coalesce(p -> p_key, '[]'::jsonb))
    ),
    '{}'::text[]
  );
$$;

create or replace function public.profile_is_matchable(p public.profiles)
returns boolean
language sql stable parallel safe as $$
  select
    coalesce(p.banned, false) = false
    and (
      coalesce(cardinality(public.profile_jsonb_text_array(p.profile, 'interests')), 0) > 0
      or coalesce(cardinality(public.profile_jsonb_text_array(p.profile, 'lookingFor')), 0) > 0
      or coalesce(cardinality(public.profile_jsonb_text_array(p.profile, 'meetupIntents')), 0) > 0
      or coalesce(cardinality(public.profile_jsonb_text_array(p.profile, 'genres')), 0) > 0
      or exists (select 1 from public.creator_roles cr where cr.user_id = p.id)
      or exists (select 1 from public.creator_seeks cs where cs.user_id = p.id)
      or (p.avatar_url is not null and nullif(btrim(coalesce(p.bio, '')), '') is not null)
      or (p.avatar_url is not null and nullif(btrim(coalesce(p.location, '')), '') is not null)
    );
$$;

create or replace function public.record_social_score_event(
  p_kind text,
  p_payload jsonb default '{}'::jsonb
) returns void
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  if p_kind is null or length(btrim(p_kind)) = 0 then
    raise exception 'kind required';
  end if;
  insert into public.social_score_events (user_id, kind, payload)
  values (auth.uid(), left(btrim(p_kind), 64), coalesce(p_payload, '{}'::jsonb));
  perform public.recompute_social_score(auth.uid());
end;
$$;
grant execute on function public.record_social_score_event(text, jsonb) to authenticated;

create or replace function public.recompute_social_score(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  v_interests text[];
  v_looking text[];
  v_meetup text[];
  v_genres text[];
  v_offers int;
  v_seeks int;
  v_events int;
  v_interest_n real;
  v_rel_n real;
  v_create_n real;
  v_geo_n real;
  v_trust_n real;
  v_fresh_n real;
  v_taste_n real;
  v_conf real;
  v_matchable boolean;
  v_hints text[] := '{}';
  v_dims jsonb;
  v_age int;
  v_birth int;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then
    return;
  end if;

  v_interests := public.profile_jsonb_text_array(p.profile, 'interests');
  v_looking := public.profile_jsonb_text_array(p.profile, 'lookingFor');
  v_meetup := public.profile_jsonb_text_array(p.profile, 'meetupIntents');
  v_genres := public.profile_jsonb_text_array(p.profile, 'genres');

  select count(*)::int into v_offers from public.creator_roles where user_id = p_user_id;
  select count(*)::int into v_seeks from public.creator_seeks where user_id = p_user_id;
  select count(*)::int into v_events
  from public.social_score_events
  where user_id = p_user_id and created_at > now() - interval '30 days';

  v_interest_n := least(1.0, cardinality(v_interests)::real / 5.0
    + cardinality(v_genres)::real / 10.0);

  v_rel_n := least(1.0,
    (case when cardinality(v_looking) > 0 then 0.45 else 0 end)
    + (case when cardinality(v_meetup) > 0 then 0.45 else 0 end)
    + (case when coalesce((p.profile->>'birthYear')::int, 0) between 1920 and 2012 then 0.1 else 0 end)
  );

  v_create_n := least(1.0, (v_offers + v_seeks)::real / 6.0
    + (case when coalesce((p.profile->>'openToWork')::boolean, false) then 0.15 else 0 end));

  v_geo_n := least(1.0,
    (case when p.lat is not null and p.lng is not null then 0.55 else 0 end)
    + (case when nullif(btrim(coalesce(p.location, '')), '') is not null then 0.35 else 0 end)
    + (case when coalesce((p.profile->>'remoteOk')::boolean, true) then 0.1 else 0 end)
  );

  -- Trust from photo + identity; never from cosmetics / credits / tips.
  v_trust_n := least(1.0,
    (case when p.avatar_url is not null then 0.45 else 0 end)
    + (case when p.username is not null then 0.25 else 0 end)
    + (case when nullif(btrim(coalesce(p.bio, '')), '') is not null then 0.2 else 0 end)
    + (case when coalesce((p.profile->>'shareAge')::boolean, false) then 0.05 else 0 end)
    + (case when coalesce((p.profile->>'shareSex')::boolean, false) then 0.05 else 0 end)
  );

  v_fresh_n := least(1.0, greatest(0.15,
    1.0 - extract(epoch from (now() - coalesce(p.created_at, now()))) / (86400.0 * 45.0)
  ));

  v_taste_n := least(1.0, v_events::real / 20.0);

  v_conf := least(1.0,
    0.2 * v_interest_n + 0.2 * v_rel_n + 0.15 * v_create_n
    + 0.15 * v_geo_n + 0.2 * v_trust_n + 0.05 * v_taste_n + 0.05 * v_fresh_n
  );

  v_matchable := public.profile_is_matchable(p);

  if cardinality(v_interests) > 0 then
    v_hints := v_hints || array['Into ' || array_to_string(v_interests[1:3], ', ')];
  end if;
  if cardinality(v_meetup) > 0 then
    v_hints := v_hints || array['Open to ' || array_to_string(v_meetup[1:2], ', ')];
  end if;
  if cardinality(v_looking) > 0 then
    v_hints := v_hints || array['Looking for ' || array_to_string(v_looking[1:2], ', ')];
  end if;
  if nullif(btrim(coalesce(p.location, '')), '') is not null then
    v_hints := v_hints || array['Near ' || btrim(p.location)];
  end if;

  v_birth := nullif(p.profile->>'birthYear', '')::int;
  if v_birth is not null and v_birth between 1920 and 2012 then
    v_age := extract(year from age(make_date(v_birth, 6, 15)))::int;
  end if;

  v_dims := jsonb_build_object(
    'interest', round(v_interest_n::numeric, 3),
    'relational', round(v_rel_n::numeric, 3),
    'create', round(v_create_n::numeric, 3),
    'geo', round(v_geo_n::numeric, 3),
    'trust', round(v_trust_n::numeric, 3),
    'taste', round(v_taste_n::numeric, 3),
    'freshness', round(v_fresh_n::numeric, 3),
    'age', v_age,
    'matchRadiusMiles', coalesce(nullif(p.profile->>'matchRadiusMiles', '')::int, 100),
    -- Explicit guardrail: payment/cosmetic state never stored as score inputs.
    'cosmeticsExcluded', true
  );

  insert into public.social_scores as ss (user_id, dimensions, confidence, matchable, why_hints, updated_at)
  values (p_user_id, v_dims, v_conf, v_matchable, v_hints, now())
  on conflict (user_id) do update set
    dimensions = excluded.dimensions,
    confidence = excluded.confidence,
    matchable = excluded.matchable,
    why_hints = excluded.why_hints,
    updated_at = now();
end;
$$;
grant execute on function public.recompute_social_score(uuid) to authenticated;

create or replace function public.my_social_score()
returns table (
  user_id uuid,
  dimensions jsonb,
  confidence real,
  matchable boolean,
  why_hints text[],
  updated_at timestamptz
)
language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;
  perform public.recompute_social_score(auth.uid());
  return query
  select s.user_id, s.dimensions, s.confidence, s.matchable, s.why_hints, s.updated_at
  from public.social_scores s
  where s.user_id = auth.uid();
end;
$$;
grant execute on function public.my_social_score() to authenticated;

-- Keep score fresh when profile facets change (never reads cosmetics for fit).
create or replace function public.trg_profiles_recompute_social_score()
returns trigger
language plpgsql security definer set search_path = public as $$
begin
  perform public.recompute_social_score(new.id);
  return new;
end;
$$;

drop trigger if exists profiles_recompute_social_score on public.profiles;
create trigger profiles_recompute_social_score
  after insert or update of profile, bio, location, avatar_url, lat, lng, username, banned
  on public.profiles
  for each row execute function public.trg_profiles_recompute_social_score();

-- ── Feed vibe cards ─────────────────────────────────────────────────────────
create or replace function public.feed_vibe_cards(p_limit int default 12)
returns table (
  card_type text,
  user_id uuid,
  username text,
  display_name text,
  avatar_url text,
  age int,
  sex text,
  location text,
  distance_miles double precision,
  shared_interests text[],
  looking_for text[],
  meetup_intents text[],
  headline text,
  why text,
  created_at timestamptz,
  score real
)
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles%rowtype;
  me_interests text[];
  me_looking text[];
  me_meetup text[];
  me_radius int;
  lim int;
begin
  if auth.uid() is null then
    raise exception 'not authenticated';
  end if;

  lim := greatest(1, least(coalesce(p_limit, 12), 40));
  select * into me from public.profiles where id = auth.uid();
  if not found then
    return;
  end if;

  me_interests := public.profile_jsonb_text_array(me.profile, 'interests');
  me_looking := public.profile_jsonb_text_array(me.profile, 'lookingFor');
  me_meetup := public.profile_jsonb_text_array(me.profile, 'meetupIntents');
  me_radius := coalesce(nullif(me.profile->>'matchRadiusMiles', '')::int, 100);

  return query
  with candidates as (
    select
      p.*,
      ss.matchable as ss_matchable,
      ss.confidence as ss_conf,
      public.profile_jsonb_text_array(p.profile, 'interests') as interests,
      public.profile_jsonb_text_array(p.profile, 'lookingFor') as looking,
      public.profile_jsonb_text_array(p.profile, 'meetupIntents') as meetup,
      public.haversine_miles(me.lat, me.lng, p.lat, p.lng) as dist_mi
    from public.profiles p
    left join public.social_scores ss on ss.user_id = p.id
    where p.id <> me.id
      and coalesce(p.banned, false) = false
      and public.profile_is_matchable(p)
  ),
  scored as (
    select
      c.*,
      -- shared interests (case-insensitive)
      coalesce((
        select array_agg(distinct i order by i)
        from unnest(c.interests) i
        where lower(i) in (select lower(x) from unnest(me_interests) x)
      ), '{}'::text[]) as shared_int,
      coalesce((
        select array_agg(distinct i order by i)
        from unnest(c.meetup) i
        where lower(i) in (select lower(x) from unnest(me_meetup) x)
           or lower(i) in (select lower(x) from unnest(me_looking) x)
      ), '{}'::text[]) as shared_meetup,
      (
        case when c.created_at > now() - interval '14 days' then 0.35 else 0 end
        + case when exists (
            select 1 from unnest(c.interests) i
            where lower(i) in (select lower(x) from unnest(me_interests) x)
          ) then 0.4 else 0 end
        + case when c.dist_mi is not null and c.dist_mi <= me_radius then 0.35
               when c.dist_mi is null
                 and nullif(btrim(coalesce(me.location, '')), '') is not null
                 and lower(btrim(coalesce(c.location, ''))) = lower(btrim(me.location))
               then 0.25
               when c.dist_mi is null
                 and nullif(btrim(coalesce(me.location, '')), '') is not null
                 and position(lower(split_part(btrim(me.location), ',', 1)) in lower(coalesce(c.location, ''))) > 0
               then 0.15
               else 0 end
        + case when exists (
            select 1 from unnest(c.meetup || c.looking) i
            where lower(i) in (select lower(x) from unnest(me_meetup || me_looking) x)
          ) then 0.25 else 0 end
        + coalesce(c.ss_conf, 0) * 0.1
        -- Fairness: newer accounts get a soft lift (not pay-to-win).
        + case when c.created_at > now() - interval '3 days' then 0.12 else 0 end
      )::real as fit
    from candidates c
  ),
  picked as (
    select
      s.*,
      case
        when s.created_at > now() - interval '14 days'
          and cardinality(s.shared_int) > 0
          then 'new_user_vibe'
        when cardinality(s.shared_meetup) > 0
          or (
            cardinality(s.meetup) > 0
            and (
              (s.dist_mi is not null and s.dist_mi <= me_radius)
              or (
                nullif(btrim(coalesce(me.location, '')), '') is not null
                and position(lower(split_part(btrim(me.location), ',', 1)) in lower(coalesce(s.location, ''))) > 0
              )
            )
          )
          then 'nearby_intent'
        when cardinality(s.shared_int) > 0 then 'new_user_vibe'
        else null
      end as ctype
    from scored s
    where s.fit > 0.2
  )
  select
    pk.ctype,
    pk.id,
    pk.username,
    pk.display_name,
    pk.avatar_url,
    case
      when coalesce((pk.profile->>'shareAge')::boolean, false)
        and nullif(pk.profile->>'birthYear', '')::int between 1920 and 2012
      then extract(year from age(make_date((pk.profile->>'birthYear')::int, 6, 15)))::int
      else null
    end as age,
    case
      when coalesce((pk.profile->>'shareSex')::boolean, false)
      then nullif(btrim(pk.profile->>'sex'), '')
      else null
    end as sex,
    case
      when coalesce((pk.profile->>'shareLocation')::boolean, true)
      then nullif(btrim(coalesce(pk.location, '')), '')
      else null
    end as location,
    pk.dist_mi,
    pk.shared_int,
    pk.looking,
    pk.meetup,
    case
      when pk.ctype = 'new_user_vibe' then
        case
          when cardinality(pk.shared_int) > 0 then
            format(
              'A new user has joined VYBZ — they''re into %s too.',
              lower(array_to_string(pk.shared_int[1:2], ' & '))
            )
          else 'A new user has joined VYBZ — say hello.'
        end
      when pk.ctype = 'nearby_intent' then
        case
          when cardinality(pk.shared_meetup) > 0 then
            format('Looking for a %s near you.', lower(pk.shared_meetup[1]))
          when cardinality(pk.meetup) > 0 then
            format('Looking for a %s near you.', lower(pk.meetup[1]))
          else 'Someone nearby shares your vibe.'
        end
      else 'Someone who might fit your vibes.'
    end as headline,
    trim(both ' · ' from concat_ws(
      ' · ',
      case when cardinality(pk.shared_int) > 0
        then 'Shared: ' || array_to_string(pk.shared_int[1:3], ', ') end,
      case when pk.dist_mi is not null
        then round(pk.dist_mi)::text || ' mi away' end,
      case when pk.dist_mi is null
        and nullif(btrim(coalesce(pk.location, '')), '') is not null
        and coalesce((pk.profile->>'shareLocation')::boolean, true)
        then pk.location end
    )) as why,
    pk.created_at,
    pk.fit
  from picked pk
  where pk.ctype is not null
  order by
    case pk.ctype when 'nearby_intent' then 0 else 1 end,
    pk.fit desc,
    pk.created_at desc
  limit lim;
end;
$$;
grant execute on function public.feed_vibe_cards(int) to authenticated;

-- Backfill scores for existing matchable profiles (batch-safe).
do $$
declare
  r record;
begin
  for r in
    select id from public.profiles
    where coalesce(banned, false) = false
    limit 500
  loop
    perform public.recompute_social_score(r.id);
  end loop;
end $$;
