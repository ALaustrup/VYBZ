-- ===========================================================================
-- VYBZ Music Repos (Phase N / R0) — content-addressed music VCS on Studio.
-- Extends `projects` with repo metadata + Git-inspired CAS (blobs/trees/commits/
-- branches). Deny-all RLS; access via SECURITY DEFINER RPCs only.
-- ===========================================================================

set search_path = public, extensions;

-- ── Project columns ──────────────────────────────────────────────────────────
alter table public.projects
  add column if not exists repo_kind text not null default 'collab'
    check (repo_kind in ('collab', 'repo')),
  add column if not exists default_branch text not null default 'main',
  add column if not exists daw text,
  add column if not exists visibility text not null default 'private'
    check (visibility in ('private', 'collab', 'listed')),
  add column if not exists listing_price_credits int
    check (listing_price_credits is null or listing_price_credits >= 0),
  add column if not exists open_to_collab boolean not null default false,
  add column if not exists license text not null default 'collab-only'
    check (license in ('collab-only', 'credit-required', 'free', 'paid-fork'));

create index if not exists projects_repo_kind_idx on public.projects(repo_kind);
create index if not exists projects_visibility_idx on public.projects(visibility)
  where visibility = 'listed';

-- ── CAS tables ───────────────────────────────────────────────────────────────
create table if not exists public.repo_blobs (
  hash text primary key check (hash ~ '^[a-f0-9]{64}$'),
  size bigint not null check (size >= 0),
  bunny_path text not null,
  mime text,
  created_at timestamptz not null default now()
);

create table if not exists public.repo_trees (
  hash text primary key check (hash ~ '^[a-f0-9]{64}$'),
  -- entries: [{ "path": "Samples/kick.wav", "hash": "...", "size": 123, "mode": "blob" }]
  entries jsonb not null default '[]'::jsonb,
  file_count int not null default 0,
  total_bytes bigint not null default 0,
  created_at timestamptz not null default now()
);

create table if not exists public.repo_commits (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  tree_hash text not null references public.repo_trees(hash),
  parent_id uuid references public.repo_commits(id) on delete set null,
  author_id uuid not null references public.profiles(id) on delete cascade,
  message text not null default '',
  bounce_asset_id uuid references public.assets(id) on delete set null,
  plugins jsonb not null default '[]'::jsonb,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);
create index if not exists repo_commits_project_idx on public.repo_commits(project_id, created_at desc);

create table if not exists public.repo_branches (
  project_id uuid not null references public.projects(id) on delete cascade,
  name text not null,
  commit_id uuid not null references public.repo_commits(id) on delete restrict,
  updated_at timestamptz not null default now(),
  primary key (project_id, name)
);

create table if not exists public.repo_merge_requests (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  source_branch text not null,
  target_branch text not null default 'main',
  title text not null,
  body text,
  status text not null default 'open' check (status in ('open', 'merged', 'closed')),
  head_commit_id uuid references public.repo_commits(id) on delete set null,
  created_at timestamptz not null default now(),
  closed_at timestamptz
);
create index if not exists repo_mr_project_idx on public.repo_merge_requests(project_id, status);

create table if not exists public.repo_listings (
  project_id uuid primary key references public.projects(id) on delete cascade,
  price_credits int not null check (price_credits >= 0),
  grant_kind text not null default 'download'
    check (grant_kind in ('download', 'fork', 'collab_invite')),
  active boolean not null default true,
  sales int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.repo_purchases (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  buyer_id uuid not null references public.profiles(id) on delete cascade,
  seller_id uuid not null references public.profiles(id) on delete cascade,
  credits_spent int not null check (credits_spent >= 0),
  seller_received int not null check (seller_received >= 0),
  grant_kind text not null check (grant_kind in ('download', 'fork', 'collab_invite')),
  forked_project_id uuid references public.projects(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (project_id, buyer_id, grant_kind)
);

alter table public.repo_blobs enable row level security;
alter table public.repo_trees enable row level security;
alter table public.repo_commits enable row level security;
alter table public.repo_branches enable row level security;
alter table public.repo_merge_requests enable row level security;
alter table public.repo_listings enable row level security;
alter table public.repo_purchases enable row level security;

-- ── Helpers ──────────────────────────────────────────────────────────────────
create or replace function public.can_upload_repo(p_project uuid, p_uid uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select exists (
    select 1 from public.project_collaborators c
    where c.project_id = p_project and c.user_id = p_uid and c.can_upload
  ) or exists (
    select 1 from public.projects pr where pr.id = p_project and pr.owner_id = p_uid
  );
$fn$;

-- ── create_repo ──────────────────────────────────────────────────────────────
create or replace function public.create_repo(
  p_title text,
  p_description text default null,
  p_daw text default null,
  p_visibility text default 'private',
  p_license text default 'collab-only',
  p_bpm numeric default null,
  p_key text default null,
  p_genres text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  pid uuid;
  vis text := coalesce(nullif(trim(p_visibility), ''), 'private');
  lic text := coalesce(nullif(trim(p_license), ''), 'collab-only');
begin
  if uid is null or coalesce(trim(p_title), '') = '' then return null; end if;
  if vis not in ('private', 'collab', 'listed') then vis := 'private'; end if;
  if lic not in ('collab-only', 'credit-required', 'free', 'paid-fork') then lic := 'collab-only'; end if;

  insert into public.projects (
    owner_id, title, description, bpm, musical_key, genres,
    repo_kind, daw, visibility, license, default_branch, status
  ) values (
    uid, trim(p_title), nullif(trim(coalesce(p_description, '')), ''),
    p_bpm, nullif(trim(coalesce(p_key, '')), ''), coalesce(p_genres, '{}'),
    'repo', nullif(trim(coalesce(p_daw, '')), ''), vis, lic, 'main', 'open'
  ) returning id into pid;

  insert into public.project_collaborators (project_id, user_id, can_upload)
  values (pid, uid, true);
  insert into public.split_sheets (project_id, user_id, split, agreed)
  values (pid, uid, 100, true);
  return pid;
end $fn$;
grant execute on function public.create_repo(text, text, text, text, text, numeric, text, text[]) to authenticated;

-- Register a blob after Bunny upload (path must be under caller's folder or shared CAS).
create or replace function public.repo_register_blob(
  p_hash text,
  p_size bigint,
  p_bunny_path text,
  p_mime text default null
)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  if p_hash is null or p_hash !~ '^[a-f0-9]{64}$' then return false; end if;
  if p_size is null or p_size < 0 then return false; end if;
  if coalesce(trim(p_bunny_path), '') = '' then return false; end if;
  -- CAS path must be repo-blobs/{hash}… or legacy projects/{uid}/…
  if p_bunny_path not like 'repo-blobs/' || p_hash || '%'
     and p_bunny_path not like 'projects/' || uid::text || '/%' then
    return false;
  end if;
  insert into public.repo_blobs (hash, size, bunny_path, mime)
  values (lower(p_hash), p_size, p_bunny_path, p_mime)
  on conflict (hash) do nothing;
  return true;
end $fn$;
grant execute on function public.repo_register_blob(text, bigint, text, text) to authenticated;

create or replace function public.repo_blob_exists(p_hashes text[])
returns text[] language sql security definer set search_path = public stable as $fn$
  select coalesce(array_agg(b.hash), '{}'::text[])
  from public.repo_blobs b
  where b.hash = any (select lower(unnest(coalesce(p_hashes, '{}'::text[]))));
$fn$;
grant execute on function public.repo_blob_exists(text[]) to authenticated;

-- Commit a tree onto a branch (creates tree + commit + advances branch).
create or replace function public.repo_commit(
  p_project uuid,
  p_branch text default 'main',
  p_message text default '',
  p_entries jsonb default '[]'::jsonb,
  p_parent uuid default null,
  p_bounce_asset uuid default null,
  p_plugins jsonb default '[]'::jsonb,
  p_meta jsonb default '{}'::jsonb
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  branch text := coalesce(nullif(trim(p_branch), ''), 'main');
  tree_h text;
  cid uuid;
  parent uuid := p_parent;
  tip uuid;
  fcount int;
  tbytes bigint;
  entry jsonb;
begin
  if uid is null or not public.can_upload_repo(p_project, uid) then return null; end if;
  if jsonb_typeof(p_entries) <> 'array' then return null; end if;

  -- Validate every blob exists
  for entry in select * from jsonb_array_elements(p_entries)
  loop
    if coalesce(entry->>'hash', '') !~ '^[a-f0-9]{64}$' then return null; end if;
    if not exists (select 1 from public.repo_blobs b where b.hash = lower(entry->>'hash')) then
      return null;
    end if;
  end loop;

  select
    count(*)::int,
    coalesce(sum((e->>'size')::bigint), 0)
  into fcount, tbytes
  from jsonb_array_elements(p_entries) e;

  -- Deterministic tree hash from sorted canonical JSON
  tree_h := encode(
    digest(
      convert_to(
        (
          select coalesce(jsonb_agg(x order by x->>'path'), '[]'::jsonb)::text
          from jsonb_array_elements(p_entries) x
        ),
        'UTF8'
      ),
      'sha256'
    ),
    'hex'
  );

  insert into public.repo_trees (hash, entries, file_count, total_bytes)
  values (
    tree_h,
    coalesce((
      select jsonb_agg(x order by x->>'path') from jsonb_array_elements(p_entries) x
    ), '[]'::jsonb),
    fcount,
    tbytes
  )
  on conflict (hash) do nothing;

  select commit_id into tip from public.repo_branches
  where project_id = p_project and name = branch;
  if parent is null then parent := tip; end if;

  insert into public.repo_commits (
    project_id, tree_hash, parent_id, author_id, message,
    bounce_asset_id, plugins, meta
  ) values (
    p_project, tree_h, parent, uid, coalesce(nullif(trim(p_message), ''), 'Commit'),
    p_bounce_asset, coalesce(p_plugins, '[]'::jsonb), coalesce(p_meta, '{}'::jsonb)
  ) returning id into cid;

  insert into public.repo_branches (project_id, name, commit_id, updated_at)
  values (p_project, branch, cid, now())
  on conflict (project_id, name) do update
    set commit_id = excluded.commit_id, updated_at = now();

  update public.projects set status = 'in-progress', default_branch = branch
  where id = p_project and status = 'open';

  -- Compat: mirror tip as a legacy project_versions row when we have a bounce or zip asset
  if p_bounce_asset is not null then
    perform public.add_version(p_project, p_bounce_asset, left(coalesce(p_message, 'Commit'), 200));
  end if;

  return cid;
end $fn$;
grant execute on function public.repo_commit(uuid, text, text, jsonb, uuid, uuid, jsonb, jsonb) to authenticated;

create or replace function public.repo_history(p_project uuid, p_branch text default 'main', p_limit int default 40)
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  uid uuid := auth.uid();
  branch text := coalesce(nullif(trim(p_branch), ''), 'main');
  tip uuid;
  lim int := greatest(1, least(coalesce(p_limit, 40), 100));
  out jsonb := '[]'::jsonb;
  cur uuid;
  r record;
  n int := 0;
begin
  if uid is null or not public.is_project_member(p_project, uid) then return null; end if;
  select commit_id into tip from public.repo_branches where project_id = p_project and name = branch;
  if tip is null then return '[]'::jsonb; end if;
  cur := tip;
  while cur is not null and n < lim loop
    select c.id, c.message, c.created_at, c.tree_hash, c.parent_id, c.bounce_asset_id,
           c.plugins, c.meta, pr.username, t.file_count, t.total_bytes
      into r
    from public.repo_commits c
    join public.profiles pr on pr.id = c.author_id
    join public.repo_trees t on t.hash = c.tree_hash
    where c.id = cur;
    if not found then exit; end if;
    out := out || jsonb_build_array(jsonb_build_object(
      'id', r.id,
      'message', r.message,
      'created_at', r.created_at,
      'tree_hash', r.tree_hash,
      'parent_id', r.parent_id,
      'bounce_asset_id', r.bounce_asset_id,
      'plugins', r.plugins,
      'meta', r.meta,
      'author', r.username,
      'file_count', r.file_count,
      'total_bytes', r.total_bytes
    ));
    cur := r.parent_id;
    n := n + 1;
  end loop;
  return out;
end $fn$;
grant execute on function public.repo_history(uuid, text, int) to authenticated;

create or replace function public.repo_tree_at(p_project uuid, p_commit uuid default null, p_branch text default 'main')
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  uid uuid := auth.uid();
  cid uuid := p_commit;
  th text;
begin
  if uid is null or not public.is_project_member(p_project, uid) then return null; end if;
  if cid is null then
    select commit_id into cid from public.repo_branches
    where project_id = p_project and name = coalesce(nullif(trim(p_branch), ''), 'main');
  end if;
  if cid is null then return jsonb_build_object('entries', '[]'::jsonb, 'commit_id', null); end if;
  select tree_hash into th from public.repo_commits where id = cid and project_id = p_project;
  if th is null then return null; end if;
  return (
    select jsonb_build_object(
      'commit_id', cid,
      'tree_hash', t.hash,
      'file_count', t.file_count,
      'total_bytes', t.total_bytes,
      'entries', t.entries
    )
    from public.repo_trees t where t.hash = th
  );
end $fn$;
grant execute on function public.repo_tree_at(uuid, uuid, text) to authenticated;

-- Enrich project_detail with repo fields + tip commit summary
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
      where v.project_id = p_project), '[]'::jsonb),
    'branches', coalesce((select jsonb_agg(jsonb_build_object(
        'name', b.name, 'commit_id', b.commit_id, 'updated_at', b.updated_at) order by b.name)
      from public.repo_branches b where b.project_id = p_project), '[]'::jsonb),
    'tip', (
      select jsonb_build_object(
        'commit_id', c.id, 'message', c.message, 'created_at', c.created_at,
        'author', pr.username, 'file_count', t.file_count, 'total_bytes', t.total_bytes
      )
      from public.projects p
      join public.repo_branches br on br.project_id = p.id and br.name = p.default_branch
      join public.repo_commits c on c.id = br.commit_id
      join public.profiles pr on pr.id = c.author_id
      join public.repo_trees t on t.hash = c.tree_hash
      where p.id = p_project
    )
  ) else null end;
$fn$;
grant execute on function public.project_detail(uuid) to authenticated;

-- Extend my_projects with repo metadata
drop function if exists public.my_projects();
create or replace function public.my_projects()
returns table(
  id uuid,
  title text,
  status text,
  owner_id uuid,
  is_owner boolean,
  members int,
  versions int,
  created_at timestamptz,
  my_agreed boolean,
  pending_agrees int,
  repo_kind text,
  daw text,
  visibility text,
  commit_count int
)
language sql security definer set search_path = public stable as $fn$
  select
    p.id,
    p.title,
    p.status,
    p.owner_id,
    (p.owner_id = auth.uid()) as is_owner,
    (select count(*)::int from public.project_collaborators c where c.project_id = p.id) as members,
    (select count(*)::int from public.project_versions v where v.project_id = p.id) as versions,
    p.created_at,
    coalesce((
      select s.agreed from public.split_sheets s
      where s.project_id = p.id and s.user_id = auth.uid()
    ), false) as my_agreed,
    (
      select count(*)::int from public.split_sheets s
      join public.project_collaborators c
        on c.project_id = s.project_id and c.user_id = s.user_id
      where s.project_id = p.id and coalesce(s.agreed, false) = false
    ) as pending_agrees,
    p.repo_kind,
    p.daw,
    p.visibility,
    (select count(*)::int from public.repo_commits rc where rc.project_id = p.id) as commit_count
  from public.projects p
  where p.owner_id = auth.uid()
     or exists (
       select 1 from public.project_collaborators c
       where c.project_id = p.id and c.user_id = auth.uid()
     )
  order by
    case when p.status in ('released', 'archived') then 1 else 0 end,
    p.created_at desc;
$fn$;
grant execute on function public.my_projects() to authenticated;

-- Marketplace: list + purchase (R3 spine)
create or replace function public.repo_upsert_listing(
  p_project uuid, p_price int, p_grant text default 'download', p_active boolean default true
)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null or not exists (select 1 from public.projects where id = p_project and owner_id = uid) then
    return false;
  end if;
  if p_price is null or p_price < 0 then return false; end if;
  if coalesce(p_grant, 'download') not in ('download', 'fork', 'collab_invite') then return false; end if;
  insert into public.repo_listings (project_id, price_credits, grant_kind, active, updated_at)
  values (p_project, p_price, p_grant, coalesce(p_active, true), now())
  on conflict (project_id) do update set
    price_credits = excluded.price_credits,
    grant_kind = excluded.grant_kind,
    active = excluded.active,
    updated_at = now();
  update public.projects
    set visibility = case when coalesce(p_active, true) then 'listed' else visibility end,
        listing_price_credits = p_price
  where id = p_project;
  return true;
end $fn$;
grant execute on function public.repo_upsert_listing(uuid, int, text, boolean) to authenticated;

create or replace function public.repo_purchase(p_project uuid)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  listing public.repo_listings%rowtype;
  proj public.projects%rowtype;
  bal int;
  fee int;
  seller_get int;
  pid uuid;
  forked uuid;
begin
  if uid is null then return null; end if;
  select * into listing from public.repo_listings where project_id = p_project and active;
  if not found then return null; end if;
  select * into proj from public.projects where id = p_project;
  if proj.owner_id = uid then return null; end if;
  if exists (
    select 1 from public.repo_purchases
    where project_id = p_project and buyer_id = uid and grant_kind = listing.grant_kind
  ) then
    select id into pid from public.repo_purchases
    where project_id = p_project and buyer_id = uid and grant_kind = listing.grant_kind;
    return pid;
  end if;

  select coalesce(mod_points, 0) into bal from public.profiles where id = uid for update;
  if bal < listing.price_credits then return null; end if;

  fee := greatest(0, (listing.price_credits * 5) / 100); -- 5% platform fee (burned / stays out of seller)
  seller_get := listing.price_credits - fee;

  update public.profiles set mod_points = mod_points - listing.price_credits where id = uid;
  update public.profiles set mod_points = coalesce(mod_points, 0) + seller_get where id = proj.owner_id;
  update public.repo_listings set sales = sales + 1, updated_at = now() where project_id = p_project;

  forked := null;
  if listing.grant_kind = 'collab_invite' then
    perform public.add_collaborator(p_project, uid, null);
  elsif listing.grant_kind = 'fork' then
    forked := public.create_repo(
      proj.title || ' (fork)',
      coalesce(proj.description, '') || E'\n\nForked from repo ' || p_project::text,
      proj.daw, 'private', proj.license, proj.bpm, proj.musical_key, proj.genres
    );
  end if;

  insert into public.repo_purchases (
    project_id, buyer_id, seller_id, credits_spent, seller_received, grant_kind, forked_project_id
  ) values (
    p_project, uid, proj.owner_id, listing.price_credits, seller_get, listing.grant_kind, forked
  ) returning id into pid;
  return pid;
end $fn$;
grant execute on function public.repo_purchase(uuid) to authenticated;
