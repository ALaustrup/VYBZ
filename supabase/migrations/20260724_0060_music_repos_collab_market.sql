-- ===========================================================================
-- Music Repos R2/R3 — branch create, merge requests, tip pull manifest, listing get
-- ===========================================================================

set search_path = public, extensions;

create or replace function public.repo_create_branch(
  p_project uuid,
  p_name text,
  p_from_branch text default 'main'
)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  nm text := lower(trim(coalesce(p_name, '')));
  src text := coalesce(nullif(trim(p_from_branch), ''), 'main');
  tip uuid;
begin
  if uid is null or not public.can_upload_repo(p_project, uid) then return false; end if;
  if nm = '' or nm !~ '^[a-z0-9][a-z0-9._/-]{0,63}$' then return false; end if;
  select commit_id into tip from public.repo_branches
  where project_id = p_project and name = src;
  if tip is null then return false; end if;
  insert into public.repo_branches (project_id, name, commit_id, updated_at)
  values (p_project, nm, tip, now())
  on conflict (project_id, name) do nothing;
  return exists (select 1 from public.repo_branches where project_id = p_project and name = nm);
end $fn$;
grant execute on function public.repo_create_branch(uuid, text, text) to authenticated;

create or replace function public.repo_open_mr(
  p_project uuid,
  p_title text,
  p_source text,
  p_target text default 'main',
  p_body text default null
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  src text := lower(trim(coalesce(p_source, '')));
  tgt text := lower(trim(coalesce(p_target, 'main')));
  head uuid;
  mid uuid;
begin
  if uid is null or not public.is_project_member(p_project, uid) then return null; end if;
  if coalesce(trim(p_title), '') = '' then return null; end if;
  if src = '' or tgt = '' or src = tgt then return null; end if;
  select commit_id into head from public.repo_branches where project_id = p_project and name = src;
  if head is null then return null; end if;
  if not exists (select 1 from public.repo_branches where project_id = p_project and name = tgt) then
    return null;
  end if;
  insert into public.repo_merge_requests (
    project_id, author_id, source_branch, target_branch, title, body, head_commit_id, status
  ) values (
    p_project, uid, src, tgt, trim(p_title), nullif(trim(coalesce(p_body, '')), ''), head, 'open'
  ) returning id into mid;
  return mid;
end $fn$;
grant execute on function public.repo_open_mr(uuid, text, text, text, text) to authenticated;

create or replace function public.repo_list_mrs(p_project uuid, p_status text default null)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select case when public.is_project_member(p_project, auth.uid()) then coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', m.id,
      'title', m.title,
      'body', m.body,
      'status', m.status,
      'source_branch', m.source_branch,
      'target_branch', m.target_branch,
      'head_commit_id', m.head_commit_id,
      'author_id', m.author_id,
      'author', pr.username,
      'created_at', m.created_at,
      'closed_at', m.closed_at
    ) order by m.created_at desc)
    from public.repo_merge_requests m
    join public.profiles pr on pr.id = m.author_id
    where m.project_id = p_project
      and (p_status is null or m.status = p_status)
  ), '[]'::jsonb) else null end;
$fn$;
grant execute on function public.repo_list_mrs(uuid, text) to authenticated;

-- Merge = fast-forward / take-source tip onto target (no DAW XML merge).
create or replace function public.repo_merge_mr(p_mr uuid, p_strategy text default 'theirs')
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  m public.repo_merge_requests%rowtype;
  src_tip uuid;
  strategy text := coalesce(nullif(trim(p_strategy), ''), 'theirs');
begin
  if uid is null then return false; end if;
  select * into m from public.repo_merge_requests where id = p_mr and status = 'open';
  if not found then return false; end if;
  if not exists (select 1 from public.projects where id = m.project_id and owner_id = uid)
     and not public.can_upload_repo(m.project_id, uid) then
    return false;
  end if;

  select commit_id into src_tip from public.repo_branches
  where project_id = m.project_id and name = m.source_branch;
  if src_tip is null then return false; end if;

  -- theirs = take source tip; ours = leave target (close without moving)
  if strategy = 'theirs' then
    update public.repo_branches
      set commit_id = src_tip, updated_at = now()
    where project_id = m.project_id and name = m.target_branch;
  elsif strategy <> 'ours' then
    return false;
  end if;

  update public.repo_merge_requests
    set status = 'merged', closed_at = now(), head_commit_id = src_tip
  where id = p_mr;
  return true;
end $fn$;
grant execute on function public.repo_merge_mr(uuid, text) to authenticated;

create or replace function public.repo_close_mr(p_mr uuid)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  m public.repo_merge_requests%rowtype;
begin
  if uid is null then return false; end if;
  select * into m from public.repo_merge_requests where id = p_mr and status = 'open';
  if not found then return false; end if;
  if m.author_id <> uid
     and not exists (select 1 from public.projects where id = m.project_id and owner_id = uid) then
    return false;
  end if;
  update public.repo_merge_requests set status = 'closed', closed_at = now() where id = p_mr;
  return true;
end $fn$;
grant execute on function public.repo_close_mr(uuid) to authenticated;

-- Tip pull manifest: entries + bunny paths for client to sign/download.
create or replace function public.repo_tip_manifest(p_project uuid, p_branch text default 'main')
returns jsonb language plpgsql security definer set search_path = public stable as $fn$
declare
  uid uuid := auth.uid();
  branch text := coalesce(nullif(trim(p_branch), ''), 'main');
  cid uuid;
  th text;
begin
  if uid is null or not public.is_project_member(p_project, uid) then return null; end if;
  select commit_id into cid from public.repo_branches where project_id = p_project and name = branch;
  if cid is null then return jsonb_build_object('commit_id', null, 'files', '[]'::jsonb); end if;
  select tree_hash into th from public.repo_commits where id = cid;
  return (
    select jsonb_build_object(
      'commit_id', cid,
      'branch', branch,
      'tree_hash', t.hash,
      'file_count', t.file_count,
      'total_bytes', t.total_bytes,
      'files', coalesce((
        select jsonb_agg(jsonb_build_object(
          'path', e->>'path',
          'hash', e->>'hash',
          'size', (e->>'size')::bigint,
          'bunny_path', b.bunny_path,
          'mime', b.mime
        ) order by e->>'path')
        from jsonb_array_elements(t.entries) e
        join public.repo_blobs b on b.hash = lower(e->>'hash')
      ), '[]'::jsonb)
    )
    from public.repo_trees t where t.hash = th
  );
end $fn$;
grant execute on function public.repo_tip_manifest(uuid, text) to authenticated;

create or replace function public.repo_get_listing(p_project uuid)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select case
    when exists (
      select 1 from public.projects p
      where p.id = p_project and (
        p.owner_id = auth.uid()
        or p.visibility = 'listed'
        or public.is_project_member(p_project, auth.uid())
      )
    ) then (
      select jsonb_build_object(
        'project_id', l.project_id,
        'price_credits', l.price_credits,
        'grant_kind', l.grant_kind,
        'active', l.active,
        'sales', l.sales,
        'title', p.title,
        'owner_id', p.owner_id,
        'daw', p.daw,
        'license', p.license
      )
      from public.repo_listings l
      join public.projects p on p.id = l.project_id
      where l.project_id = p_project
    )
    else null
  end;
$fn$;
grant execute on function public.repo_get_listing(uuid) to authenticated;

create or replace function public.repo_listed_feed(p_limit int default 24)
returns jsonb language sql security definer set search_path = public stable as $fn$
  select coalesce((
    select jsonb_agg(jsonb_build_object(
      'project_id', p.id,
      'title', p.title,
      'daw', p.daw,
      'license', p.license,
      'price_credits', l.price_credits,
      'grant_kind', l.grant_kind,
      'sales', l.sales,
      'owner', pr.username,
      'owner_id', p.owner_id
    ) order by l.updated_at desc)
    from public.repo_listings l
    join public.projects p on p.id = l.project_id and p.visibility = 'listed'
    join public.profiles pr on pr.id = p.owner_id
    where l.active
    limit greatest(1, least(coalesce(p_limit, 24), 48))
  ), '[]'::jsonb);
$fn$;
grant execute on function public.repo_listed_feed(int) to authenticated;
