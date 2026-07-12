-- VYBZ — the embed Edge Function dedups re-embeds via a content hash. Add the
-- column it upserts (idempotent).
set search_path = public, extensions;
alter table public.profile_embeddings add column if not exists content_hash text;
