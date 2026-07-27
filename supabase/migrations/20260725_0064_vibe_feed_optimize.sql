-- Phase 1 smoke follow-up: faster vibe cards + exclude accepted connections +
-- better cold-start when the viewer has thin interest signal.

create index if not exists social_scores_matchable_idx
  on public.social_scores (user_id)
  where matchable;

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
  me_thin := cardinality(me_interests) = 0
    and cardinality(me_looking) = 0
    and cardinality(me_meetup) = 0;

  return query
  with connected as (
    select case
      when c.requester_id = me.id then c.addressee_id
      else c.requester_id
    end as other_id
    from public.connections c
    where c.status = 'accepted'
      and (c.requester_id = me.id or c.addressee_id = me.id)
  ),
  candidates as (
    select *
    from (
      select
        p.id,
        p.username,
        p.display_name,
        p.avatar_url,
        p.location,
        p.profile,
        p.created_at,
        p.lat,
        p.lng,
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
        and not exists (select 1 from connected x where x.other_id = p.id)
      order by coalesce(ss.confidence, 0) desc, p.created_at desc
      limit 200
    ) capped
  ),
  scored as (
    select
      c.*,
      coalesce((
        select array_agg(i order by i)
        from (
          select distinct i
          from unnest(c.interests) i
          where lower(i) in (select lower(x) from unnest(me_interests) x)
        ) s(i)
      ), '{}'::text[]) as shared_int,
      coalesce((
        select array_agg(i order by i)
        from (
          select distinct i
          from unnest(c.meetup) i
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
        + c.ss_conf * 0.1
        + case when c.created_at > now() - interval '3 days' then 0.12 else 0 end
        -- Cold-start: thin viewers still see fresh matchable people nearby / worldwide
        + case when me_thin and c.created_at > now() - interval '21 days' then 0.2 else 0 end
        + case when me_thin and c.dist_mi is not null and c.dist_mi <= me_radius then 0.25 else 0 end
      )::real as fit
    from candidates c
  ),
  picked as (
    select
      s.*,
      case
        when s.created_at > now() - interval '14 days'
          and (cardinality(s.shared_int) > 0 or me_thin)
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
        when me_thin and s.fit >= 0.25 then 'new_user_vibe'
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
          when cardinality(pk.interests) > 0 then
            format(
              'A new user has joined VYBZ — into %s.',
              lower(array_to_string(pk.interests[1:2], ' & '))
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
        then 'Shared: ' || array_to_string(pk.shared_int[1:3], ', ')
           when cardinality(pk.interests) > 0 and me_thin
        then 'Into: ' || array_to_string(pk.interests[1:3], ', ')
      end,
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
