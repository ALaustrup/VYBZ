-- Private-by-default playback, step 3 of 4.
--
-- DO NOT APPLY THIS UNTIL STEP 2 IS LIVE IN PRODUCTION AND VERIFIED.
--
-- Step 2 (client routes all playback through audio-play tickets) must be deployed
-- first. The previously deployed client signs `audio-assets` objects directly with
-- the anon key; locking the bucket while that client is live breaks playback of
-- every track a listener does not own, immediately, for everyone.
--
-- Order: merge + deploy step 2 → confirm audio plays on vybz.cloud → apply this.
--
-- Measured on 2026-08-15, the policy being replaced is:
--   policyname: "audio-assets read"
--   cmd:        SELECT
--   roles:      {authenticated}
--   using:      (bucket_id = 'audio-assets'::text)
--
-- That grants every signed-in user read on every object in the bucket, with no
-- reference to who owns it or to the audience of the drop it belongs to. Combined
-- with `assets` SELECT exposing the storage path, marking a track private hides the
-- row and leaves the file fetchable. This closes that.
--
-- After this, the only readers of a non-owned object are service-role callers:
--   * `audio-play`  — checks can_user_play_path, then signs or streams
--   * `watermark`   — checks the download grant, then embeds and delivers
-- Both bypass RLS by design, so playback and downloads keep working.
--
-- Known consequence: the client-side fallback in downloadAsset() (api.ts) can only
-- sign your own files after this. The primary download path is the `watermark`
-- function, which is service role, so the fallback is reached only when that
-- function is unreachable. Non-owners then get no download rather than a wrong one.

drop policy if exists "audio-assets read" on storage.objects;

create policy "audio-assets read"
  on storage.objects
  for select
  to authenticated
  using (
    bucket_id = 'audio-assets'
    -- Object paths are `{uid}/…`, enforced by the matching insert policy.
    and (storage.foldername(name))[1] = (auth.uid())::text
  );
