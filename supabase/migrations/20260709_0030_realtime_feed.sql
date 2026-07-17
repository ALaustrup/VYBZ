-- ===========================================================================
-- VYBZ — Realtime feed (Phase 2 media pipeline)
--
-- Add the two feed source tables to the `supabase_realtime` publication so the
-- client can react to new content the instant it's posted (drops + Space posts),
-- powering "instant posting" without manual refresh. RLS still governs delivery:
--   • drops        — read policy `using (true)` → everyone gets INSERTs.
--   • project_posts — read policy gates on the (non-archived) parent project, so
--                     subscribers only receive posts they're allowed to see.
-- Idempotent: only adds each table if not already published.
-- ===========================================================================

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'drops'
  ) then
    alter publication supabase_realtime add table public.drops;
  end if;

  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'project_posts'
  ) then
    alter publication supabase_realtime add table public.project_posts;
  end if;
end $$;
