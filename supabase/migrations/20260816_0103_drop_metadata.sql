-- Release metadata — the fields a track needs to leave the building.
--
-- The Metadata Editor offers sixteen fields. Three of them already have a home:
-- title and album on `drops`, artist as `drops.credited_artist`. The other
-- thirteen had nowhere to live, so editing them looked like work and saved
-- nothing. This table is that home.
--
-- Deliberately does NOT duplicate title/artist/album. Two copies of a title is
-- two answers to one question, and the library already owns that answer.
--
-- Every column is text and nullable, because the correct value for an
-- identifier the artist does not have is empty. Nothing here is validated into
-- existence: a blank ISRC stays blank rather than becoming a plausible one.

set search_path = public, extensions;

create table if not exists public.drop_metadata (
  -- One row per track, so the drop's identity is the key.
  drop_id uuid primary key references public.drops(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,

  -- Ordering within a release.
  track_number text check (track_number is null or length(track_number) <= 12),
  year text check (year is null or length(year) <= 8),
  genre text check (genre is null or length(genre) <= 80),

  -- Identifiers. Unvalidated on purpose: a real code in an odd shape is more
  -- use to an artist than a rejection, and a format check would be the first
  -- step towards generating one.
  isrc text check (isrc is null or length(isrc) <= 24),
  upc text check (upc is null or length(upc) <= 24),
  catalog_number text check (catalog_number is null or length(catalog_number) <= 48),

  -- Rights.
  copyright text check (copyright is null or length(copyright) <= 200),
  publisher text check (publisher is null or length(publisher) <= 120),

  -- Credits. `release_credits` models these richly for release projects, but is
  -- bound to a project rather than a library track; these are the flat fields
  -- the editor writes per track.
  songwriter text check (songwriter is null or length(songwriter) <= 200),
  producer text check (producer is null or length(producer) <= 200),
  mixer text check (mixer is null or length(mixer) <= 200),
  mastering_engineer text check (mastering_engineer is null or length(mastering_engineer) <= 200),

  language text check (language is null or length(language) <= 24),

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists drop_metadata_owner_idx
  on public.drop_metadata (owner_id, updated_at desc);

alter table public.drop_metadata enable row level security;

-- Metadata is the artist's business and nobody else's. Unlike the drop it
-- describes, none of this is public even when the track is.
drop policy if exists "drop_metadata own" on public.drop_metadata;
create policy "drop_metadata own" on public.drop_metadata
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

grant select, insert, update, delete on public.drop_metadata to authenticated;

comment on table public.drop_metadata is
  'Release fields with no home on drops. Title, artist and album deliberately excluded — they live on drops. Owner-only, never public.';

-- ── Save ───────────────────────────────────────────────────────────────────
-- Upsert one track's fields. Ownership is checked against the drop rather than
-- trusted from the caller, so a client cannot write metadata onto someone
-- else's track by supplying its id.
create or replace function public.save_drop_metadata(
  p_drop uuid,
  p_track_number text default null,
  p_year text default null,
  p_genre text default null,
  p_isrc text default null,
  p_upc text default null,
  p_catalog_number text default null,
  p_copyright text default null,
  p_publisher text default null,
  p_songwriter text default null,
  p_producer text default null,
  p_mixer text default null,
  p_mastering_engineer text default null,
  p_language text default null
) returns void
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
begin
  select author_id into v_owner from public.drops where id = p_drop;
  if v_owner is null or v_owner <> auth.uid() then
    raise exception 'not your track';
  end if;

  insert into public.drop_metadata as m (
    drop_id, owner_id, track_number, year, genre, isrc, upc, catalog_number,
    copyright, publisher, songwriter, producer, mixer, mastering_engineer, language
  ) values (
    p_drop, v_owner, nullif(btrim(p_track_number), ''), nullif(btrim(p_year), ''),
    nullif(btrim(p_genre), ''), nullif(btrim(p_isrc), ''), nullif(btrim(p_upc), ''),
    nullif(btrim(p_catalog_number), ''), nullif(btrim(p_copyright), ''),
    nullif(btrim(p_publisher), ''), nullif(btrim(p_songwriter), ''),
    nullif(btrim(p_producer), ''), nullif(btrim(p_mixer), ''),
    nullif(btrim(p_mastering_engineer), ''), nullif(btrim(p_language), '')
  )
  on conflict (drop_id) do update set
    track_number = excluded.track_number,
    year = excluded.year,
    genre = excluded.genre,
    isrc = excluded.isrc,
    upc = excluded.upc,
    catalog_number = excluded.catalog_number,
    copyright = excluded.copyright,
    publisher = excluded.publisher,
    songwriter = excluded.songwriter,
    producer = excluded.producer,
    mixer = excluded.mixer,
    mastering_engineer = excluded.mastering_engineer,
    language = excluded.language,
    updated_at = now()
  where m.owner_id = auth.uid();
end;
$$;

grant execute on function public.save_drop_metadata(
  uuid, text, text, text, text, text, text, text, text, text, text, text, text, text
) to authenticated;

comment on function public.save_drop_metadata is
  'Upsert release metadata for one owned track. Blank strings are stored as null so an empty field stays empty.';

-- ── Album write-back ───────────────────────────────────────────────────────
-- `drops.album` has existed since 0058 but could only ever be set at insert, so
-- a track could not be moved into an album after upload.
create or replace function public.update_drop_album(p_drop uuid, p_album text)
returns boolean
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_owner uuid;
begin
  select author_id into v_owner from public.drops where id = p_drop;
  if v_owner is null or v_owner <> auth.uid() then
    return false;
  end if;
  update public.drops
     set album = nullif(btrim(p_album), '')
   where id = p_drop;
  return true;
end;
$$;

grant execute on function public.update_drop_album(uuid, text) to authenticated;
