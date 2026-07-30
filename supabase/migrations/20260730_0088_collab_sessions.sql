-- ===========================================================================
-- VYBZ Phase 16 — Collaboration Sessions
-- Collaborators, comment threads, optimistic row_version + merge RPC
-- Rollback: 20260730_0088_collab_sessions.down.sql
-- ===========================================================================

set search_path = public, extensions;

-- Optimistic concurrency on release metadata
alter table public.release_projects
  add column if not exists row_version integer not null default 1;

alter table public.release_credits
  add column if not exists row_version integer not null default 1;

create table if not exists public.release_collaborators (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_projects(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor'
    check (role in ('owner', 'editor', 'commenter')),
  invited_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (release_id, user_id)
);

create index if not exists release_collaborators_user_idx
  on public.release_collaborators (user_id, created_at desc);

alter table public.release_collaborators enable row level security;

create or replace function public.is_release_collaborator(p_release_id uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.release_projects rp
    where rp.id = p_release_id and rp.owner_id = auth.uid()
  )
  or exists (
    select 1 from public.release_collaborators rc
    where rc.release_id = p_release_id and rc.user_id = auth.uid()
  );
$$;

revoke all on function public.is_release_collaborator(uuid) from public;
grant execute on function public.is_release_collaborator(uuid) to authenticated;

drop policy if exists "release_collaborators select members" on public.release_collaborators;
create policy "release_collaborators select members"
  on public.release_collaborators for select to authenticated
  using (public.is_release_collaborator(release_id));

drop policy if exists "release_collaborators insert owner" on public.release_collaborators;
create policy "release_collaborators insert owner"
  on public.release_collaborators for insert to authenticated
  with check (
    exists (
      select 1 from public.release_projects rp
      where rp.id = release_id and rp.owner_id = auth.uid()
    )
  );

drop policy if exists "release_collaborators delete owner" on public.release_collaborators;
create policy "release_collaborators delete owner"
  on public.release_collaborators for delete to authenticated
  using (
    exists (
      select 1 from public.release_projects rp
      where rp.id = release_id and rp.owner_id = auth.uid()
    )
  );

grant select, insert, delete on public.release_collaborators to authenticated;

-- Anchored comment threads (waveform time + metadata/credit fields)
create table if not exists public.release_comment_threads (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_projects(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.release_comment_threads(id) on delete cascade,
  anchor_kind text not null
    check (anchor_kind in ('waveform_time', 'metadata_field', 'credit_field', 'finding')),
  anchor_ref text not null default '',
  time_sec numeric(12, 3),
  body text not null check (char_length(body) between 1 and 2000),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create index if not exists release_comment_threads_release_idx
  on public.release_comment_threads (release_id, created_at desc)
  where deleted_at is null;

alter table public.release_comment_threads enable row level security;

drop policy if exists "release_comments select members" on public.release_comment_threads;
create policy "release_comments select members"
  on public.release_comment_threads for select to authenticated
  using (public.is_release_collaborator(release_id));

drop policy if exists "release_comments insert members" on public.release_comment_threads;
create policy "release_comments insert members"
  on public.release_comment_threads for insert to authenticated
  with check (
    author_id = auth.uid()
    and public.is_release_collaborator(release_id)
  );

drop policy if exists "release_comments update author" on public.release_comment_threads;
create policy "release_comments update author"
  on public.release_comment_threads for update to authenticated
  using (author_id = auth.uid())
  with check (author_id = auth.uid());

grant select, insert, update on public.release_comment_threads to authenticated;

-- Conflict-safe metadata merge (optimistic concurrency)
create or replace function public.merge_release_metadata(
  p_release_id uuid,
  p_expected_version integer,
  p_patch jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_row public.release_projects%rowtype;
  v_new_version integer;
begin
  if not public.is_release_collaborator(p_release_id) then
    raise exception 'forbidden';
  end if;

  select * into v_row from public.release_projects where id = p_release_id for update;
  if not found then
    raise exception 'not_found';
  end if;

  if v_row.row_version <> p_expected_version then
    return jsonb_build_object(
      'status', 'conflict',
      'row_version', v_row.row_version,
      'current', jsonb_build_object(
        'title', v_row.title,
        'artist_name', v_row.artist_name
      )
    );
  end if;

  update public.release_projects
  set
    title = coalesce(p_patch->>'title', title),
    artist_name = case
      when p_patch ? 'artist_name' then nullif(p_patch->>'artist_name', '')
      else artist_name
    end,
    row_version = row_version + 1,
    updated_at = now()
  where id = p_release_id
  returning row_version into v_new_version;

  return jsonb_build_object(
    'status', 'applied',
    'row_version', v_new_version
  );
end;
$$;

revoke all on function public.merge_release_metadata(uuid, integer, jsonb) from public;
grant execute on function public.merge_release_metadata(uuid, integer, jsonb) to authenticated;

-- Realtime for comment inserts (presence/cursors use broadcast channels)
do $$
begin
  alter publication supabase_realtime add table public.release_comment_threads;
exception
  when duplicate_object then null;
  when undefined_object then null;
end $$;
