-- ===========================================================================
-- VYBZ Phase D — projects, versioned handoff, split sheets, verified credits.
--
-- A private collaboration room: members exchange versioned project bundles, agree
-- ownership splits, and — when the project is released — earn VERIFIED CREDITS
-- that feed reputation (closing the match → collab → trust loop). All access is
-- through member-gated SECURITY DEFINER RPCs (tables are deny-all to clients).
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null, description text,
  bpm numeric, musical_key text, genres text[] not null default '{}',
  status text not null default 'open' check (status in ('open','in-progress','released','archived')),
  released_at timestamptz,
  created_at timestamptz not null default now()
);
create table if not exists public.project_collaborators (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text references public.roles(id),
  can_upload boolean not null default true,
  created_at timestamptz not null default now(),
  primary key (project_id, user_id)
);
create index if not exists project_collab_user_idx on public.project_collaborators(user_id);
create table if not exists public.project_versions (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  uploader_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid references public.assets(id) on delete set null,
  note text, version int not null,
  created_at timestamptz not null default now()
);
create table if not exists public.split_sheets (
  project_id uuid not null references public.projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text references public.roles(id),
  split numeric not null default 0 check (split >= 0 and split <= 100),
  agreed boolean not null default false,
  primary key (project_id, user_id)
);

alter table public.projects enable row level security;
alter table public.project_collaborators enable row level security;
alter table public.project_versions enable row level security;
alter table public.split_sheets enable row level security;
-- Deny-all to clients; everything flows through the definer RPCs below.

create or replace function public.is_project_member(p_project uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (select 1 from public.project_collaborators c where c.project_id = p_project and c.user_id = p_uid)
      or exists (select 1 from public.projects pr where pr.id = p_project and pr.owner_id = p_uid);
$fn$;

create or replace function public.create_project(p_title text, p_description text default null,
  p_bpm numeric default null, p_key text default null, p_genres text[] default '{}')
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); pid uuid;
begin
  if uid is null or coalesce(trim(p_title), '') = '' then return null; end if;
  insert into public.projects (owner_id, title, description, bpm, musical_key, genres)
  values (uid, p_title, p_description, p_bpm, p_key, coalesce(p_genres, '{}')) returning id into pid;
  insert into public.project_collaborators (project_id, user_id, can_upload) values (pid, uid, true);
  insert into public.split_sheets (project_id, user_id, split, agreed) values (pid, uid, 100, true);
  return pid;
end $fn$;
grant execute on function public.create_project(text, text, numeric, text, text[]) to authenticated;

create or replace function public.add_collaborator(p_project uuid, p_user uuid, p_role text default null)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = uid) then return; end if;
  insert into public.project_collaborators (project_id, user_id, role_id) values (p_project, p_user, p_role)
    on conflict (project_id, user_id) do update set role_id = excluded.role_id;
  insert into public.split_sheets (project_id, user_id, role_id, split, agreed) values (p_project, p_user, p_role, 0, false)
    on conflict (project_id, user_id) do nothing;
  update public.projects set status = 'in-progress' where id = p_project and status = 'open';
end $fn$;
grant execute on function public.add_collaborator(uuid, uuid, text) to authenticated;

create or replace function public.add_version(p_project uuid, p_asset uuid, p_note text default null)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); v int; vid uuid;
begin
  if not exists (select 1 from public.project_collaborators c where c.project_id = p_project and c.user_id = uid and c.can_upload) then return null; end if;
  select coalesce(max(version), 0) + 1 into v from public.project_versions where project_id = p_project;
  insert into public.project_versions (project_id, uploader_id, asset_id, note, version)
  values (p_project, uid, p_asset, p_note, v) returning id into vid;
  update public.projects set status = 'in-progress' where id = p_project and status = 'open';
  return vid;
end $fn$;
grant execute on function public.add_version(uuid, uuid, text) to authenticated;

create or replace function public.set_split(p_project uuid, p_user uuid, p_role text, p_split numeric)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if not exists (select 1 from public.projects where id = p_project and owner_id = uid) then return; end if;
  insert into public.split_sheets (project_id, user_id, role_id, split, agreed) values (p_project, p_user, p_role, greatest(0, least(100, p_split)), false)
    on conflict (project_id, user_id) do update set split = greatest(0, least(100, p_split)), role_id = coalesce(excluded.role_id, split_sheets.role_id), agreed = false;
end $fn$;
grant execute on function public.set_split(uuid, uuid, text, numeric) to authenticated;

create or replace function public.agree_split(p_project uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.split_sheets set agreed = true where project_id = p_project and user_id = uid;
end $fn$;
grant execute on function public.agree_split(uuid) to authenticated;

create or replace function public.release_project(p_project uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  update public.projects set status = 'released', released_at = now() where id = p_project and owner_id = uid;
end $fn$;
grant execute on function public.release_project(uuid) to authenticated;

create or replace function public.my_projects()
returns table(id uuid, title text, status text, owner_id uuid, is_owner boolean, members int, versions int, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.title, p.status, p.owner_id, (p.owner_id = auth.uid()),
    (select count(*)::int from public.project_collaborators c where c.project_id = p.id),
    (select count(*)::int from public.project_versions v where v.project_id = p.id),
    p.created_at
  from public.projects p
  where p.owner_id = auth.uid()
     or exists (select 1 from public.project_collaborators c where c.project_id = p.id and c.user_id = auth.uid())
  order by p.created_at desc;
$fn$;
grant execute on function public.my_projects() to authenticated;

create or replace function public.project_detail(p_project uuid)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select case when public.is_project_member(p_project, auth.uid()) then jsonb_build_object(
    'project', (select to_jsonb(p) from public.projects p where p.id = p_project),
    'is_owner', (select owner_id = auth.uid() from public.projects where id = p_project),
    'collaborators', coalesce((select jsonb_agg(jsonb_build_object(
        'user_id', c.user_id, 'username', pr.username, 'role', r.label, 'can_upload', c.can_upload,
        'split', s.split, 'agreed', s.agreed) order by c.created_at)
      from public.project_collaborators c
      join public.profiles pr on pr.id = c.user_id
      left join public.roles r on r.id = c.role_id
      left join public.split_sheets s on s.project_id = c.project_id and s.user_id = c.user_id
      where c.project_id = p_project), '[]'::jsonb),
    'versions', coalesce((select jsonb_agg(jsonb_build_object(
        'id', v.id, 'version', v.version, 'note', v.note, 'uploader', pr.username,
        'asset_id', v.asset_id, 'kind', a.kind, 'format', a.format, 'created_at', v.created_at) order by v.version desc)
      from public.project_versions v
      join public.profiles pr on pr.id = v.uploader_id
      left join public.assets a on a.id = v.asset_id
      where v.project_id = p_project), '[]'::jsonb)
  ) else null end;
$fn$;
grant execute on function public.project_detail(uuid) to authenticated;

-- Verified credits: released projects where the creator was a collaborator who
-- agreed their split. Public — these are portfolio + reputation inputs.
create or replace function public.creator_credits(p_id uuid)
returns table(project_id uuid, title text, role text, released_at timestamptz, split numeric)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.title, r.label, p.released_at, s.split
  from public.projects p
  join public.project_collaborators c on c.project_id = p.id and c.user_id = p_id
  left join public.roles r on r.id = c.role_id
  left join public.split_sheets s on s.project_id = p.id and s.user_id = p_id
  where p.status = 'released' and coalesce(s.agreed, false) = true
  order by p.released_at desc nulls last;
$fn$;
grant execute on function public.creator_credits(uuid) to anon, authenticated;

-- Fold verified-credit count into reputation (a released, agreed credit is the
-- strongest trust signal we have).
create or replace function public.creator_reputation(p_id uuid)
returns numeric language sql stable security definer set search_path = public as $fn$
  select round(least(1.0,
      coalesce((select avg_rating from public.creator_stats where user_id = p_id), 0) / 5.0 * 0.5
    + least(1.0, coalesce((select ratings from public.creator_stats where user_id = p_id), 0) / 20.0) * 0.2
    + least(1.0, coalesce((select connections from public.creator_stats where user_id = p_id), 0) / 10.0) * 0.1
    + least(1.0, (select count(*) from public.projects p
        join public.project_collaborators c on c.project_id = p.id and c.user_id = p_id
        left join public.split_sheets s on s.project_id = p.id and s.user_id = p_id
        where p.status = 'released' and coalesce(s.agreed,false) = true) / 5.0) * 0.2
  ), 3);
$fn$;
grant execute on function public.creator_reputation(uuid) to anon, authenticated;
