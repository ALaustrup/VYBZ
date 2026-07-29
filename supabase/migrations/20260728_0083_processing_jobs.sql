-- ===========================================================================
-- VYBZ Phase 4 — Processing Engine job queue (skeleton)
-- Durable jobs for portable / native / remote workers. No paid AI providers.
-- Rollback: 20260728_0083_processing_jobs.down.sql
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.processing_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  release_id uuid references public.release_projects(id) on delete set null,
  kind text not null
    check (kind in ('waveform', 'loudness', 'analyze_audio', 'analyze_artwork')),
  engine text not null
    check (engine in ('portable', 'native', 'remote')),
  state text not null default 'queued'
    check (state in (
      'draft',
      'queued',
      'running',
      'completed',
      'cancelled',
      'failed_retryable',
      'failed_terminal'
    )),
  idempotency_key text,
  input_meta jsonb not null default '{}'::jsonb,
  result jsonb,
  error_message text,
  job_minutes numeric(12, 4) not null default 0,
  storage_bytes bigint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (owner_id, idempotency_key)
);

create index if not exists processing_jobs_owner_state_idx
  on public.processing_jobs (owner_id, state, created_at desc);

create index if not exists processing_jobs_queue_idx
  on public.processing_jobs (state, created_at)
  where state = 'queued';

alter table public.processing_jobs enable row level security;

drop policy if exists "processing_jobs select own" on public.processing_jobs;
create policy "processing_jobs select own"
  on public.processing_jobs for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "processing_jobs insert own" on public.processing_jobs;
create policy "processing_jobs insert own"
  on public.processing_jobs for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "processing_jobs update own" on public.processing_jobs;
create policy "processing_jobs update own"
  on public.processing_jobs for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

grant select, insert, update on public.processing_jobs to authenticated;

create or replace function public.processing_jobs_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists processing_jobs_updated_at on public.processing_jobs;
create trigger processing_jobs_updated_at
  before update on public.processing_jobs
  for each row execute function public.processing_jobs_set_updated_at();
