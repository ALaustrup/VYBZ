-- Raise private audio bucket limit for drop masters (was 100MB).
-- Bunny CDN is no longer the primary drop backend; Supabase Storage is.
update storage.buckets
set file_size_limit = 524288000
where id = 'audio-assets';
