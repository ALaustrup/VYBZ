-- ===========================================================================
-- VYBZ — Unify "Spaces" + "Projects": widgets on the on-profile projects.
--
-- The on-profile creative projects (profile_projects, formerly "Spaces") become
-- the single "Projects" concept. This adds a WIDGET DASHBOARD to each — the same
-- embed/connector widgets — so a Project has content (posts/links) + widgets,
-- shown natively on the profile. The private collaboration rooms (`projects`)
-- are rebranded "Collabs" (versions/splits/credits) and keep their own space.
--
-- RLS mirrors project_posts: read when the project is visible; write when you
-- own the project.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.project_page_widgets (
  id          uuid primary key default gen_random_uuid(),
  project_id  uuid not null references public.profile_projects(id) on delete cascade,
  user_id     uuid not null references public.profiles(id) on delete cascade,
  kind        text not null,
  title       text,
  config      jsonb not null default '{}'::jsonb,
  sort        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists project_page_widgets_project_idx on public.project_page_widgets(project_id, sort);
alter table public.project_page_widgets enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_page_widgets' and policyname='space widgets read') then
    create policy "space widgets read" on public.project_page_widgets for select using (
      exists (select 1 from public.profile_projects p where p.id = project_id and (p.archived_at is null or p.user_id = auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_page_widgets' and policyname='space widgets write own') then
    create policy "space widgets write own" on public.project_page_widgets for all
      using (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()))
      with check (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()));
  end if;
end $$;
grant select, insert, update, delete on public.project_page_widgets to authenticated;
grant select on public.project_page_widgets to anon;

-- Extend the project detail RPC to include widgets.
create or replace function public.profile_project_detail(p_id uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when p.id is null then null else jsonb_build_object(
    'id', p.id, 'userId', p.user_id, 'name', p.name, 'kind', p.kind,
    'tagline', p.tagline, 'accent', p.accent, 'coverUrl', p.cover_url,
    'followers', (select count(*) from public.project_follows pf where pf.project_id = p.id),
    'following', exists (select 1 from public.project_follows pf where pf.project_id = p.id and pf.user_id = auth.uid()),
    'posts', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
        'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at,
        'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
        'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
      ) order by pp.created_at desc), '[]'::jsonb) from public.project_posts pp where pp.project_id = p.id),
    'links', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', pl.id, 'label', pl.label, 'url', pl.url, 'thumbUrl', pl.thumb_url,
        'targetProjectId', pl.target_project_id, 'sort', pl.sort
      ) order by pl.sort, pl.created_at), '[]'::jsonb) from public.project_links pl where pl.project_id = p.id),
    'widgets', (select coalesce(jsonb_agg(jsonb_build_object(
        'id', w.id, 'kind', w.kind, 'title', w.title, 'config', w.config, 'sort', w.sort
      ) order by w.sort, w.created_at), '[]'::jsonb) from public.project_page_widgets w where w.project_id = p.id)
  ) end
  from public.profile_projects p
  where p.id = p_id and (p.archived_at is null or p.user_id = auth.uid());
$fn$;
grant execute on function public.profile_project_detail(uuid) to anon, authenticated;
