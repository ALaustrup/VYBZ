-- ===========================================================================
-- VYBZ — "For you" feed blend (P0 #4, §12.2)
--
-- The default home feed becomes personalized: it blends complement-fit
-- (creators you match with) + Space-follow interest + accepted connections +
-- intent/content alignment, decayed by recency — instead of raw newest-first.
-- Anti-popularity "Undiscovered" stays a *separate* mode (feed_undiscovered),
-- surfacing fresh/under-liked posts so the network stays vibrant.
--
-- Also hardens visibility across the feed: hidden (moderated), future-scheduled,
-- and followers-only posts are now filtered correctly (feed_posts previously
-- leaked them).
-- ===========================================================================

set search_path = public, extensions;

-- ── feed_posts: apply visibility (hidden / scheduled / followers-only) ───────
create or replace function public.feed_posts(p_scope text default 'all', p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
      'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at,
      'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
      'authorId', pr.user_id, 'authorUsername', prof.username,
      'authorAvatarUrl', prof.avatar_url,
      'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
      'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
    ) as obj, pp.created_at
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and pp.hidden_at is null
      and (pp.scheduled_at is null or pp.scheduled_at <= now())
      and (coalesce(pp.audience,'public') = 'public'
           or pr.user_id = auth.uid()
           or exists (select 1 from public.project_follows f where f.project_id = pr.id and f.user_id = auth.uid()))
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

-- ── feed_for_you: personalized blend (complement-fit + follows + intent) ─────
create or replace function public.feed_for_you(p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  with my_follows as (select project_id from public.project_follows where user_id = auth.uid()),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  -- Creators I complement: they offer a role I seek, seek a role I offer, or are
  -- a strong role-affinity target of a role I offer.
  complement as (
    select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
    union
    select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
    union
    select cu.user_id from public.creator_roles cu
      join public.role_affinities ra on ra.to_role = cu.role_id
      where ra.from_role in (select role_id from my_offers)
  ),
  my_conns as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as uid
    from public.connections
    where status = 'accepted' and (requester_id = auth.uid() or addressee_id = auth.uid())
  ),
  my_intent as (select lower(coalesce((select profile->'intents'->>0 from public.profiles where id = auth.uid()), '')) as t),
  ranked as (
    select pp.id, pp.kind, pp.title, pp.body, pp.media_url, pp.link_url, pp.created_at,
      pr.id as pid, pr.name, pr.kind as pkind, pr.accent, pr.user_id as author,
      prof.username, prof.avatar_url,
      ( (case when pr.id in (select project_id from my_follows) then 5.0 else 0 end)
      + (case when pr.user_id in (select user_id from complement) then 3.0 else 0 end)
      + (case when pr.user_id in (select uid from my_conns) then 2.0 else 0 end)
      + (case
          when (select t from my_intent) ~ '(music|beat|produc|sound|dj|rap|sing|band)' and (pp.kind = 'audio' or pr.kind = 'music') then 1.0
          when (select t from my_intent) ~ '(art|paint|illustr|design|photo)' and (pp.kind = 'image' or pr.kind = 'art') then 1.0
          when (select t from my_intent) ~ '(video|film|stream)' and (pp.kind = 'video' or pr.kind = 'video') then 1.0
          when (select t from my_intent) ~ '(writ|author|book|poet|story|script)' and (pp.kind = 'text' or pr.kind = 'writing') then 1.0
          else 0 end)
      - (extract(epoch from (now() - pp.created_at)) / 86400.0) * 0.2
      ) as score
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and pp.hidden_at is null
      and (pp.scheduled_at is null or pp.scheduled_at <= now())
      and pr.user_id <> auth.uid()
      and (coalesce(pp.audience,'public') = 'public'
           or exists (select 1 from my_follows f where f.project_id = pr.id))
  )
  select coalesce(jsonb_agg(x.obj order by x.score desc, x.created_at desc), '[]'::jsonb)
  from (
    select r.score, r.created_at,
      jsonb_build_object(
        'id', r.id, 'kind', r.kind, 'title', r.title, 'body', r.body,
        'mediaUrl', r.media_url, 'linkUrl', r.link_url, 'createdAt', r.created_at,
        'projectId', r.pid, 'projectName', r.name, 'projectKind', r.pkind, 'accent', r.accent,
        'authorId', r.author, 'authorUsername', r.username, 'authorAvatarUrl', r.avatar_url,
        'likes', (select count(*) from public.project_post_likes k where k.post_id = r.id),
        'liked', exists (select 1 from public.project_post_likes k where k.post_id = r.id and k.user_id = auth.uid())
      ) as obj
    from ranked r
    order by r.score desc, r.created_at desc
    limit greatest(1, least(100, p_limit))
  ) x;
$fn$;
grant execute on function public.feed_for_you(int) to authenticated;

-- ── feed_undiscovered: anti-popularity (fresh + least-liked first) ───────────
create or replace function public.feed_undiscovered(p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(x.obj order by x.likes asc, x.created_at desc), '[]'::jsonb)
  from (
    select (select count(*) from public.project_post_likes k where k.post_id = pp.id) as likes,
      pp.created_at,
      jsonb_build_object(
        'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
        'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at,
        'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
        'authorId', pr.user_id, 'authorUsername', prof.username, 'authorAvatarUrl', prof.avatar_url,
        'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
        'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
      ) as obj
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and pp.hidden_at is null
      and (pp.scheduled_at is null or pp.scheduled_at <= now())
      and coalesce(pp.audience,'public') = 'public'
      and pr.user_id <> auth.uid()
    order by likes asc, pp.created_at desc
    limit greatest(1, least(100, p_limit))
  ) x;
$fn$;
grant execute on function public.feed_undiscovered(int) to authenticated;
