-- VYBZ — switch resonance embeddings to Supabase's built-in gte-small (384-d),
-- free + server-side (no external provider). profile_embeddings is empty (no
-- vectors were ever computed under the prior provider), so re-dimension safely.
set search_path = public, extensions;
alter table public.profile_embeddings drop column if exists embedding;
alter table public.profile_embeddings add column embedding vector(384);
