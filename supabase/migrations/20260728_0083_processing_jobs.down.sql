-- Rollback Phase 4 processing_jobs
set search_path = public, extensions;

drop trigger if exists processing_jobs_updated_at on public.processing_jobs;
drop function if exists public.processing_jobs_set_updated_at();
drop table if exists public.processing_jobs;
