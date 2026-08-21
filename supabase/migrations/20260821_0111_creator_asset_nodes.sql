-- Creator OS Asset Node metadata plane.
-- Additive sibling of `assets`. Does not rewrite `assets.url`.
-- Indexing is not publishing. Originals stay on the device.
-- No url. No local filesystem path. Bytes are never stored here.

set search_path = public, extensions;

create table if not exists public.creator_nodes (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(trim(name)) between 1 and 200),
  kind text not null default 'web' check (kind in ('web', 'desktop', 'android', 'ios')),
  availability text not null default 'local-only'
    check (availability in ('local-only', 'device-offline', 'available', 'shared', 'private')),
  file_count integer not null default 0 check (file_count >= 0),
  total_bytes bigint not null default 0 check (total_bytes >= 0),
  indexed_at timestamptz not null default now(),
  last_seen_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists creator_nodes_owner_idx
  on public.creator_nodes (owner_id, last_seen_at desc);

comment on table public.creator_nodes is
  'Authorized Asset Node on a creator device. Metadata only. Owner-only. Not a filesystem listing.';

create table if not exists public.indexed_assets (
  id uuid primary key,
  node_id uuid not null references public.creator_nodes(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  relative_path text not null check (char_length(relative_path) between 1 and 1000),
  name text not null check (char_length(name) between 1 and 400),
  mime text not null default 'application/octet-stream' check (char_length(mime) between 1 and 200),
  size_bytes bigint not null default 0 check (size_bytes >= 0),
  last_modified timestamptz,
  availability text not null default 'local-only'
    check (availability in ('local-only', 'device-offline', 'available', 'shared', 'private')),
  created_at timestamptz not null default now(),
  unique (node_id, relative_path)
);

create index if not exists indexed_assets_owner_idx
  on public.indexed_assets (owner_id, node_id);

create index if not exists indexed_assets_node_idx
  on public.indexed_assets (node_id);

comment on table public.indexed_assets is
  'Catalog of authorized local files. No url column — indexing is not publishing and originals stay on the device. Owner-only.';

alter table public.creator_nodes enable row level security;
alter table public.indexed_assets enable row level security;

drop policy if exists "creator_nodes own" on public.creator_nodes;
create policy "creator_nodes own" on public.creator_nodes
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

drop policy if exists "indexed_assets own" on public.indexed_assets;
create policy "indexed_assets own" on public.indexed_assets
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.creator_nodes to authenticated;
grant select, insert, update, delete on public.indexed_assets to authenticated;
revoke all on public.creator_nodes from anon, public;
revoke all on public.indexed_assets from anon, public;
