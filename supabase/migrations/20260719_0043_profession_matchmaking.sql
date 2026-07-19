-- ===========================================================================
-- VYBZ — Profession-aware matchmaking (Phase C1 / §12.19)
--
-- collab_matches v8:
--   • scores primary/secondary profession overlap via mm_w('profession', …)
--   • emits shared_professions (ids) for explainability
--   • p_category softens to profession OR module category (no empty decks)
-- search_creators: optional p_profession filter
-- match_signal_vector: profession signal for learning-to-rank
-- ===========================================================================

set search_path = public, extensions;

-- ── Helper: profession id set from a profile jsonb ───────────────────────────
create or replace function public.profile_profession_ids(p jsonb)
returns text[] language sql immutable as $fn$
  select coalesce(array_agg(distinct v), '{}'::text[])
  from (
    select nullif(p->>'profession', '') as v
    union all
    select jsonb_array_elements_text(coalesce(p->'professions', '[]'::jsonb))
  ) t
  where v is not null and v <> '';
$fn$;

-- ── Learning vector: include profession overlap ──────────────────────────────
create or replace function public.match_signal_vector(p_me uuid, p_peer uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  with me as (
    select coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max,
           public.profile_profession_ids(profile) as professions
    from public.profiles where id = p_me
  ),
  my_offers  as (select role_id from public.creator_roles where user_id = p_me),
  my_seeks   as (select role_id from public.creator_seeks where user_id = p_me),
  my_disc    as (select role_id from public.profile_modules where user_id = p_me and archived_at is null),
  my_proj    as (select id from public.profile_projects where user_id = p_me and archived_at is null),
  my_follows as (select project_id from public.project_follows where user_id = p_me),
  me_vec     as (select embedding from public.profile_embeddings where user_id = p_me),
  me_attrs   as (
    select distinct e.v as v from public.profile_modules m,
      lateral jsonb_each(m.attrs) kv,
      lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value)='array' then kv.value else '[]'::jsonb end) as e(v)
    where m.user_id = p_me and m.archived_at is null
  ),
  me_intents as (
    select distinct s as v from public.profile_modules m, lateral unnest(m.seeking) s
    where m.user_id = p_me and m.archived_at is null
  ),
  p  as (select profile from public.profiles where id = p_peer),
  pe as (select embedding from public.profile_embeddings where user_id = p_peer),
  v as (
    select
      (select count(*) from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id where cr.user_id = p_peer)::int as offers_n,
      (select count(*) from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id where cs.user_id = p_peer)::int as seeks_n,
      (select count(*) from public.profile_modules pm where pm.user_id = p_peer and pm.archived_at is null and pm.role_id in (select role_id from my_disc))::int as disc_n,
      public.jsonb_overlap_count((select profile from p)->'genres',   (select genres   from me)) as genre_n,
      public.jsonb_overlap_count((select profile from p)->'daws',     (select daws     from me)) as daw_n,
      public.jsonb_overlap_count((select profile from p)->'plugins',  (select plugins  from me)) as plugin_n,
      public.jsonb_overlap_count((select profile from p)->'languages',(select languages from me)) as lang_n,
      (select count(*) from (
         select distinct e2.v from public.profile_modules m2,
           lateral jsonb_each(m2.attrs) kv2,
           lateral jsonb_array_elements_text(case when jsonb_typeof(kv2.value)='array' then kv2.value else '[]'::jsonb end) as e2(v)
         where m2.user_id = p_peer and m2.archived_at is null
       ) cv where cv.v in (select v from me_attrs))::int as attr_n,
      (select count(*) from (
         select distinct s2 from public.profile_modules m3, lateral unnest(m3.seeking) s2
         where m3.user_id = p_peer and m3.archived_at is null
       ) ci where ci.s2 in (select v from me_intents))::int as intent_n,
      (select count(*) from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
         where pr.user_id = p_peer and pr.archived_at is null and f.user_id = p_me)::int as i_follow_them,
      (select count(*) from public.project_follows f where f.user_id = p_peer and f.project_id in (select id from my_proj))::int as they_follow_me,
      (select count(*) from public.project_follows f where f.user_id = p_peer and f.project_id in (select project_id from my_follows))::int as shared_follows,
      least(6.0, coalesce((
        select sum(ra.weight) from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where cu.user_id = p_peer and ra.from_role in (select role_id from my_offers)
      ), 0))::numeric as affinity,
      coalesce((select avg(cr.skill) from public.creator_roles cr
        join my_seeks s on s.role_id = cr.role_id where cr.user_id = p_peer), 0)::numeric as skill_on_seek,
      (case when (select tempo_min from me) is not null and (select tempo_max from me) is not null
         and nullif((select profile from p)->>'tempoMin','')::numeric is not null
         and nullif((select profile from p)->>'tempoMax','')::numeric is not null
         and (select tempo_min from me) <= nullif((select profile from p)->>'tempoMax','')::numeric
         and (select tempo_max from me) >= nullif((select profile from p)->>'tempoMin','')::numeric
        then true else false end) as tempo_fit,
      (case when exists (select 1 from me_vec) and (select embedding from pe) is not null
        then greatest(0, 1 - ((select embedding from pe) <=> (select embedding from me_vec))) else 0 end)::numeric as sim,
      public.creator_reputation(p_peer) as reputation,
      coalesce(((select profile from p)->>'openToWork')::boolean, false) as open_to_work,
      (select count(*) from (
         select unnest((select professions from me))
         intersect
         select unnest(public.profile_profession_ids((select profile from p)))
       ) x)::int as profession_n
  )
  select jsonb_build_object(
    'offers',            round(least(1.0, offers_n / 2.0), 4),
    'seeks',             round(least(1.0, seeks_n / 2.0), 4),
    'mutual',            case when offers_n > 0 and seeks_n > 0 then 1 else 0 end,
    'shared_discipline', round(least(1.0, disc_n / 2.0), 4),
    'attr',              round(least(1.0, attr_n / 6.0), 4),
    'intent',            round(least(1.0, intent_n / 4.0), 4),
    'follow_their',      round(least(1.0, i_follow_them / 2.0), 4),
    'follow_mine',       round(least(1.0, they_follow_me / 2.0), 4),
    'shared_follow',     round(least(1.0, shared_follows / 6.0), 4),
    'affinity',          round(least(1.0, affinity / 6.0), 4),
    'skill',             round(least(1.0, skill_on_seek / 5.0), 4),
    'genre',             round(least(1.0, genre_n / 3.0), 4),
    'daw',               round(least(1.0, daw_n / 2.0), 4),
    'plugin',            round(least(1.0, plugin_n / 5.0), 4),
    'lang',              round(least(1.0, lang_n / 2.0), 4),
    'tempo',             case when tempo_fit then 1 else 0 end,
    'resonance',         round(sim, 4),
    'reputation',        round(reputation, 4),
    'open',              case when open_to_work then 1 else 0 end,
    'profession',        round(least(1.0, profession_n / 2.0), 4)
  ) from v;
$fn$;

-- ── collab_matches v8 ────────────────────────────────────────────────────────
drop function if exists public.collab_matches(int, text);
create or replace function public.collab_matches(p_limit int default 20, p_category text default null)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[], confidence numeric, role_class text,
  shared_professions text[]
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max,
           coalesce(nullif(profile->>'roleClass',''),'creator') as role_class,
           public.profile_profession_ids(profile) as professions
    from public.profiles where id = auth.uid()
  ),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  my_disc   as (select role_id from public.profile_modules where user_id = auth.uid() and archived_at is null),
  my_proj   as (select id from public.profile_projects where user_id = auth.uid() and archived_at is null),
  my_follows as (select project_id from public.project_follows where user_id = auth.uid()),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  me_attrs  as (
    select distinct e.v as v from public.profile_modules m,
      lateral jsonb_each(m.attrs) kv,
      lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value)='array' then kv.value else '[]'::jsonb end) as e(v)
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  me_intents as (
    select distinct s as v from public.profile_modules m, lateral unnest(m.seeking) s
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  cand as (
    select distinct user_id from (
      select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
      union
      select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
      union
      select cu.user_id from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where ra.from_role in (select role_id from my_offers)
      union
      select pm.user_id from public.profile_modules pm
        where pm.archived_at is null and pm.role_id in (select role_id from my_disc)
      union
      select pr.user_id from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
        where f.user_id = auth.uid() and pr.archived_at is null
      union
      select f.user_id from public.project_follows f where f.project_id in (select id from my_proj)
      union
      select sem.user_id from (
        select e.user_id from public.profile_embeddings e
        where exists (select 1 from me_vec) and e.user_id <> auth.uid()
        order by e.embedding <=> (select embedding from me_vec) limit 200
      ) sem
      union
      -- Same-profession peers (so craft-only profiles still enter the deck)
      select p2.id as user_id from public.profiles p2, me
      where p2.id <> auth.uid() and coalesce(p2.banned,false) = false
        and cardinality(me.professions) > 0
        and public.profile_profession_ids(p2.profile) && me.professions
    ) u where user_id <> auth.uid()
  ),
  scored as (
    select c.user_id,
      me.role_class as caller_class,
      coalesce(nullif(p.profile->>'roleClass',''),'creator') as cand_class,
      array(select r.label from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
            join public.roles r on r.id = cr.role_id where cr.user_id = c.user_id order by r.family, r.sort) as offers_you_seek,
      array(select r.label from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
            join public.roles r on r.id = cs.role_id where cs.user_id = c.user_id order by r.family, r.sort) as seeks_you_offer,
      array(select distinct r.label from public.profile_modules pm join public.roles r on r.id = pm.role_id
            where pm.user_id = c.user_id and pm.archived_at is null and pm.role_id in (select role_id from my_disc)
            order by r.label) as shared_disciplines,
      array(
        select x from (
          select unnest(me.professions)
          intersect
          select unnest(public.profile_profession_ids(p.profile))
        ) s(x) order by x
      ) as shared_professions,
      public.jsonb_overlap_names(p.profile->'genres', me.genres) as shared_genres,
      public.jsonb_overlap_names(p.profile->'daws', me.daws) as shared_daws,
      public.jsonb_overlap_names(p.profile->'plugins', me.plugins) as shared_plugins,
      public.jsonb_overlap_count(p.profile->'languages', me.languages) as shared_langs,
      (select count(*) from (
         select distinct e2.v from public.profile_modules m2,
           lateral jsonb_each(m2.attrs) kv2,
           lateral jsonb_array_elements_text(case when jsonb_typeof(kv2.value)='array' then kv2.value else '[]'::jsonb end) as e2(v)
         where m2.user_id = c.user_id and m2.archived_at is null
       ) cv where cv.v in (select v from me_attrs))::int as shared_attr_count,
      (select count(*) from (
         select distinct s2 from public.profile_modules m3, lateral unnest(m3.seeking) s2
         where m3.user_id = c.user_id and m3.archived_at is null
       ) ci where ci.s2 in (select v from me_intents))::int as intent_align,
      (select count(*) from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
         where pr.user_id = c.user_id and pr.archived_at is null and f.user_id = auth.uid())::int as i_follow_them,
      (select count(*) from public.project_follows f where f.user_id = c.user_id and f.project_id in (select id from my_proj))::int as they_follow_me,
      (select count(*) from public.project_follows f where f.user_id = c.user_id and f.project_id in (select project_id from my_follows))::int as shared_follows,
      least(6.0, coalesce((
        select sum(ra.weight) from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where cu.user_id = c.user_id and ra.from_role in (select role_id from my_offers)
      ), 0))::numeric as affinity,
      coalesce((select avg(cr.skill) from public.creator_roles cr
        join my_seeks s on s.role_id = cr.role_id where cr.user_id = c.user_id), 0)::numeric as skill_on_seek,
      (case when me.tempo_min is not null and me.tempo_max is not null
         and nullif(p.profile->>'tempoMin','')::numeric is not null
         and nullif(p.profile->>'tempoMax','')::numeric is not null
         and me.tempo_min <= nullif(p.profile->>'tempoMax','')::numeric
         and me.tempo_max >= nullif(p.profile->>'tempoMin','')::numeric
        then true else false end) as tempo_fit,
      (case when exists (select 1 from me_vec) and pe.embedding is not null
        then greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec))) else 0 end)::numeric as sim,
      public.creator_reputation(c.user_id) as reputation,
      coalesce((p.profile->>'openToWork')::boolean, false) as open_to_work,
      public.profile_profession_ids(p.profile) as cand_professions
    from cand c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join public.profile_embeddings pe on pe.user_id = c.user_id
    where coalesce(p.banned, false) = false
  ),
  blended as (
    select s.*,
      ( coalesce(array_length(s.offers_you_seek,1),0) * public.mm_w('offers',3.0)
      + coalesce(array_length(s.seeks_you_offer,1),0) * public.mm_w('seeks',3.0)
      + case when coalesce(array_length(s.offers_you_seek,1),0) > 0 and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then public.mm_w('mutual',4.0) else 0 end
      + coalesce(array_length(s.shared_disciplines,1),0) * public.mm_w('shared_discipline',4.0)
      + least(6, s.shared_attr_count) * public.mm_w('attr',0.7)
      + least(4, s.intent_align) * public.mm_w('intent',0.5)
      + least(4, s.i_follow_them) * public.mm_w('follow_their',2.5)
      + least(4, s.they_follow_me) * public.mm_w('follow_mine',2.0)
      + least(6, s.shared_follows) * public.mm_w('shared_follow',0.6)
      + s.affinity * public.mm_w('affinity',1.5)
      + s.skill_on_seek * public.mm_w('skill',0.4)
      + coalesce(array_length(s.shared_genres,1),0) * public.mm_w('genre',1.4)
      + coalesce(array_length(s.shared_daws,1),0) * public.mm_w('daw',1.2)
      + least(5, coalesce(array_length(s.shared_plugins,1),0)) * public.mm_w('plugin',0.9)
      + s.shared_langs * public.mm_w('lang',0.5)
      + case when s.tempo_fit then public.mm_w('tempo',0.6) else 0 end
      + s.sim * public.mm_w('resonance',3.0)
      + s.reputation * public.mm_w('reputation',1.5)
      + case when s.open_to_work then public.mm_w('open',1.0) else 0 end
      + case when (s.caller_class <> 'creator' and coalesce(array_length(s.offers_you_seek,1),0) > 0)
                or (s.cand_class <> 'creator' and coalesce(array_length(s.seeks_you_offer,1),0) > 0)
             then public.mm_w('roleclass',1.0) else 0 end
      + least(2, coalesce(array_length(s.shared_professions,1),0)) * public.mm_w('profession',2.0)
      -- Soft preference when caller scopes Find to a craft vertical
      + case when p_category is not null and p_category = any (s.cand_professions)
             then public.mm_w('profession_scope',1.5) else 0 end
      ) as raw
    from scored s
  ),
  finalized as (
    select b.*,
      least(1.0, b.raw / public.mm_w('divisor',32.0)) as fit_val,
      (case when b.caller_class = 'creator' and b.cand_class <> 'creator' then 1 else 0 end) as demote,
      ( (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 or coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_disciplines,1),0) > 0 then 1 else 0 end)
      + (case when b.affinity > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_genres,1),0) > 0 or coalesce(array_length(b.shared_daws,1),0) > 0 or coalesce(array_length(b.shared_plugins,1),0) > 0 then 1 else 0 end)
      + (case when b.sim >= 0.5 then 1 else 0 end)
      + (case when b.reputation >= 0.3 then 1 else 0 end)
      + (case when b.i_follow_them > 0 or b.they_follow_me > 0 or b.shared_follows > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_professions,1),0) > 0 then 1 else 0 end)
      ) as evidence
    from blended b
  )
  select f.user_id, pr.username, pr.username,
    f.offers_you_seek, f.seeks_you_offer,
    (coalesce(array_length(f.offers_you_seek,1),0) > 0 and coalesce(array_length(f.seeks_you_offer,1),0) > 0),
    f.shared_genres, f.shared_daws, f.shared_plugins, f.open_to_work,
    round(f.sim, 3), round(f.reputation, 3), round(f.fit_val, 3),
    f.shared_disciplines,
    round(least(1.0, 0.55 * (f.evidence / 9.0) + 0.45 * least(1.0, f.fit_val * 1.25)), 3) as confidence,
    f.cand_class as role_class,
    f.shared_professions
  from finalized f join public.profiles pr on pr.id = f.user_id
  where (coalesce(array_length(f.offers_you_seek,1),0) > 0
      or coalesce(array_length(f.seeks_you_offer,1),0) > 0
      or coalesce(array_length(f.shared_disciplines,1),0) > 0
      or coalesce(array_length(f.shared_professions,1),0) > 0
      or f.affinity > 0 or f.sim >= 0.6
      or f.i_follow_them > 0 or f.they_follow_me > 0)
    and (
      p_category is null
      or p_category = any (f.cand_professions)
      or exists (
        select 1 from public.profile_modules pm
        where pm.user_id = f.user_id and pm.archived_at is null and pm.category = p_category
      )
    )
  order by f.demote asc, f.raw desc, f.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int, text) to authenticated;

-- ── search_creators + profession filter ───────────────────────────────────────
drop function if exists public.search_creators(text, text, text, text, text, text, int, text, boolean, int);
create or replace function public.search_creators(
  p_query      text default null,
  p_role       text default null,
  p_genre      text default null,
  p_daw        text default null,
  p_plugin     text default null,
  p_key        text default null,
  p_bpm        int  default null,
  p_location   text default null,
  p_remote     boolean default null,
  p_profession text default null,
  p_limit      int  default 40
)
returns table(
  user_id uuid, username text, location text,
  offers text[], seeks text[], genres text[], profession text
)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.username, p.location,
    coalesce(array(select r.label from public.creator_roles cr join public.roles r on r.id = cr.role_id
                   where cr.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select r.label from public.creator_seeks cs join public.roles r on r.id = cs.role_id
                   where cs.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select jsonb_array_elements_text(p.profile->'genres')), '{}'),
    nullif(p.profile->>'profession', '')
  from public.profiles p
  where coalesce(p.banned, false) = false and p.username is not null and p.id <> auth.uid()
    and (p_query is null or p_query = '' or p.username ilike '%' || p_query || '%')
    and (p_role is null or p_role = ''
         or exists (select 1 from public.creator_roles cr where cr.user_id = p.id and cr.role_id = p_role)
         or exists (select 1 from public.creator_seeks cs where cs.user_id = p.id and cs.role_id = p_role))
    and (p_genre  is null or p_genre  = '' or (p.profile->'genres')  ? p_genre)
    and (p_daw    is null or p_daw    = '' or (p.profile->'daws')    ? p_daw)
    and (p_plugin is null or p_plugin = '' or (p.profile->'plugins') ? p_plugin)
    and (p_key    is null or p_key    = '' or (p.profile->'keys')    ? p_key)
    and (p_bpm is null or (
          nullif(p.profile->>'tempoMin','')::numeric is not null
          and nullif(p.profile->>'tempoMax','')::numeric is not null
          and nullif(p.profile->>'tempoMin','')::numeric <= p_bpm
          and nullif(p.profile->>'tempoMax','')::numeric >= p_bpm))
    and (p_location is null or p_location = '' or p.location ilike '%' || p_location || '%')
    and (p_remote is null or coalesce((p.profile->>'remoteOk')::boolean, false) = p_remote)
    and (p_profession is null or p_profession = ''
         or p.profile->>'profession' = p_profession
         or (p.profile->'professions') ? p_profession)
  order by p.last_active_at desc nulls last
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.search_creators(text, text, text, text, text, text, int, text, boolean, text, int) to authenticated;
