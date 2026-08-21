-- Reverse 0111. Drops Asset Node metadata only. Does not touch `assets`.

set search_path = public, extensions;

drop policy if exists "indexed_assets own" on public.indexed_assets;
drop policy if exists "creator_nodes own" on public.creator_nodes;
drop index if exists public.indexed_assets_node_idx;
drop index if exists public.indexed_assets_owner_idx;
drop index if exists public.creator_nodes_owner_idx;
drop table if exists public.indexed_assets;
drop table if exists public.creator_nodes;
