-- ===========================================================================
-- VYBZ Phase 3 — release_credits rollback (down)
-- ===========================================================================

set search_path = public, extensions;

drop trigger if exists release_credits_updated_at on public.release_credits;
drop function if exists public.release_credits_set_updated_at();
drop table if exists public.release_credits cascade;
