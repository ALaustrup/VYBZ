-- ===========================================================================
-- VYBZ — Projects: in-profile, fully-customizable creative spaces.
--
-- One solid profile; unlimited PROJECTS shown as tabs (artist aliases, bands,
-- channels, any creative endeavour). Content projects (music/art/writing/…) are
-- in-profile micro-blogs of POSTS. "Hub" projects (video/links) are grids of
-- LINKS — each link opens externally (new tab) or points to another VYBZ Project
-- Page. Viewers can follow projects and like posts (feeds interests/matchmaking).
-- Old-school MySpace customization: per-project accent + tagline + cover.
-- ===========================================================================

set search_path = public, extensions;

-- ── Projects (the profile tabs) ─────────────────────────────────────────────
create table if not exists public.profile_projects (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references public.profiles(id) on delete cascade,
  name        text not null,
  kind        text not null default 'general'
              check (kind in ('music','video','art','writing','links','general')),
  tagline     text,
  accent      text,                          -- hex accent for customisation
  cover_url   text,
  sort        int not null default 0,
  archived_at timestamptz,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists profile_projects_user_idx on public.profile_projects(user_id) where archived_at is null;
alter table public.profile_projects enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_projects' and policyname='projects read') then
    create policy "projects read" on public.profile_projects for select using (archived_at is null or user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='profile_projects' and policyname='projects write own') then
    create policy "projects write own" on public.profile_projects for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
grant select, insert, update, delete on public.profile_projects to authenticated;
grant select on public.profile_projects to anon;

-- ── Posts (micro-blog content within a project) ─────────────────────────────
create table if not exists public.project_posts (
  id         uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.profile_projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  kind       text not null default 'text' check (kind in ('text','audio','image','video','link')),
  title      text,
  body       text,
  media_url  text,
  link_url   text,
  created_at timestamptz not null default now()
);
create index if not exists project_posts_project_idx on public.project_posts(project_id, created_at desc);
alter table public.project_posts enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_posts' and policyname='posts read') then
    create policy "posts read" on public.project_posts for select using (
      exists (select 1 from public.profile_projects p where p.id = project_id and (p.archived_at is null or p.user_id = auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_posts' and policyname='posts write own') then
    create policy "posts write own" on public.project_posts for all
      using (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()))
      with check (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()));
  end if;
end $$;
grant select, insert, update, delete on public.project_posts to authenticated;
grant select on public.project_posts to anon;

-- ── Links (hub projects: channels, sites, VYBZ Project Pages) ───────────────
create table if not exists public.project_links (
  id                uuid primary key default gen_random_uuid(),
  project_id        uuid not null references public.profile_projects(id) on delete cascade,
  user_id           uuid not null references public.profiles(id) on delete cascade,
  label             text not null,
  url               text,                                       -- external target
  thumb_url         text,
  target_project_id uuid references public.profile_projects(id) on delete set null, -- internal VYBZ Project Page
  sort              int not null default 0,
  created_at        timestamptz not null default now()
);
create index if not exists project_links_project_idx on public.project_links(project_id, sort);
alter table public.project_links enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_links' and policyname='links read') then
    create policy "links read" on public.project_links for select using (
      exists (select 1 from public.profile_projects p where p.id = project_id and (p.archived_at is null or p.user_id = auth.uid())));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_links' and policyname='links write own') then
    create policy "links write own" on public.project_links for all
      using (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()))
      with check (user_id = auth.uid() and exists (select 1 from public.profile_projects p where p.id = project_id and p.user_id = auth.uid()));
  end if;
end $$;
grant select, insert, update, delete on public.project_links to authenticated;
grant select on public.project_links to anon;

-- ── Follows (project-level) + post likes ────────────────────────────────────
create table if not exists public.project_follows (
  project_id uuid not null references public.profile_projects(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
alter table public.project_follows enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_follows' and policyname='follows read') then
    create policy "follows read" on public.project_follows for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_follows' and policyname='follows write own') then
    create policy "follows write own" on public.project_follows for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
grant select, insert, delete on public.project_follows to authenticated;

create table if not exists public.project_post_likes (
  post_id uuid not null references public.project_posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, user_id)
);
alter table public.project_post_likes enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_post_likes' and policyname='post likes read') then
    create policy "post likes read" on public.project_post_likes for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='project_post_likes' and policyname='post likes write own') then
    create policy "post likes write own" on public.project_post_likes for all using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
grant select, insert, delete on public.project_post_likes to authenticated;

-- ── Reads: a user's projects (with counts + my follow state) ────────────────
create or replace function public.list_profile_projects(p_uid uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(jsonb_build_object(
    'id', p.id, 'userId', p.user_id, 'name', p.name, 'kind', p.kind,
    'tagline', p.tagline, 'accent', p.accent, 'coverUrl', p.cover_url, 'sort', p.sort,
    'posts', (select count(*) from public.project_posts pp where pp.project_id = p.id),
    'links', (select count(*) from public.project_links pl where pl.project_id = p.id),
    'followers', (select count(*) from public.project_follows pf where pf.project_id = p.id),
    'following', exists (select 1 from public.project_follows pf where pf.project_id = p.id and pf.user_id = auth.uid())
  ) order by p.sort, p.created_at), '[]'::jsonb)
  from public.profile_projects p
  where p.user_id = p_uid and p.archived_at is null;
$fn$;
grant execute on function public.list_profile_projects(uuid) to anon, authenticated;

-- ── Reads: one project in full (posts + links + my likes/follow) ────────────
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
      ) order by pl.sort, pl.created_at), '[]'::jsonb) from public.project_links pl where pl.project_id = p.id)
  ) end
  from public.profile_projects p
  where p.id = p_id and (p.archived_at is null or p.user_id = auth.uid());
$fn$;
grant execute on function public.profile_project_detail(uuid) to anon, authenticated;

-- ── Toggles: follow a project / like a post ─────────────────────────────────
create or replace function public.follow_project(p_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_on then
    insert into public.project_follows (project_id, user_id) values (p_id, uid) on conflict do nothing;
  else
    delete from public.project_follows where project_id = p_id and user_id = uid;
  end if;
end $fn$;
grant execute on function public.follow_project(uuid, boolean) to authenticated;

create or replace function public.like_post(p_id uuid, p_on boolean)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_on then
    insert into public.project_post_likes (post_id, user_id) values (p_id, uid) on conflict do nothing;
  else
    delete from public.project_post_likes where post_id = p_id and user_id = uid;
  end if;
end $fn$;
grant execute on function public.like_post(uuid, boolean) to authenticated;

-- ── Reorder helper ──────────────────────────────────────────────────────────
create or replace function public.reorder_profile_projects(p_ids uuid[])
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.profile_projects m set sort = idx.ord, updated_at = now()
  from (select unnest(p_ids) as id, generate_subscripts(p_ids, 1) as ord) idx
  where m.id = idx.id and m.user_id = uid;
end $fn$;
grant execute on function public.reorder_profile_projects(uuid[]) to authenticated;
