-- ===========================================================================
-- VYBZ — Drop album + release type (Original / Remix / …) for card metadata.
-- ===========================================================================

set search_path = public, extensions;

alter table public.drops
  add column if not exists album text;

alter table public.drops
  add column if not exists release_type text;

do $$
begin
  if not exists (
    select 1 from pg_constraint where conname = 'drops_release_type_check'
  ) then
    alter table public.drops
      add constraint drops_release_type_check
      check (
        release_type is null
        or release_type in (
          'original', 'remix', 'cover', 'edit', 'mashup',
          'live', 'instrumental', 'bootleg'
        )
      );
  end if;
end $$;

comment on column public.drops.album is 'Album / EP name; null or empty → display as Single';
comment on column public.drops.release_type is 'Musical release flavor: original, remix, cover, …';
