-- Phase 9: relative paths on indexed_assets must stay inside the authorized folder.
-- Does not add url or a filesystem path column.

set search_path = public, extensions;

alter table public.indexed_assets
  drop constraint if exists indexed_assets_relative_path_confined;

alter table public.indexed_assets
  add constraint indexed_assets_relative_path_confined
  check (
    relative_path !~ '(^|/)\.\.(/|$)'
    and relative_path !~ '(^|/)\.(/|$)'
    and relative_path not like '/%'
  );

comment on constraint indexed_assets_relative_path_confined on public.indexed_assets is
  'Catalog paths stay relative to the authorized folder. Not a filesystem listing.';
