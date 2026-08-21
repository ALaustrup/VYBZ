-- Phase 8: honest mobile availability.
-- session-only = readable while the app is open. unavailable = indexed, bytes not here.
-- Does not add a url column or a filesystem path column. Indexing is still not publishing.

set search_path = public, extensions;

do $$
declare r record;
begin
  for r in
    select c.conrelid::regclass as tbl, c.conname
    from pg_constraint c
    join pg_attribute a on a.attrelid = c.conrelid and a.attnum = any (c.conkey)
    where c.contype = 'c'
      and c.conrelid in ('public.creator_nodes'::regclass, 'public.indexed_assets'::regclass)
      and a.attname = 'availability'
  loop
    execute format('alter table %s drop constraint %I', r.tbl, r.conname);
  end loop;
end $$;

alter table public.creator_nodes
  add constraint creator_nodes_availability_check
  check (availability in (
    'local-only', 'session-only', 'device-offline', 'unavailable', 'available', 'shared', 'private'
  ));

alter table public.indexed_assets
  add constraint indexed_assets_availability_check
  check (availability in (
    'local-only', 'session-only', 'device-offline', 'unavailable', 'available', 'shared', 'private'
  ));

comment on column public.creator_nodes.availability is
  'Honest reachability. session-only is not a background host. No file bytes in this table.';
