-- Revert step 3: restore the open read policy measured on 2026-08-15.
--
-- This reopens the hole (any authenticated user can read any object in
-- `audio-assets`). Use only to restore playback if locking is found to break a
-- path that was missed, and re-apply the lock once that path routes through
-- `audio-play`.

drop policy if exists "audio-assets read" on storage.objects;

create policy "audio-assets read"
  on storage.objects
  for select
  to authenticated
  using (bucket_id = 'audio-assets');
