-- ===========================================================================
-- VYBZ Phase 2 — Prepare MVP: release projects, assets, findings
-- Up migration. Owner-only RLS. Additive; no DB reset.
-- Rollback: see sibling file 20260728_0081_release_projects.down.sql
-- ===========================================================================

set search_path = public, extensions;

-- ── release_projects ────────────────────────────────────────────────────────
create table if not exists public.release_projects (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  artist_name text,
  status text not null default 'draft'
    check (status in ('draft', 'scanning', 'ready', 'blocked', 'archived')),
  metadata jsonb not null default '{}'::jsonb,
  idempotency_key text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists release_projects_owner_idempotency_uidx
  on public.release_projects (owner_id, idempotency_key)
  where idempotency_key is not null and deleted_at is null;

create index if not exists release_projects_owner_idx
  on public.release_projects (owner_id)
  where deleted_at is null;

create index if not exists release_projects_updated_idx
  on public.release_projects (updated_at desc)
  where deleted_at is null;

alter table public.release_projects enable row level security;

drop policy if exists "release_projects select own" on public.release_projects;
create policy "release_projects select own"
  on public.release_projects for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "release_projects insert own" on public.release_projects;
create policy "release_projects insert own"
  on public.release_projects for insert to authenticated
  with check (owner_id = auth.uid());

drop policy if exists "release_projects update own" on public.release_projects;
create policy "release_projects update own"
  on public.release_projects for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "release_projects delete own" on public.release_projects;
create policy "release_projects delete own"
  on public.release_projects for delete to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.release_projects to authenticated;

-- ── release_assets ──────────────────────────────────────────────────────────
create table if not exists public.release_assets (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('audio', 'artwork')),
  file_name text not null,
  mime_type text not null default 'application/octet-stream',
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  checksum text,
  probe jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

create index if not exists release_assets_release_idx
  on public.release_assets (release_id);

create index if not exists release_assets_owner_idx
  on public.release_assets (owner_id);

alter table public.release_assets enable row level security;

drop policy if exists "release_assets select own" on public.release_assets;
create policy "release_assets select own"
  on public.release_assets for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "release_assets insert own" on public.release_assets;
create policy "release_assets insert own"
  on public.release_assets for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.release_projects rp
      where rp.id = release_id and rp.owner_id = auth.uid() and rp.deleted_at is null
    )
  );

drop policy if exists "release_assets update own" on public.release_assets;
create policy "release_assets update own"
  on public.release_assets for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "release_assets delete own" on public.release_assets;
create policy "release_assets delete own"
  on public.release_assets for delete to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.release_assets to authenticated;

-- ── release_findings ────────────────────────────────────────────────────────
create table if not exists public.release_findings (
  id uuid primary key default gen_random_uuid(),
  release_id uuid not null references public.release_projects(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid references public.release_assets(id) on delete set null,
  code text not null,
  severity text not null check (severity in ('blocking', 'warning', 'info')),
  category text not null check (category in ('audio', 'artwork', 'metadata', 'package')),
  title text not null,
  detail text not null default '',
  status text not null default 'open'
    check (status in ('open', 'resolved', 'dismissed')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists release_findings_release_idx
  on public.release_findings (release_id);

create index if not exists release_findings_owner_idx
  on public.release_findings (owner_id);

create index if not exists release_findings_severity_idx
  on public.release_findings (release_id, severity)
  where status = 'open';

alter table public.release_findings enable row level security;

drop policy if exists "release_findings select own" on public.release_findings;
create policy "release_findings select own"
  on public.release_findings for select to authenticated
  using (owner_id = auth.uid());

drop policy if exists "release_findings insert own" on public.release_findings;
create policy "release_findings insert own"
  on public.release_findings for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (
      select 1 from public.release_projects rp
      where rp.id = release_id and rp.owner_id = auth.uid() and rp.deleted_at is null
    )
  );

drop policy if exists "release_findings update own" on public.release_findings;
create policy "release_findings update own"
  on public.release_findings for update to authenticated
  using (owner_id = auth.uid())
  with check (owner_id = auth.uid());

drop policy if exists "release_findings delete own" on public.release_findings;
create policy "release_findings delete own"
  on public.release_findings for delete to authenticated
  using (owner_id = auth.uid());

grant select, insert, update, delete on public.release_findings to authenticated;

-- Touch updated_at on release_projects
create or replace function public.release_projects_set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists release_projects_updated_at on public.release_projects;
create trigger release_projects_updated_at
  before update on public.release_projects
  for each row execute function public.release_projects_set_updated_at();
