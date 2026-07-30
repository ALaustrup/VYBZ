-- ===========================================================================
-- VYBZ Phase 15 — Remote Processing v2 (AI Mastering & Metadata AI)
-- processing_jobs_ai + processing_results (proc_version)
-- Rollback: 20260730_0087_processing_ai.down.sql
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.processing_jobs_ai (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.release_projects(id) on delete set null,
  type text not null
    check (type in ('ai_mastering', 'ai_metadata', 'analyze_remote')),
  status text not null default 'queued'
    check (status in (
      'queued',
      'processing',
      'completed',
      'failed',
      'canceled'
    )),
  version text not null default 'phase15.dsp.1',
  input_ref text,
  output_ref text,
  error text,
  meta jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists processing_jobs_ai_user_status_idx
  on public.processing_jobs_ai (user_id, status, created_at desc);

create index if not exists processing_jobs_ai_project_idx
  on public.processing_jobs_ai (project_id, created_at desc)
  where project_id is not null;

alter table public.processing_jobs_ai enable row level security;

drop policy if exists "processing_jobs_ai select own" on public.processing_jobs_ai;
create policy "processing_jobs_ai select own"
  on public.processing_jobs_ai for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "processing_jobs_ai insert own" on public.processing_jobs_ai;
create policy "processing_jobs_ai insert own"
  on public.processing_jobs_ai for insert to authenticated
  with check (user_id = auth.uid());

drop policy if exists "processing_jobs_ai update own" on public.processing_jobs_ai;
create policy "processing_jobs_ai update own"
  on public.processing_jobs_ai for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.processing_jobs_ai to authenticated;

create or replace function public.processing_jobs_ai_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists processing_jobs_ai_updated_at on public.processing_jobs_ai;
create trigger processing_jobs_ai_updated_at
  before update on public.processing_jobs_ai
  for each row execute function public.processing_jobs_ai_set_updated_at();

-- Durable mastering / metadata outputs (versioned)
create table if not exists public.processing_results (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.processing_jobs_ai(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  project_id uuid references public.release_projects(id) on delete set null,
  kind text not null
    check (kind in ('mastering', 'metadata', 'analyze')),
  proc_version text not null,
  payload jsonb not null default '{}'::jsonb,
  output_ref text,
  created_at timestamptz not null default now()
);

create index if not exists processing_results_job_idx
  on public.processing_results (job_id);

create index if not exists processing_results_user_idx
  on public.processing_results (user_id, created_at desc);

alter table public.processing_results enable row level security;

drop policy if exists "processing_results select own" on public.processing_results;
create policy "processing_results select own"
  on public.processing_results for select to authenticated
  using (user_id = auth.uid());

drop policy if exists "processing_results insert own" on public.processing_results;
create policy "processing_results insert own"
  on public.processing_results for insert to authenticated
  with check (user_id = auth.uid());

grant select, insert on public.processing_results to authenticated;

-- Optional public bucket for ONNX weights (read by Edge; write = service_role)
insert into storage.buckets (id, name, public, file_size_limit)
values ('ai-models', 'ai-models', true, 26214400)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit;

drop policy if exists "ai-models public read" on storage.objects;
create policy "ai-models public read"
  on storage.objects for select to anon, authenticated
  using (bucket_id = 'ai-models');
