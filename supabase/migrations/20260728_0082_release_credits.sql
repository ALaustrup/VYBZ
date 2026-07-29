-- ===========================================================================
-- VYBZ Phase 3 — Credits & metadata (incremental)
-- release_credits bound to release_projects. Owner-only RLS.
-- Multi-account split approval lands in a later Credits increment.
-- Rollback: 20260728_0082_release_credits.down.sql
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.release_credits (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  display_name text not null,
  role text not null
    check (role in (
      'primary_artist',
      'featured',
      'producer',
      'composer',
      'songwriter',
      'lyricist',
      'mixer',
      'engineer',
      'mastering',
      'other'
    )),
  split_bps integer check (split_bps is null or (split_bps >= 0 and split_bps <= 10000)),
  status text not null default 'draft'
    check (status in ('draft', 'confirmed', 'disputed')),
  source text not null default 'manual'
    check (source in ('manual', 'audio_metadata', 'import')),
  sort_order integer not null default 0,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_credits_release_idx
  on public.release_credits (release_id, sort_order);

create index if not exists release_credits_owner_idx
  on public.release_credits (owner_id);

alter table public.release_credits enable row level security;

drop policy if exists "release_credits select own" on public.release_credits;
create policy "release_credits select own"
  on public.release_credits for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "release_credits insert own" on public.release_credits;
create policy "release_credits insert own"
  on public.release_credits for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.release_projects rp
      where rp.id = release_id and rp.owner_id = auth.uid() and rp.deleted_at is null
    )
  );

drop policy if exists "release_credits update own" on public.release_credits;
create policy "release_credits update own"
  on public.release_credits for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "release_credits delete own" on public.release_credits;
create policy "release_credits delete own"
  on public.release_credits for delete to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.release_credits to authenticated;

create or replace function public.release_credits_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists release_credits_updated_at on public.release_credits;
create trigger release_credits_updated_at
  before update on public.release_credits
  for each row execute function public.release_credits_set_updated_at();
