-- ===========================================================================
-- VYBZ Phase 3 — the sound-first feed: assets, ratings, downloads, buckets.
--
--   • public.assets (§8.1) — uploaded audio/project material. Previews stream
--     in-feed; project/preset bundles are exchange-grade and owner-gated.
--   • P2P swarm columns (§8.6) are designed in NOW (nullable) so the encrypted-
--     chunk distribution layer in Phase 8 is purely additive — no re-upload
--     migration is ever needed. Peers will forward opaque encrypted chunks; the
--     content-key envelope is delivered only via a permission-checked RPC.
--   • public.track_ratings (§6.3) — one 1..5 star rating per user per asset,
--     revisable; a trigger caches avg + count on the asset (mirrors the veil
--     tally pattern).
--   • public.asset_downloads (§8.1) — an auditable record of every full-quality
--     grant (who / what / when / license), the seed of the §8.7 license chain.
--   • storage buckets audio-previews (public), audio-assets + project-files
--     (private) with owner-scoped RLS mirroring the confessions bucket.
--   • confessions.asset_id (§6.1) links a drop to its asset.
--
-- Everything is additive + idempotent (create ... if not exists / or replace).
-- ===========================================================================

-- ── 1. assets ───────────────────────────────────────────────────────────────
create table if not exists public.assets (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles(id) on delete cascade,
  kind         text not null check (kind in
                 ('sample','loop','oneshot','stem','acapella','midi','preset','project','track')),
  title        text not null,
  description  text,
  url          text not null,                    -- storage path (never a public URL)
  waveform     jsonb,                             -- precomputed peaks for instant preview
  bpm          numeric,
  musical_key  text,
  genres       text[] not null default '{}',
  daw          text references public.daws(id),   -- for 'project'/'preset'
  format       text,                              -- 'WAV','MP3','FLAC','ZIP',…
  sample_rate  integer,
  lossless     boolean not null default false,
  duration_sec numeric,
  size_bytes   bigint,
  downloadable boolean not null default true,     -- exchange vs preview-only
  license      text not null default 'collab-only'
                 check (license in ('collab-only','credit-required','free')),
  nsfw         boolean not null default false,
  -- Cached rating aggregate (§6.3), refreshed by trigger.
  rating_avg   numeric not null default 0,
  rating_count integer not null default 0,
  -- ── P2P swarm manifest (§8.6) — designed in now, populated in Phase 8. ─────
  cipher_algo        text not null default 'AES-GCM',
  chunk_size         integer,                     -- fixed chunk size (bytes)
  chunk_hashes       text[],                      -- ordered ciphertext content hashes
  content_key_envelope jsonb,                     -- encrypted content key (RPC-delivered only)
  -- ── Provenance / anti-piracy (§8.7) — designed in now, populated in Phase 7.
  sha256       text,                              -- cryptographic hash of the original
  fingerprint  text,                              -- perceptual audio fingerprint
  created_at   timestamptz not null default now()
);
create index if not exists assets_owner_idx   on public.assets(owner_id);
create index if not exists assets_kind_idx     on public.assets(kind);
create index if not exists assets_created_idx  on public.assets(created_at desc);

alter table public.assets enable row level security;
do $$
begin
  -- Read: preview-grade material is public to the feed; project/preset bundles
  -- are owner-only until a collaborator grant exists (Phase 5).
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assets' and policyname='assets read') then
    create policy "assets read" on public.assets for select
      using (
        kind in ('sample','loop','oneshot','stem','acapella','track')
        or owner_id = auth.uid()
      );
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assets' and policyname='assets insert') then
    create policy "assets insert" on public.assets for insert
      with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assets' and policyname='assets modify') then
    create policy "assets modify" on public.assets for update
      using (owner_id = auth.uid()) with check (owner_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='assets' and policyname='assets delete') then
    create policy "assets delete" on public.assets for delete
      using (owner_id = auth.uid());
  end if;
end $$;

-- ── 2. Link a drop to its asset (§6.1) ───────────────────────────────────────
alter table public.confessions
  add column if not exists asset_id uuid references public.assets(id) on delete set null;
create index if not exists confessions_asset_idx on public.confessions(asset_id);

-- ── 3. track_ratings (§6.3) ──────────────────────────────────────────────────
create table if not exists public.track_ratings (
  asset_id   uuid not null references public.assets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  rating     smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
create index if not exists track_ratings_asset_idx on public.track_ratings(asset_id);
alter table public.track_ratings enable row level security;
-- No direct client policies: ratings flow through the rate_track RPC (definer),
-- so who-rated-what is never client-readable — only the cached aggregate is.

-- Refresh the cached aggregate on any rating change (mirrors the veil tally).
create or replace function public.refresh_asset_rating()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare aid uuid := coalesce(new.asset_id, old.asset_id);
begin
  update public.assets a set
    rating_count = (select count(*) from public.track_ratings r where r.asset_id = aid),
    rating_avg   = coalesce((select avg(r.rating) from public.track_ratings r where r.asset_id = aid), 0)
  where a.id = aid;
  return null;
end $fn$;

drop trigger if exists track_ratings_agg on public.track_ratings;
create trigger track_ratings_agg
  after insert or update or delete on public.track_ratings
  for each row execute function public.refresh_asset_rating();

-- ── 4. asset_downloads (§8.1 / §8.7 license chain) ───────────────────────────
create table if not exists public.asset_downloads (
  asset_id   uuid not null references public.assets(id) on delete cascade,
  user_id    uuid not null references public.profiles(id) on delete cascade,
  license    text not null,                       -- license accepted at grant time
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
alter table public.asset_downloads enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='asset_downloads' and policyname='downloads read own') then
    create policy "downloads read own" on public.asset_downloads for select
      using (user_id = auth.uid());
  end if;
end $$;

-- ── 5. RPCs ───────────────────────────────────────────────────────────────────
-- Rate a drop's linked asset (§6.3). Definer resolves the asset from the
-- confession, upserts the caller's rating, and the trigger refreshes the agg.
create or replace function public.rate_track(p_confession uuid, p_rating int)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); aid uuid;
begin
  if uid is null then return; end if;
  select asset_id into aid from public.confessions where id = p_confession;
  if aid is null then return; end if;
  insert into public.track_ratings (asset_id, user_id, rating)
  values (aid, uid, least(5, greatest(1, p_rating))::smallint)
  on conflict (asset_id, user_id) do update set rating = excluded.rating, created_at = now();
end $fn$;
grant execute on function public.rate_track(uuid, int) to authenticated;

-- Request a full-quality download (§8.1 / §8.7): permission + license gate, then
-- record the grant. Returns the storage path to sign; null if not permitted.
-- (Preview streaming never uses this — only exchange-grade retrieval does.)
create or replace function public.request_asset_download(p_asset uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); a public.assets%rowtype;
begin
  if uid is null then return null; end if;
  select * into a from public.assets where id = p_asset;
  if a.id is null or not a.downloadable then return null; end if;
  -- collab-only / credit-required / free are all grantable to signed-in users in
  -- alpha; project/preset bundles remain owner-only until collaborator grants
  -- (Phase 5). Record the license accepted at this moment (the license chain).
  if a.kind in ('project','preset') and a.owner_id <> uid then return null; end if;
  insert into public.asset_downloads (asset_id, user_id, license)
  values (a.id, uid, a.license)
  on conflict (asset_id, user_id) do update set created_at = now(), license = excluded.license;
  return a.url;
end $fn$;
grant execute on function public.request_asset_download(uuid) to authenticated;

-- ── 6. Storage buckets (§8.2) ─────────────────────────────────────────────────
insert into storage.buckets (id, name, public)
values ('audio-previews', 'audio-previews', true)
on conflict (id) do update set public = true;

insert into storage.buckets (id, name, public)
values ('audio-assets', 'audio-assets', false)
on conflict (id) do update set public = false;

insert into storage.buckets (id, name, public)
values ('project-files', 'project-files', false)
on conflict (id) do update set public = false;

-- audio-previews (PUBLIC read, owner-scoped writes).
drop policy if exists "audio-previews read"   on storage.objects;
drop policy if exists "audio-previews insert" on storage.objects;
drop policy if exists "audio-previews delete" on storage.objects;
create policy "audio-previews read" on storage.objects for select
  using (bucket_id = 'audio-previews');
create policy "audio-previews insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio-previews' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio-previews delete" on storage.objects for delete to authenticated
  using (bucket_id = 'audio-previews' and owner = auth.uid());

-- audio-assets (PRIVATE: shared read for signed-in users — the exchange feed —
-- owner-scoped writes; full-quality retrieval flows through signed URLs).
drop policy if exists "audio-assets read"   on storage.objects;
drop policy if exists "audio-assets insert" on storage.objects;
drop policy if exists "audio-assets delete" on storage.objects;
create policy "audio-assets read" on storage.objects for select to authenticated
  using (bucket_id = 'audio-assets');
create policy "audio-assets insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'audio-assets' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "audio-assets delete" on storage.objects for delete to authenticated
  using (bucket_id = 'audio-assets' and owner = auth.uid());

-- project-files (PRIVATE: owner-only read + write until collaborator grants,
-- Phase 5). Exchange-grade DAW bundles never leave a permission check.
drop policy if exists "project-files read"   on storage.objects;
drop policy if exists "project-files insert" on storage.objects;
drop policy if exists "project-files delete" on storage.objects;
create policy "project-files read" on storage.objects for select to authenticated
  using (bucket_id = 'project-files' and owner = auth.uid());
create policy "project-files insert" on storage.objects for insert to authenticated
  with check (bucket_id = 'project-files' and (storage.foldername(name))[1] = auth.uid()::text);
create policy "project-files delete" on storage.objects for delete to authenticated
  using (bucket_id = 'project-files' and owner = auth.uid());
