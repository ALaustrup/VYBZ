-- ===========================================================================
-- VYBZ — wire Projects into the feed + matchmaking.
--
-- feed_posts(): a unified, curated feed of project POSTS (music/art/video/…)
-- across the platform, filterable by scope (all / following / a content type),
-- with author + project + like state — this is the multi-content home feed.
--
-- collab_matches v5: project FOLLOWS become matchmaking signals — you're boosted
-- toward creators whose projects you follow (declared interest), who follow your
-- projects (mutual), and with whom you share follows (taste alignment).
-- ===========================================================================

set search_path = public, extensions;

-- ── Unified project-post feed ───────────────────────────────────────────────
create or replace function public.feed_posts(p_scope text default 'all', p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
      'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at,
      'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
      'authorId', pr.user_id, 'authorUsername', prof.username,
      'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
      'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
    ) as obj, pp.created_at
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and case
        when p_scope = 'following' then exists (select 1 from public.project_follows f where f.project_id = pr.id and f.user_id = auth.uid())
        when p_scope = 'music'   then pp.kind = 'audio' or pr.kind = 'music'
        when p_scope = 'art'     then pp.kind = 'image' or pr.kind = 'art'
        when p_scope = 'video'   then pp.kind = 'video' or pr.kind = 'video'
        when p_scope = 'writing' then pr.kind = 'writing' or pp.kind = 'text'
        else true
      end
    order by pp.created_at desc
    limit greatest(1, least(100, p_limit))
  ) q;
$fn$;
grant execute on function public.feed_posts(text, int) to anon, authenticated;

-- ── collab_matches v5 — + project-follow signals ────────────────────────────
create or replace function public.collab_matches(p_limit int default 20, p_category text default null)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[]
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max
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
    ) u where user_id <> auth.uid()
  ),
  scored as (
    select c.user_id,
      array(select r.label from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
            join public.roles r on r.id = cr.role_id where cr.user_id = c.user_id order by r.family, r.sort) as offers_you_seek,
      array(select r.label from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
            join public.roles r on r.id = cs.role_id where cs.user_id = c.user_id order by r.family, r.sort) as seeks_you_offer,
      array(select distinct r.label from public.profile_modules pm join public.roles r on r.id = pm.role_id
            where pm.user_id = c.user_id and pm.archived_at is null and pm.role_id in (select role_id from my_disc)
            order by r.label) as shared_disciplines,
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
      coalesce((p.profile->>'openToWork')::boolean, false) as open_to_work
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
      + case when s.open_to_work then public.mm_w('open',1.0) else 0 end ) as raw
    from scored s
  )
  select b.user_id, pr.username, pr.username,
    b.offers_you_seek, b.seeks_you_offer,
    (coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0),
    b.shared_genres, b.shared_daws, b.shared_plugins, b.open_to_work,
    round(b.sim, 3), round(b.reputation, 3), round(least(1.0, b.raw / public.mm_w('divisor',30.0)), 3),
    b.shared_disciplines
  from blended b join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0
      or coalesce(array_length(b.seeks_you_offer,1),0) > 0
      or coalesce(array_length(b.shared_disciplines,1),0) > 0
      or b.affinity > 0 or b.sim >= 0.6
      or b.i_follow_them > 0 or b.they_follow_me > 0)
    and (p_category is null or exists (
      select 1 from public.profile_modules pm
      where pm.user_id = b.user_id and pm.archived_at is null and pm.category = p_category))
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int, text) to authenticated;
