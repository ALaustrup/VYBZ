-- Rollback Phase 15 processing AI tables / ai-models bucket policy

drop policy if exists "ai-models public read" on storage.objects;

drop policy if exists "processing_results insert own" on public.processing_results;
drop policy if exists "processing_results select own" on public.processing_results;
drop table if exists public.processing_results;

drop trigger if exists processing_jobs_ai_updated_at on public.processing_jobs_ai;
drop function if exists public.processing_jobs_ai_set_updated_at();
drop policy if exists "processing_jobs_ai update own" on public.processing_jobs_ai;
drop policy if exists "processing_jobs_ai insert own" on public.processing_jobs_ai;
drop policy if exists "processing_jobs_ai select own" on public.processing_jobs_ai;
drop table if exists public.processing_jobs_ai;
