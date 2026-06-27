-- Media limits: allow high-resolution (up to 8K) photos and video in the
-- private `confessions` post bucket.
--
-- IMPORTANT: the effective per-file ceiling is min(project global upload limit,
-- bucket file_size_limit). This migration raises the BUCKET limit; the PROJECT
-- global upload limit is a dashboard setting (Storage → Settings → "Upload file
-- size limit") that SQL cannot change. On the Free plan the global cap is 50 MB,
-- so true large/8K *video* requires raising that limit (Pro plan). 8K *stills*
-- are transcoded to WebP client-side and comfortably fit under 50 MB already.

-- Raise the confessions bucket ceiling to 512 MB to mirror the client guard
-- (src/lib/media.ts MAX_VIDEO_BYTES). Leave allowed_mime_types unrestricted so
-- any image/* or video/* the device produces is accepted.
update storage.buckets
  set file_size_limit = 536870912,      -- 512 MiB
      allowed_mime_types = null         -- allow all image/video types
  where id = 'confessions';

-- Keep the public cosmetic/chat bucket modest (avatars, banners, chat images).
update storage.buckets
  set file_size_limit = 52428800        -- 50 MiB
  where id = 'media-public';
