-- ===========================================================================
-- Storage RLS hardening.
--
-- The `confessions` bucket is private (no public CDN); post media is served only
-- via short-lived signed URLs minted by the client/server. Two gaps remained in
-- the object policies:
--   1. SELECT applied to ALL roles (incl. anonymous/logged-out), so anyone could
--      mint a signed URL for any object without even a guest session.
--   2. INSERT was not scoped to the uploader's own folder, so a signed-in user
--      could write into another user's `{uid}/…` prefix.
-- The public `media-public` bucket (avatars/banners/room art) had the same loose
-- INSERT. We tighten all of it: reads stay shared where they must (the feed),
-- but writes/deletes are strictly owner-scoped, and anonymous read of private
-- post media is removed.
--
-- NOTE on the "RLS enabled, no policy" tables (app_secrets, email_codes,
-- webauthn_challenges, roulette_queue, confession_embeddings, user_affinities,
-- user_game_affinities): those are INTENTIONALLY deny-all to clients — every
-- access path goes through SECURITY DEFINER functions or the service role. Adding
-- client policies there would WEAKEN security, so they are deliberately left as
-- locked (the advisor flags them as INFO only).
-- ===========================================================================

-- Belt-and-braces: the private bucket must never be public.
update storage.buckets set public = false where id = 'confessions';

-- ── Confessions (PRIVATE: shared read for signed-in users, owner-scoped writes)
drop policy if exists "confession photos read"   on storage.objects;
drop policy if exists "confession photos insert" on storage.objects;
drop policy if exists "confession photos delete" on storage.objects;

-- Read: any signed-in user (the confession feed is shared) — never anonymous.
create policy "confession photos read"
  on storage.objects for select to authenticated
  using (bucket_id = 'confessions');

-- Insert: only into your own `{uid}/…` folder.
create policy "confession photos insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'confessions'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only objects you own.
create policy "confession photos delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'confessions' and owner = auth.uid());

-- ── Media-public (PUBLIC read, owner-scoped writes) ─────────────────────────
drop policy if exists "media-public read"   on storage.objects;
drop policy if exists "media-public insert" on storage.objects;
drop policy if exists "media-public delete" on storage.objects;

-- Read: public bucket — anyone may read (served via public CDN URLs).
create policy "media-public read"
  on storage.objects for select
  using (bucket_id = 'media-public');

-- Insert: only into your own `{uid}/…` folder.
create policy "media-public insert"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'media-public'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Delete: only objects you own.
create policy "media-public delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'media-public' and owner = auth.uid());
