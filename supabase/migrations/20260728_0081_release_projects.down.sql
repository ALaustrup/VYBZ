-- ===========================================================================
-- VYBZ Phase 2 — Prepare MVP rollback (down)
-- Apply manually: psql / supabase db execute — not auto-run by migrate up.
-- Safe order: findings → assets → projects → trigger/function.
-- ===========================================================================

set search_path = public, extensions;

drop trigger if exists release_projects_updated_at on public.release_projects;
drop function if exists public.release_projects_set_updated_at();

drop table if exists public.release_findings cascade;
drop table if exists public.release_assets cascade;
drop table if exists public.release_projects cascade;
