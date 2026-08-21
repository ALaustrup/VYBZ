-- Reverts Phase 8 availability values. Rows using session-only / unavailable must be cleared first.

set search_path = public, extensions;

alter table public.creator_nodes drop constraint if exists creator_nodes_availability_check;
alter table public.indexed_assets drop constraint if exists indexed_assets_availability_check;

alter table public.creator_nodes
  add constraint creator_nodes_availability_check
  check (availability in ('local-only', 'device-offline', 'available', 'shared', 'private'));

alter table public.indexed_assets
  add constraint indexed_assets_availability_check
  check (availability in ('local-only', 'device-offline', 'available', 'shared', 'private'));
