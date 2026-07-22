-- ===========================================================================
-- VYBZ Phase 2 — Official Artist Profiles (linked entities, model 1A).
-- One login owns/claims /artist/:slug. Creation requires ≥2 owned drops
-- tagged with the same credited_artist name (ownership evidence).
-- ===========================================================================

set search_path = public, extensions;

-- Tag drops with a band/artist credit (free-text) + optional linked entity.
alter table public.drops
  add column if not exists credited_artist text;

create table if not exists public.artist_profiles (
  id uuid primary key default gen_random_uuid(),
  slug text not null,
  display_name text not null,
  bio text,
  avatar_url text,
  cover_url text,
  primary_genres text[] not null default '{}',
  verified_at timestamptz,
  created_by uuid not null references public.profiles(id) on delete restrict,
  created_at timestamptz not null default now(),
  constraint artist_profiles_slug_format check (
    slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'
    and char_length(slug) between 2 and 40
  ),
  constraint artist_profiles_slug_unique unique (slug)
);

create index if not exists artist_profiles_created_by_idx on public.artist_profiles (created_by);
create index if not exists artist_profiles_slug_idx on public.artist_profiles (slug);

create table if not exists public.artist_members (
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member'
    check (role in ('owner', 'member', 'manager')),
  created_at timestamptz not null default now(),
  primary key (artist_id, user_id)
);

create index if not exists artist_members_user_idx on public.artist_members (user_id);

create table if not exists public.artist_claims (
  id uuid primary key default gen_random_uuid(),
  artist_id uuid not null references public.artist_profiles(id) on delete cascade,
  drop_id uuid not null references public.drops(id) on delete cascade,
  status text not null default 'accepted'
    check (status in ('pending', 'accepted', 'rejected')),
  created_at timestamptz not null default now(),
  constraint artist_claims_drop_unique unique (drop_id)
);

create index if not exists artist_claims_artist_idx on public.artist_claims (artist_id);

alter table public.drops
  add column if not exists artist_id uuid references public.artist_profiles(id) on delete set null;

create index if not exists drops_artist_id_idx on public.drops (artist_id);
create index if not exists drops_credited_artist_idx on public.drops (lower(trim(credited_artist)));

alter table public.artist_profiles enable row level security;
alter table public.artist_members enable row level security;
alter table public.artist_claims enable row level security;

drop policy if exists "artist_profiles read" on public.artist_profiles;
create policy "artist_profiles read" on public.artist_profiles
  for select using (true);

drop policy if exists "artist_profiles update members" on public.artist_profiles;
create policy "artist_profiles update members" on public.artist_profiles
  for update using (
    exists (
      select 1 from public.artist_members m
      where m.artist_id = id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

drop policy if exists "artist_members read" on public.artist_members;
create policy "artist_members read" on public.artist_members
  for select using (true);

drop policy if exists "artist_members write owners" on public.artist_members;
create policy "artist_members write owners" on public.artist_members
  for all using (
    exists (
      select 1 from public.artist_members m
      where m.artist_id = artist_members.artist_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  ) with check (
    exists (
      select 1 from public.artist_members m
      where m.artist_id = artist_members.artist_id
        and m.user_id = auth.uid()
        and m.role = 'owner'
    )
  );

drop policy if exists "artist_claims read" on public.artist_claims;
create policy "artist_claims read" on public.artist_claims
  for select using (true);

drop policy if exists "artist_claims write owners" on public.artist_claims;
create policy "artist_claims write owners" on public.artist_claims
  for all using (
    exists (
      select 1 from public.artist_members m
      where m.artist_id = artist_claims.artist_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  ) with check (
    exists (
      select 1 from public.artist_members m
      where m.artist_id = artist_claims.artist_id
        and m.user_id = auth.uid()
        and m.role in ('owner', 'manager')
    )
  );

grant select on public.artist_profiles to anon, authenticated;
grant select, update on public.artist_profiles to authenticated;
grant select on public.artist_members to anon, authenticated;
grant select, insert, update, delete on public.artist_members to authenticated;
grant select on public.artist_claims to anon, authenticated;
grant select, insert, update, delete on public.artist_claims to authenticated;

create or replace function public.normalize_artist_slug(p_slug text)
returns text language sql immutable as $fn$
  select nullif(
    trim(both '-' from regexp_replace(
      lower(trim(coalesce(p_slug, ''))),
      '[^a-z0-9]+', '-', 'g'
    )),
    ''
  );
$fn$;

create or replace function public.artist_slug_available(p_slug text)
returns boolean
language sql
stable
security definer
set search_path = public
as $fn$
  select
    public.normalize_artist_slug(p_slug) is not null
    and length(public.normalize_artist_slug(p_slug)) between 2 and 40
    and not exists (
      select 1 from public.artist_profiles a
      where a.slug = public.normalize_artist_slug(p_slug)
    );
$fn$;
grant execute on function public.artist_slug_available(text) to anon, authenticated;

-- Create official artist after proving ≥2 owned drops tagged with the name.
create or replace function public.create_artist_profile(
  p_slug text,
  p_display_name text,
  p_bio text default null,
  p_genres text[] default '{}',
  p_drop_ids uuid[] default '{}'
)
returns public.artist_profiles
language plpgsql
security definer
set search_path = public
as $fn$
declare
  v_uid uuid := auth.uid();
  v_slug text := public.normalize_artist_slug(p_slug);
  v_name text := trim(coalesce(p_display_name, ''));
  v_artist public.artist_profiles;
  v_count int;
begin
  if v_uid is null then
    raise exception 'not authenticated';
  end if;
  if v_name = '' or char_length(v_name) < 2 then
    raise exception 'display_name required';
  end if;
  if v_slug is null or char_length(v_slug) < 2 or char_length(v_slug) > 40 then
    raise exception 'invalid slug';
  end if;
  if not public.artist_slug_available(v_slug) then
    raise exception 'slug taken';
  end if;
  if p_drop_ids is null or coalesce(array_length(p_drop_ids, 1), 0) < 2 then
    raise exception 'need_two_tagged_drops';
  end if;

  select count(*)::int into v_count
  from public.drops d
  where d.id = any(p_drop_ids)
    and d.author_id = v_uid
    and lower(trim(coalesce(d.credited_artist, ''))) = lower(v_name);

  if v_count < 2 then
    raise exception 'need_two_tagged_drops';
  end if;

  insert into public.artist_profiles (
    slug, display_name, bio, primary_genres, verified_at, created_by
  ) values (
    v_slug, v_name, nullif(trim(coalesce(p_bio, '')), ''),
    coalesce(p_genres, '{}'), now(), v_uid
  )
  returning * into v_artist;

  insert into public.artist_members (artist_id, user_id, role)
  values (v_artist.id, v_uid, 'owner');

  insert into public.artist_claims (artist_id, drop_id, status)
  select v_artist.id, d.id, 'accepted'
  from public.drops d
  where d.id = any(p_drop_ids)
    and d.author_id = v_uid
    and lower(trim(coalesce(d.credited_artist, ''))) = lower(v_name)
  on conflict (drop_id) do nothing;

  update public.drops d
  set artist_id = v_artist.id
  where d.id = any(p_drop_ids)
    and d.author_id = v_uid
    and lower(trim(coalesce(d.credited_artist, ''))) = lower(v_name);

  return v_artist;
end;
$fn$;
grant execute on function public.create_artist_profile(text, text, text, text[], uuid[]) to authenticated;

create or replace function public.artists_for_user(p_user_id uuid)
returns setof public.artist_profiles
language sql
stable
security definer
set search_path = public
as $fn$
  select a.*
  from public.artist_profiles a
  join public.artist_members m on m.artist_id = a.id
  where m.user_id = p_user_id
  order by a.created_at desc;
$fn$;
grant execute on function public.artists_for_user(uuid) to anon, authenticated;

create or replace function public.get_artist_by_slug(p_slug text)
returns public.artist_profiles
language sql
stable
security definer
set search_path = public
as $fn$
  select a.*
  from public.artist_profiles a
  where a.slug = public.normalize_artist_slug(p_slug)
  limit 1;
$fn$;
grant execute on function public.get_artist_by_slug(text) to anon, authenticated;
