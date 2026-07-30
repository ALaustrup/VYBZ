-- Rollback Phase 16 collab sessions

do $$
begin
  alter publication supabase_realtime drop table public.release_comment_threads;
exception
  when undefined_object then null;
  when undefined_table then null;
end $$;

drop function if exists public.merge_release_metadata(uuid, integer, jsonb);
drop policy if exists "release_comments update author" on public.release_comment_threads;
drop policy if exists "release_comments insert members" on public.release_comment_threads;
drop policy if exists "release_comments select members" on public.release_comment_threads;
drop table if exists public.release_comment_threads;

drop policy if exists "release_collaborators delete owner" on public.release_collaborators;
drop policy if exists "release_collaborators insert owner" on public.release_collaborators;
drop policy if exists "release_collaborators select members" on public.release_collaborators;
drop function if exists public.is_release_collaborator(uuid);
drop table if exists public.release_collaborators;

alter table public.release_credits drop column if exists row_version;
alter table public.release_projects drop column if exists row_version;
