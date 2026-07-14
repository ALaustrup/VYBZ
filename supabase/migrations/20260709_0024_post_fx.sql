-- ===========================================================================
-- VYBZ — per-post audio-reactive effect.
-- A post's author chooses an effect (fx); when a viewer plays that post's audio/
-- video, the platform-wide reactive frame renders the poster's chosen effect.
-- ===========================================================================

set search_path = public, extensions;

alter table public.project_posts add column if not exists fx text not null default 'glow'
  check (fx in ('off','glow','aurora','pulse','bars','ripple'));

create or replace function public.feed_posts(p_scope text default 'all', p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
      'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at, 'fx', pp.fx,
      'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
      'authorId', pr.user_id, 'authorUsername', prof.username,
      'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
      'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
    ) as obj, pp.created_at
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and (pp.scheduled_at is null or pp.scheduled_at <= now() or pr.user_id = auth.uid())
      and (coalesce(pp.audience,'public') = 'public' or pr.user_id = auth.uid()
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

create or replace function public.profile_project_detail(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'userId', p.user_id, 'name', p.name, 'kind', p.kind,
    'tagline', p.tagline, 'accent', p.accent, 'coverUrl', p.cover_url,
    'followers', (select count(*) from public.project_follows pf where pf.project_id = p.id),
    'following', exists (select 1 from public.project_follows pf where pf.project_id = p.id and pf.user_id = auth.uid()),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
        'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at, 'fx', pp.fx,
        'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
        'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
      ) order by pp.created_at desc), '[]'::jsonb) from public.project_posts pp
      where pp.project_id = p.id
        and (pp.scheduled_at is null or pp.scheduled_at <= now() or p.user_id = auth.uid())
        and (coalesce(pp.audience,'public') = 'public' or p.user_id = auth.uid()
             or exists (select 1 from public.project_follows f where f.project_id = p.id and f.user_id = auth.uid()))),
    'links', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pl.id, 'label', pl.label, 'url', pl.url, 'thumbUrl', pl.thumb_url,
        'targetProjectId', pl.target_project_id, 'sort', pl.sort
      ) order by pl.sort, pl.created_at), '[]'::jsonb) from public.project_links pl where pl.project_id = p.id)
  ) end
  from public.profile_projects p
  where p.id = p_id and (p.archived_at is null or p.user_id = auth.uid());
$fn$;
grant execute on function public.profile_project_detail(uuid) to anon, authenticated;
