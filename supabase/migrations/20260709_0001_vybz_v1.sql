-- ===========================================================================
-- VYBZ v1 — clean, identity-first schema (fresh start; no MYVYB inheritance).
--
-- VYBZ is a creator-identity platform for finding music collaborators and
-- exchanging samples/stems/projects. There is NO anonymity: every account is a
-- real, durable identity (email + passkey). This schema is written from scratch
-- for VYBZ — it deliberately does not carry over confessions, dating, lifelines,
-- roulette, companions, echoes, NSFW, games, or any other inherited concept.
-- ===========================================================================

set search_path = public, extensions;

-- ── Identity: profiles ───────────────────────────────────────────────────────
create table public.profiles (
  id              uuid primary key references auth.users(id) on delete cascade,
  username        text,
  display_name    text,
  avatar_url      text,
  bio             text,
  location        text,
  music_url       text,
  identity_public boolean not null default true,
  is_admin        boolean not null default false,
  banned          boolean not null default false,
  -- Owner-editable music facets + privacy: genres, daws, plugins, influences,
  -- tempoMin/Max, keys, lookingFor, openToWork, remoteOk, prompts, traits,
  -- languages, plus a `_hidden` array marking keys kept private.
  profile         jsonb not null default '{}'::jsonb,
  created_at      timestamptz not null default now(),
  last_active_at  timestamptz not null default now()
);
create unique index profiles_username_lower_idx on public.profiles (lower(username)) where username is not null;
create index profiles_profile_gin on public.profiles using gin (profile);

alter table public.profiles enable row level security;
-- The full row (incl. private facets) is readable only by its owner. Everyone
-- else views a sanitized projection via the public_profiles view / RPC below.
create policy "profiles select own" on public.profiles for select using (id = auth.uid());
create policy "profiles insert own" on public.profiles for insert with check (id = auth.uid());
create policy "profiles update own" on public.profiles for update using (id = auth.uid()) with check (id = auth.uid());

-- Safe, world-readable projection for joins + browsing (no private jsonb).
create view public.public_profiles
  with (security_invoker = off) as
  select id, username, display_name, avatar_url, location, identity_public, banned, created_at
  from public.profiles;
grant select on public.public_profiles to anon, authenticated;

-- Auto-create a profile row when a new auth user signs up.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  insert into public.profiles (id) values (new.id) on conflict (id) do nothing;
  return new;
end $fn$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- Sanitized public profile for the profile page (strips `_hidden` facets).
create or replace function public.public_profile(p_id uuid)
returns table(
  id uuid, username text, display_name text, avatar_url text, bio text,
  location text, music_url text, profile jsonb, created_at timestamptz
)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.location, p.music_url,
    ( select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
      from jsonb_each(coalesce(p.profile, '{}'::jsonb)) as e(k, v)
      where k <> '_hidden'
        and not (coalesce(p.profile->'_hidden', '[]'::jsonb) ? k) ) as profile,
    p.created_at
  from public.profiles p
  where p.id = p_id and coalesce(p.banned, false) = false;
$fn$;
grant execute on function public.public_profile(uuid) to anon, authenticated;

-- ── Controlled vocabularies (taxonomy) ───────────────────────────────────────
create table public.roles  (id text primary key, label text not null, family text not null, sort int not null default 0);
create table public.genres (id text primary key, label text not null, sort int not null default 0);
create table public.daws   (id text primary key, label text not null, project_ext text, sort int not null default 0);
create table public.plugins (
  id text primary key, label text not null, vendor text, category text,
  formats text[] default '{}', verified boolean not null default false,
  created_at timestamptz not null default now()
);
create index plugins_category_idx on public.plugins(category);
create index plugins_label_trgm on public.plugins using gin (label gin_trgm_ops);

alter table public.roles   enable row level security;
alter table public.genres  enable row level security;
alter table public.daws    enable row level security;
alter table public.plugins enable row level security;
create policy "roles read"   on public.roles   for select using (true);
create policy "genres read"  on public.genres  for select using (true);
create policy "daws read"    on public.daws    for select using (true);
create policy "plugins read" on public.plugins for select using (true);
grant select on public.roles, public.genres, public.daws, public.plugins to anon, authenticated;

-- ── Bipartite core: what a creator OFFERS + SEEKS ────────────────────────────
create table public.creator_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  skill smallint not null default 3 check (skill between 1 and 5),
  primary key (user_id, role_id)
);
create index creator_roles_role_idx on public.creator_roles(role_id);
create table public.creator_seeks (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  priority smallint not null default 1 check (priority between 1 and 3),
  primary key (user_id, role_id)
);
create index creator_seeks_role_idx on public.creator_seeks(role_id);
alter table public.creator_roles enable row level security;
alter table public.creator_seeks enable row level security;
-- Reached only through the definer RPCs below.

-- ── Semantic resonance embeddings (written server-side only) ─────────────────
create table public.profile_embeddings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  embedding vector(1536),
  updated_at timestamptz not null default now()
);
alter table public.profile_embeddings enable row level security;

-- ── Assets (uploaded audio/project material) + P2P swarm manifest (future) ───
create table public.assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in
    ('sample','loop','oneshot','stem','acapella','midi','preset','project','track')),
  title text not null, description text,
  url text not null, waveform jsonb,
  bpm numeric, musical_key text, genres text[] not null default '{}',
  daw text references public.daws(id), format text, sample_rate integer,
  lossless boolean not null default false, duration_sec numeric, size_bytes bigint,
  downloadable boolean not null default true,
  license text not null default 'collab-only' check (license in ('collab-only','credit-required','free')),
  rating_avg numeric not null default 0, rating_count integer not null default 0,
  cipher_algo text not null default 'AES-GCM', chunk_size integer,
  chunk_hashes text[], content_key_envelope jsonb, sha256 text, fingerprint text,
  created_at timestamptz not null default now()
);
create index assets_owner_idx on public.assets(owner_id);
alter table public.assets enable row level security;
create policy "assets read" on public.assets for select
  using (kind in ('sample','loop','oneshot','stem','acapella','track') or owner_id = auth.uid());
create policy "assets insert" on public.assets for insert with check (owner_id = auth.uid());
create policy "assets update" on public.assets for update using (owner_id = auth.uid()) with check (owner_id = auth.uid());
create policy "assets delete" on public.assets for delete using (owner_id = auth.uid());

create table public.track_ratings (
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating smallint not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
alter table public.track_ratings enable row level security;

create table public.asset_downloads (
  asset_id uuid not null references public.assets(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  license text, created_at timestamptz not null default now(),
  primary key (asset_id, user_id)
);
alter table public.asset_downloads enable row level security;
create policy "downloads read own" on public.asset_downloads for select using (user_id = auth.uid());

-- ── Drops (the sound-first feed post) + reactions (taste signal) ─────────────
create table public.drops (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  title text, body text,
  asset_id uuid references public.assets(id) on delete set null,
  seed int not null default 0,
  feels int not null default 0, wilds int not null default 0,
  created_at timestamptz not null default now()
);
create index drops_author_idx on public.drops(author_id);
create index drops_created_idx on public.drops(created_at desc);
alter table public.drops enable row level security;
create policy "drops read" on public.drops for select using (true);
create policy "drops insert own" on public.drops for insert with check (author_id = auth.uid());
create policy "drops update own" on public.drops for update using (author_id = auth.uid()) with check (author_id = auth.uid());
create policy "drops delete own" on public.drops for delete using (author_id = auth.uid());
grant select, insert, update, delete on public.drops to authenticated;
grant select on public.drops to anon;

create table public.reactions (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  reaction text not null check (reaction in ('feel','wild')),
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);
alter table public.reactions enable row level security;
create policy "reactions read" on public.reactions for select using (true);
create policy "reactions write own" on public.reactions for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.reactions to authenticated;

-- Tally feels/wilds onto the drop (mirrors the classic reaction-tally pattern).
create or replace function public.tally_reaction()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare did uuid := coalesce(new.drop_id, old.drop_id);
begin
  update public.drops d set
    feels = (select count(*) from public.reactions r where r.drop_id = did and r.reaction = 'feel'),
    wilds = (select count(*) from public.reactions r where r.drop_id = did and r.reaction = 'wild')
  where d.id = did;
  return null;
end $fn$;
create trigger reactions_tally after insert or update or delete on public.reactions
  for each row execute function public.tally_reaction();

-- Refresh cached rating aggregate on the asset.
create or replace function public.refresh_asset_rating()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare aid uuid := coalesce(new.asset_id, old.asset_id);
begin
  update public.assets a set
    rating_count = (select count(*) from public.track_ratings r where r.asset_id = aid),
    rating_avg = coalesce((select avg(r.rating) from public.track_ratings r where r.asset_id = aid), 0)
  where a.id = aid;
  return null;
end $fn$;
create trigger track_ratings_agg after insert or update or delete on public.track_ratings
  for each row execute function public.refresh_asset_rating();

-- ── Connections + 1:1 DMs (collaborators who connect can talk) ───────────────
create table public.connections (
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted','declined')),
  created_at timestamptz not null default now(),
  primary key (requester_id, addressee_id)
);
alter table public.connections enable row level security;
create policy "connections read mine" on public.connections for select
  using (requester_id = auth.uid() or addressee_id = auth.uid());
create policy "connections request" on public.connections for insert with check (requester_id = auth.uid());
create policy "connections respond" on public.connections for update
  using (addressee_id = auth.uid() or requester_id = auth.uid())
  with check (addressee_id = auth.uid() or requester_id = auth.uid());
grant select, insert, update, delete on public.connections to authenticated;

create table public.dm_threads (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  last_at timestamptz not null default now(),
  unique (user_a, user_b)
);
alter table public.dm_threads enable row level security;
create policy "dm threads mine" on public.dm_threads for select
  using (user_a = auth.uid() or user_b = auth.uid());
grant select on public.dm_threads to authenticated;

create table public.dm_messages (
  id uuid primary key default gen_random_uuid(),
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index dm_messages_thread_idx on public.dm_messages(thread_id, created_at);
alter table public.dm_messages enable row level security;
create policy "dm messages read" on public.dm_messages for select
  using (exists (select 1 from public.dm_threads t where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())));
create policy "dm messages send" on public.dm_messages for insert
  with check (sender_id = auth.uid() and exists (
    select 1 from public.dm_threads t where t.id = thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())));
grant select, insert on public.dm_messages to authenticated;

-- Open (or find) the DM thread with a peer, ordered so the pair is canonical.
create or replace function public.start_dm(p_peer uuid)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); a uuid; b uuid; tid uuid;
begin
  if uid is null or p_peer is null or p_peer = uid then return null; end if;
  a := least(uid, p_peer); b := greatest(uid, p_peer);
  insert into public.dm_threads (user_a, user_b) values (a, b)
    on conflict (user_a, user_b) do update set last_at = now()
    returning id into tid;
  return tid;
end $fn$;
grant execute on function public.start_dm(uuid) to authenticated;

-- ── Opportunity board ────────────────────────────────────────────────────────
create table public.collab_posts (
  id uuid primary key default gen_random_uuid(),
  author_id uuid not null references public.profiles(id) on delete cascade,
  role_needed text not null references public.roles(id),
  title text not null, body text,
  genres text[] not null default '{}', daws text[] not null default '{}',
  remote_ok boolean not null default true, location text,
  commitment text check (commitment in ('one-off','ongoing','session','band-member')),
  status text not null default 'open' check (status in ('open','filled','closed')),
  created_at timestamptz not null default now()
);
create index collab_posts_role_idx on public.collab_posts(role_needed) where status = 'open';
alter table public.collab_posts enable row level security;
create policy "collab_posts read" on public.collab_posts for select using (true);
create policy "collab_posts write" on public.collab_posts for all
  using (author_id = auth.uid()) with check (author_id = auth.uid());
grant select, insert, update, delete on public.collab_posts to authenticated;
grant select on public.collab_posts to anon;

create table public.collab_applications (
  post_id uuid not null references public.collab_posts(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message text, asset_id uuid references public.assets(id),
  created_at timestamptz not null default now(),
  primary key (post_id, applicant_id)
);
alter table public.collab_applications enable row level security;
create policy "apps read" on public.collab_applications for select
  using (applicant_id = auth.uid() or exists (select 1 from public.collab_posts p where p.id = post_id and p.author_id = auth.uid()));
create policy "apps insert" on public.collab_applications for insert with check (applicant_id = auth.uid());
create policy "apps delete" on public.collab_applications for delete using (applicant_id = auth.uid());
grant select, insert, delete on public.collab_applications to authenticated;

-- ── Overlap helpers ──────────────────────────────────────────────────────────
create or replace function public.jsonb_overlap_count(a jsonb, b jsonb)
returns int language sql immutable set search_path = public as $fn$
  select count(*)::int from (
    select jsonb_array_elements_text(coalesce(a,'[]'::jsonb))
    intersect select jsonb_array_elements_text(coalesce(b,'[]'::jsonb))
  ) s;
$fn$;
create or replace function public.jsonb_overlap_names(a jsonb, b jsonb)
returns text[] language sql immutable set search_path = public as $fn$
  select coalesce(array_agg(v), '{}') from (
    select jsonb_array_elements_text(coalesce(a,'[]'::jsonb)) as v
    intersect select jsonb_array_elements_text(coalesce(b,'[]'::jsonb))
  ) s;
$fn$;
