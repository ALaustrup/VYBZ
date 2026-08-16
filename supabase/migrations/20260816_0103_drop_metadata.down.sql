-- Reverse 0103. Drops the metadata table and both functions.
--
-- `drops.album` predates this migration and is left alone; only the write-back
-- function added here goes away.

set search_path = public, extensions;

drop function if exists public.update_drop_album(uuid, text);

drop function if exists public.save_drop_metadata(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text
);

drop policy if exists "drop_metadata own" on public.drop_metadata;
drop index if exists public.drop_metadata_owner_idx;
drop table if exists public.drop_metadata;
