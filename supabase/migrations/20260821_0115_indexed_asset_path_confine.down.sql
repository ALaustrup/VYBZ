set search_path = public, extensions;

alter table public.indexed_assets
  drop constraint if exists indexed_assets_relative_path_confined;
