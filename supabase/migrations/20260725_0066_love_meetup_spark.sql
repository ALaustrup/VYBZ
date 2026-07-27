-- Phase 3 — Love & Meetup Spark deck: likes, mutual matches, vibe_matches RPC,
-- 18+ romantic gate, age/distance prefs, report reasons, privacy + block patches.

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.profile_age_years(p jsonb)
returns int
language sql immutable parallel safe as $$
  select case
    when nullif(btrim(coalesce(p->>'birthYear', '')), '') is null then null
    when (p->>'birthYear')::int < 1920 or (p->>'birthYear')::int > extract(year from now())::int then null
    else extract(year from age(current_date, make_date((p->>'birthYear')::int, 6, 15)))::int
  end;
$$;

create or replace function public.profile_is_adult(p jsonb)
returns boolean
language sql immutable parallel safe as $$
  select coalesce(public.profile_age_years(p) >= 18, false);
$$;

create or replace function public.profile_has_romantic_intent(p jsonb)
returns boolean
language sql immutable parallel safe as $$
  select exists (
    select 1
    from unnest(public.profile_jsonb_text_array(p, 'lookingFor')) x
    where x in ('Dating', 'Something casual')
  );
$$;

create or replace function public.profile_hidden_keys(p jsonb)
returns text[]
language sql immutable parallel safe as $$
  select coalesce(
    (
      select array_agg(distinct k)
      from (
        select jsonb_array_elements_text(coalesce(p->'hidden', '[]'::jsonb)) as k
        union
        select jsonb_array_elements_text(coalesce(p->'_hidden', '[]'::jsonb)) as k
      ) s
    ),
    '{}'::text[]
  );
$$;

-- Gate romantic looking-for to 18+ on profile save
create or replace function public.profiles_enforce_adult_romantic()
returns trigger
language plpgsql set search_path = public as $$
declare age int;
begin
  if public.profile_has_romantic_intent(new.profile) then
    age := public.profile_age_years(new.profile);
    if age is null or age < 18 then
      raise exception 'Romantic intents require a verified adult age (18+). Set birth year first.';
    end if;
  end if;
  return new;
end;
$$;

drop trigger if exists profiles_adult_romantic_trg on public.profiles;
create trigger profiles_adult_romantic_trg
  before insert or update of profile on public.profiles
  for each row execute function public.profiles_enforce_adult_romantic();

-- ── Spark likes / mutual ─────────────────────────────────────────────────────
create table if not exists public.spark_likes (
  actor_id uuid not null references public.profiles(id) on delete cascade,
  target_id uuid not null references public.profiles(id) on delete cascade,
  deck text not null check (deck in ('love', 'meetup')),
  outcome text not null check (outcome in ('like', 'pass')),
  created_at timestamptz not null default now(),
  primary key (actor_id, target_id, deck),
  check (actor_id <> target_id)
);
create index if not exists spark_likes_target_idx on public.spark_likes (target_id, deck, outcome);
alter table public.spark_likes enable row level security;
drop policy if exists spark_likes_own on public.spark_likes;
create policy spark_likes_own on public.spark_likes for all
  using (actor_id = auth.uid()) with check (actor_id = auth.uid());
grant select, insert, update, delete on public.spark_likes to authenticated;

create or replace function public.spark_act(
  p_target uuid,
  p_outcome text,
  p_deck text default 'love'
)
returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  mutual boolean := false;
  peer_uname text;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  if p_target is null or p_target = uid then raise exception 'bad target'; end if;
  if p_outcome not in ('like', 'pass') then raise exception 'bad outcome'; end if;
  if p_deck not in ('love', 'meetup') then raise exception 'bad deck'; end if;
  if public.is_blocked_either(uid, p_target) then
    return jsonb_build_object('ok', false, 'mutual', false, 'error', 'blocked');
  end if;

  insert into public.spark_likes (actor_id, target_id, deck, outcome)
  values (uid, p_target, p_deck, p_outcome)
  on conflict (actor_id, target_id, deck) do update
    set outcome = excluded.outcome, created_at = now();

  if p_outcome = 'like' then
    select exists (
      select 1 from public.spark_likes
      where actor_id = p_target and target_id = uid and deck = p_deck and outcome = 'like'
    ) into mutual;

    if mutual then
      select username into peer_uname from public.profiles where id = p_target;
      insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
      values (
        uid, 'match', p_target,
        'It''s a match with ' || coalesce(peer_uname, 'someone') || '!',
        'Message, voice, or cam — free forever.',
        p_target,
        jsonb_build_object('action', 'open_profile', 'deck', p_deck, 'mutual', true)
      );
      insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
      values (
        p_target, 'match', uid,
        'It''s a match with ' || coalesce(public.uname(uid), 'someone') || '!',
        'Message, voice, or cam — free forever.',
        uid,
        jsonb_build_object('action', 'open_profile', 'deck', p_deck, 'mutual', true)
      );
    end if;
  end if;

  return jsonb_build_object(
    'ok', true,
    'mutual', mutual,
    'peerId', p_target,
    'peerUsername', peer_uname,
    'deck', p_deck
  );
end;
$$;
grant execute on function public.spark_act(uuid, text, text) to authenticated;

-- ── vibe_matches deck ────────────────────────────────────────────────────────
create or replace function public.vibe_matches(
  p_deck text default 'love',
  p_limit int default 40,
  p_radius_miles int default null,
  p_age_min int default null,
  p_age_max int default null,
  p_looking text[] default null,
  p_meetup text[] default null,
  p_must_share_meetup boolean default false
)
returns table (
  user_id uuid,
  username text,
  fit real,
  confidence real,
  distance_miles real,
  age int,
  sex text,
  location text,
  looking_for text[],
  meetup_intents text[],
  shared_interests text[],
  shared_looking text[],
  shared_meetup text[],
  why text,
  mutual_like boolean
)
language plpgsql stable security definer set search_path = public as $$
declare
  me public.profiles%rowtype;
  me_radius int;
  me_age int;
  me_romantic boolean;
  lim int := greatest(1, least(coalesce(p_limit, 40), 80));
begin
  if auth.uid() is null then return; end if;
  if p_deck not in ('love', 'meetup') then return; end if;

  select * into me from public.profiles where id = auth.uid();
  if not found then return; end if;

  me_radius := coalesce(p_radius_miles, nullif(me.profile->>'matchRadiusMiles', '')::int, 100);
  me_age := public.profile_age_years(me.profile);
  me_romantic := public.profile_has_romantic_intent(me.profile)
    or (p_deck = 'love' and coalesce(p_looking, '{}') && array['Dating', 'Something casual']::text[]);

  if me_romantic and not public.profile_is_adult(me.profile) then
    return; -- adult gate: no romantic deck without 18+
  end if;

  return query
  with cand as (
    select
      p.id as cid,
      p.username as cuname,
      p.location as cloc,
      p.lat, p.lng,
      p.profile as cprof,
      public.profile_age_years(p.profile) as cage,
      public.haversine_miles(me.lat, me.lng, p.lat, p.lng) as dist,
      public.profile_jsonb_text_array(p.profile, 'interests') as c_int,
      public.profile_jsonb_text_array(p.profile, 'lookingFor') as c_look,
      public.profile_jsonb_text_array(p.profile, 'meetupIntents') as c_meet,
      public.profile_jsonb_text_array(me.profile, 'interests') as m_int,
      public.profile_jsonb_text_array(me.profile, 'lookingFor') as m_look,
      public.profile_jsonb_text_array(me.profile, 'meetupIntents') as m_meet,
      coalesce(ss.confidence, 0.2)::real as conf,
      exists (
        select 1 from public.spark_likes sl
        where sl.actor_id = p.id and sl.target_id = me.id and sl.deck = p_deck and sl.outcome = 'like'
      ) as they_liked
    from public.profiles p
    left join public.social_scores ss on ss.user_id = p.id
    where p.id <> me.id
      and coalesce(p.banned, false) = false
      and public.profile_is_matchable(p)
      and not public.is_blocked_either(me.id, p.id)
      and not exists (
        select 1 from public.spark_likes sl
        where sl.actor_id = me.id and sl.target_id = p.id and sl.deck = p_deck
      )
  ),
  filtered as (
    select c.*
    from cand c
    where
      -- romantic 18+ hard gate either side
      (
        not (
          public.profile_has_romantic_intent(c.cprof)
          or (p_deck = 'love' and c.c_look && array['Dating', 'Something casual']::text[])
          or me_romantic
        )
        or (public.profile_is_adult(c.cprof) and public.profile_is_adult(me.profile))
      )
      -- distance hard when both geo known
      and (
        c.dist is null
        or me.lat is null or me.lng is null
        or c.dist <= me_radius
      )
      -- age prefs (viewer prefs override; also respect candidate prefAge* when set)
      and (
        c.cage is null
        or (
          (p_age_min is null or c.cage >= p_age_min)
          and (p_age_max is null or c.cage <= p_age_max)
          and (
            nullif(c.cprof->>'prefAgeMin', '') is null
            or me_age is null
            or me_age >= (c.cprof->>'prefAgeMin')::int
          )
          and (
            nullif(c.cprof->>'prefAgeMax', '') is null
            or me_age is null
            or me_age <= (c.cprof->>'prefAgeMax')::int
          )
        )
      )
      -- looking-for filter (Love)
      and (
        p_deck <> 'love'
        or p_looking is null
        or cardinality(p_looking) = 0
        or c.c_look && p_looking
        or c.c_look && c.m_look
      )
      -- meetup filter
      and (
        p_deck <> 'meetup'
        or (
          (not p_must_share_meetup and (
            cardinality(c.c_meet) > 0
            or c.c_look && array['Activity partner', 'Friendship']::text[]
          ))
          or (p_meetup is not null and cardinality(p_meetup) > 0 and c.c_meet && p_meetup)
          or (c.c_meet && c.m_meet)
        )
      )
  ),
  scored as (
    select
      f.*,
      coalesce((
        select array_agg(distinct x order by x)
        from unnest(f.c_int) x where x = any(f.m_int)
      ), '{}'::text[]) as sh_int,
      coalesce((
        select array_agg(distinct x order by x)
        from unnest(f.c_look) x where x = any(f.m_look)
      ), '{}'::text[]) as sh_look,
      coalesce((
        select array_agg(distinct x order by x)
        from unnest(f.c_meet) x where x = any(f.m_meet)
      ), '{}'::text[]) as sh_meet
    from filtered f
  )
  select
    s.cid,
    s.cuname,
    least(1.0, greatest(0.05,
      (cardinality(s.sh_int)::real * 0.12)
      + (cardinality(s.sh_look)::real * 0.22)
      + (cardinality(s.sh_meet)::real * 0.28)
      + (case when s.they_liked then 0.2 else 0 end)
      + (case when s.dist is not null then greatest(0, 0.2 - (s.dist / greatest(me_radius, 1)) * 0.2) else 0.05 end)
      + (s.conf * 0.15)
    ))::real as fit,
    s.conf,
    s.dist::real,
    case when coalesce((s.cprof->>'shareAge')::boolean, false) then s.cage else null end,
    case when coalesce((s.cprof->>'shareSex')::boolean, false) then nullif(s.cprof->>'sex', '') else null end,
    case when coalesce((s.cprof->>'shareLocation')::boolean, true) then s.cloc else null end,
    -- strip romantic looking-for from payload if candidate hid lookingFor
    case when 'lookingFor' = any(public.profile_hidden_keys(s.cprof))
      then '{}'::text[]
      else s.c_look end,
    case when 'meetupIntents' = any(public.profile_hidden_keys(s.cprof))
      then '{}'::text[]
      else s.c_meet end,
    s.sh_int,
    s.sh_look,
    s.sh_meet,
    case
      when cardinality(s.sh_meet) > 0 then
        'Shared meetup: ' || array_to_string(s.sh_meet[1:2], ' · ')
      when cardinality(s.sh_look) > 0 then
        'Both looking for ' || array_to_string(s.sh_look[1:2], ' · ')
      when cardinality(s.sh_int) > 0 then
        'Shared vibes: ' || array_to_string(s.sh_int[1:2], ' · ')
      when s.dist is not null then
        round(s.dist::numeric, 0)::text || ' mi away'
      else 'New connection nearby'
    end,
    s.they_liked
  from scored s
  order by fit desc, they_liked desc nulls last, dist nulls last
  limit lim;
end;
$$;
grant execute on function public.vibe_matches(text, int, int, int, int, text[], text[], boolean) to authenticated;

-- ── Report reasons: catfish / underage ───────────────────────────────────────
alter table public.content_reports drop constraint if exists content_reports_reason_check;
alter table public.content_reports add constraint content_reports_reason_check
  check (reason in (
    'spam','harassment','hate','nsfw','illegal','impersonation','misinformation',
    'catfish','underage','other'
  ));

create or replace function public.report_content(p_kind text, p_id uuid, p_reason text, p_detail text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); v uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_kind not in ('post','drop','user','message') then raise exception 'bad target'; end if;
  if p_reason not in (
    'spam','harassment','hate','nsfw','illegal','impersonation','misinformation',
    'catfish','underage','other'
  ) then raise exception 'bad reason'; end if;
  insert into public.content_reports(reporter_id, target_kind, target_id, reason, detail)
  values (uid, p_kind, p_id, p_reason, nullif(btrim(coalesce(p_detail,'')),''))
  on conflict (reporter_id, target_kind, target_id)
    do update set reason = excluded.reason, detail = excluded.detail, status = 'open', created_at = now()
  returning id into v;
  return v;
end $fn$;
grant execute on function public.report_content(text, uuid, text, text) to authenticated;

-- ── public_profile: honor hidden + strip private romantic prefs ──────────────
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table(
  id uuid, username text, display_name text, avatar_url text, bio text,
  location text, music_url text, profile jsonb, equipped_cosmetics jsonb, created_at timestamptz
)
language sql stable security definer set search_path to 'public' as $function$
  select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.location, p.music_url,
    (
      select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
      from jsonb_each(coalesce(p.profile, '{}'::jsonb)) as e(k, v)
      where k not in ('hidden', '_hidden', 'prefAgeMin', 'prefAgeMax', 'birthYear', 'matchRadiusMiles')
        and not (k = any(public.profile_hidden_keys(p.profile)))
        -- never leak romantic looking-for labels into create storefronts if hidden
        and not (k = 'lookingFor' and 'lookingFor' = any(public.profile_hidden_keys(p.profile)))
    ) as profile,
    coalesce(p.equipped_cosmetics, '{}'::jsonb) as equipped_cosmetics,
    p.created_at
  from public.profiles p
  where p.id = p_id and coalesce(p.banned, false) = false;
$function$;
grant execute on function public.public_profile(uuid) to authenticated;
grant execute on function public.public_profile(uuid) to anon;

-- ── feed_vibe_cards: exclude blocked users (same table signature as 0064) ────
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
  me_thin boolean;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  lim := greatest(1, least(coalesce(p_limit, 12), 40));
  select * into me from public.profiles where id = auth.uid();
  if not found then return; end if;

  me_interests := public.profile_jsonb_text_array(me.profile, 'interests');
  me_looking := public.profile_jsonb_text_array(me.profile, 'lookingFor');
  me_meetup := public.profile_jsonb_text_array(me.profile, 'meetupIntents');
  me_radius := coalesce(nullif(me.profile->>'matchRadiusMiles', '')::int, 100);
  me_thin := cardinality(me_interests) = 0
    and cardinality(me_looking) = 0
    and cardinality(me_meetup) = 0;

  return query
  with connected as (
    select case when c.requester_id = me.id then c.addressee_id else c.requester_id end as other_id
    from public.connections c
    where c.status = 'accepted' and (c.requester_id = me.id or c.addressee_id = me.id)
  ),
  candidates as (
    select * from (
      select
        p.id, p.username, p.display_name, p.avatar_url, p.location, p.profile, p.created_at, p.lat, p.lng,
        coalesce(ss.confidence, 0::real) as ss_conf,
        public.profile_jsonb_text_array(p.profile, 'interests') as interests,
        public.profile_jsonb_text_array(p.profile, 'lookingFor') as looking,
        public.profile_jsonb_text_array(p.profile, 'meetupIntents') as meetup,
        public.haversine_miles(me.lat, me.lng, p.lat, p.lng) as dist_mi
      from public.profiles p
      left join public.social_scores ss on ss.user_id = p.id
      where p.id <> me.id
        and coalesce(p.banned, false) = false
        and public.profile_is_matchable(p)
        and not public.is_blocked_either(me.id, p.id)
        and not exists (select 1 from connected x where x.other_id = p.id)
      order by coalesce(ss.confidence, 0) desc, p.created_at desc
      limit 200
    ) capped
  ),
  scored as (
    select c.*,
      coalesce((
        select array_agg(i order by i) from (
          select distinct i from unnest(c.interests) i
          where lower(i) in (select lower(x) from unnest(me_interests) x)
        ) s(i)
      ), '{}'::text[]) as shared_int,
      coalesce((
        select array_agg(i order by i) from (
          select distinct i from unnest(c.meetup) i
          where lower(i) in (select lower(x) from unnest(me_meetup) x)
             or lower(i) in (select lower(x) from unnest(me_looking) x)
        ) s(i)
      ), '{}'::text[]) as shared_meetup,
      (
        case when c.created_at > now() - interval '14 days' then 0.35 else 0 end
        + case when exists (
            select 1 from unnest(c.interests) i
            where lower(i) in (select lower(x) from unnest(me_interests) x)
          ) then 0.4 else 0 end
        + case when c.dist_mi is not null and c.dist_mi <= me_radius then 0.35 else 0 end
        + case when exists (
            select 1 from unnest(c.meetup || c.looking) i
            where lower(i) in (select lower(x) from unnest(me_meetup || me_looking) x)
          ) then 0.25 else 0 end
        + c.ss_conf * 0.1
        + case when me_thin and c.created_at > now() - interval '21 days' then 0.2 else 0 end
        + case when me_thin and c.dist_mi is not null and c.dist_mi <= me_radius then 0.25 else 0 end
      )::real as fit
    from candidates c
  ),
  picked as (
    select s.*,
      case
        when s.created_at > now() - interval '14 days' and (cardinality(s.shared_int) > 0 or me_thin)
          then 'new_user_vibe'
        when cardinality(s.shared_meetup) > 0
          or (cardinality(s.meetup) > 0 and s.dist_mi is not null and s.dist_mi <= me_radius)
          then 'nearby_intent'
        when cardinality(s.shared_int) > 0 then 'new_user_vibe'
        when me_thin and s.fit >= 0.25 then 'new_user_vibe'
        else null
      end as ctype
    from scored s
    where s.fit > 0.2
  )
  select
    pk.ctype, pk.id, pk.username, pk.display_name, pk.avatar_url,
    case when coalesce((pk.profile->>'shareAge')::boolean, false)
      then public.profile_age_years(pk.profile) else null end,
    case when coalesce((pk.profile->>'shareSex')::boolean, false)
      then nullif(btrim(pk.profile->>'sex'), '') else null end,
    case when coalesce((pk.profile->>'shareLocation')::boolean, true)
      then nullif(btrim(coalesce(pk.location, '')), '') else null end,
    pk.dist_mi, pk.shared_int, pk.looking, pk.meetup,
    case
      when pk.ctype = 'nearby_intent' and cardinality(pk.shared_meetup) > 0 then
        format('Looking for a %s near you.', lower(pk.shared_meetup[1]))
      when pk.ctype = 'nearby_intent' and cardinality(pk.meetup) > 0 then
        format('Looking for a %s near you.', lower(pk.meetup[1]))
      when cardinality(pk.shared_int) > 0 then
        format('A new user has joined VYBZ — they''re into %s too.', lower(array_to_string(pk.shared_int[1:2], ' & ')))
      else 'Someone who might fit your vibes.'
    end,
    trim(both ' · ' from concat_ws(' · ',
      case when cardinality(pk.shared_int) > 0 then 'Shared: ' || array_to_string(pk.shared_int[1:3], ', ') end,
      case when pk.dist_mi is not null then round(pk.dist_mi)::text || ' mi away' end
    )),
    pk.created_at, pk.fit
  from picked pk
  where pk.ctype is not null
  order by case pk.ctype when 'nearby_intent' then 0 else 1 end, pk.fit desc, pk.created_at desc
  limit lim;
end;
$$;
grant execute on function public.feed_vibe_cards(int) to authenticated;
