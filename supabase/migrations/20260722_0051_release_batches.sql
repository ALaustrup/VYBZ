-- ===========================================================================
-- VYBZ Phase 3F — Release batches for Studio bulk upload.
-- Groups sequenced drops from a multi-file release; ownership via owner_id RLS.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.release_batches (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text,
  credited_artist text,
  created_at timestamptz not null default now()
);

create index if not exists release_batches_owner_idx on public.release_batches (owner_id);
create index if not exists release_batches_created_idx on public.release_batches (created_at desc);

alter table public.release_batches enable row level security;

create policy "release_batches read own"
  on public.release_batches for select
  using (owner_id = auth.uid());

create policy "release_batches insert own"
  on public.release_batches for insert
  with check (owner_id = auth.uid());

create policy "release_batches update own"
  on public.release_batches for update
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

create policy "release_batches delete own"
  on public.release_batches for delete
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.release_batches to authenticated;

alter table public.drops
  add column if not exists release_batch_id uuid references public.release_batches(id) on delete set null;

create index if not exists drops_release_batch_idx on public.drops (release_batch_id)
  where release_batch_id is not null;
