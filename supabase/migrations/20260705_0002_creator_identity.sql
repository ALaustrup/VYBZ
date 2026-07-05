-- ===========================================================================
-- VYBZ Phase 1 — Creator identity.
--
-- Controlled vocabularies (roles, genres, daws, plugins) + the bipartite core
-- that powers complementary matchmaking (creator_roles = what you OFFER,
-- creator_seeks = what you're LOOKING FOR). Music facets (genres, daws, plugins,
-- influences, tempo, keys) continue to live in profiles.profile jsonb (reusing
-- the inherited owner-private blob + GIN index + privacy model).
--
-- Everything is additive + idempotent. Taxonomy tables are readable by everyone
-- (controlled vocab); writes are admin-only. creator_roles/seeks are reached
-- only through SECURITY DEFINER RPCs (mirroring user_matches/dating_deck).
-- ===========================================================================

-- pg_trgm powers fuzzy plugin search (typeahead) later (§5.5).
create extension if not exists pg_trgm;

-- ── 1. Taxonomy: roles ──────────────────────────────────────────────────────
create table if not exists public.roles (
  id     text primary key,
  label  text not null,
  family text not null,   -- instrument | vocal | production | engineering | performance | business
  sort   int  not null default 0
);

-- ── Taxonomy: genres ────────────────────────────────────────────────────────
create table if not exists public.genres (
  id text primary key, label text not null, sort int not null default 0
);

-- ── Taxonomy: DAWs ──────────────────────────────────────────────────────────
create table if not exists public.daws (
  id text primary key, label text not null, project_ext text, sort int not null default 0
);

-- ── Taxonomy: plugins (VST/AU/AAX/CLAP) ─────────────────────────────────────
create table if not exists public.plugins (
  id         text primary key,
  label      text not null,
  vendor     text,
  category   text,          -- synth | sampler | eq | compressor | reverb | delay | saturation | mastering | drum_machine | orchestral | fx | utility
  formats    text[] default '{}',
  verified   boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists plugins_category_idx on public.plugins(category);
create index if not exists plugins_label_trgm on public.plugins using gin (label gin_trgm_ops);

-- ── 2. The bipartite core: OFFERS + SEEKS ───────────────────────────────────
create table if not exists public.creator_roles (
  user_id uuid not null references public.profiles(id) on delete cascade,
  role_id text not null references public.roles(id),
  skill   smallint not null default 3 check (skill between 1 and 5),
  primary key (user_id, role_id)
);
create index if not exists creator_roles_role_idx on public.creator_roles(role_id);

create table if not exists public.creator_seeks (
  user_id  uuid not null references public.profiles(id) on delete cascade,
  role_id  text not null references public.roles(id),
  priority smallint not null default 1 check (priority between 1 and 3),
  primary key (user_id, role_id)
);
create index if not exists creator_seeks_role_idx on public.creator_seeks(role_id);

-- ── 3. RLS ──────────────────────────────────────────────────────────────────
-- Taxonomy: world-readable controlled vocab; writes admin-only.
alter table public.roles   enable row level security;
alter table public.genres  enable row level security;
alter table public.daws    enable row level security;
alter table public.plugins enable row level security;

do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='roles' and policyname='roles read') then
    create policy "roles read" on public.roles for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='genres' and policyname='genres read') then
    create policy "genres read" on public.genres for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='daws' and policyname='daws read') then
    create policy "daws read" on public.daws for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='plugins' and policyname='plugins read') then
    create policy "plugins read" on public.plugins for select using (true);
  end if;
end $$;

grant select on public.roles, public.genres, public.daws, public.plugins to anon, authenticated;

-- creator_roles/seeks: no direct client policies — access via definer RPCs only.
alter table public.creator_roles enable row level security;
alter table public.creator_seeks enable row level security;

-- ── 4. RPCs ──────────────────────────────────────────────────────────────────
-- Replace the caller's offered + sought roles atomically.
--   p_offers = [{ "role_id": "drums", "skill": 4 }, ...]
--   p_seeks  = [{ "role_id": "piano", "priority": 2 }, ...]
create or replace function public.set_creator_roles(p_offers jsonb, p_seeks jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;

  delete from public.creator_roles where user_id = uid;
  delete from public.creator_seeks where user_id = uid;

  insert into public.creator_roles (user_id, role_id, skill)
  select uid, e->>'role_id',
         least(5, greatest(1, coalesce((e->>'skill')::int, 3)))::smallint
  from jsonb_array_elements(coalesce(p_offers, '[]'::jsonb)) e
  where exists (select 1 from public.roles r where r.id = e->>'role_id')
  on conflict (user_id, role_id) do update set skill = excluded.skill;

  insert into public.creator_seeks (user_id, role_id, priority)
  select uid, e->>'role_id',
         least(3, greatest(1, coalesce((e->>'priority')::int, 1)))::smallint
  from jsonb_array_elements(coalesce(p_seeks, '[]'::jsonb)) e
  where exists (select 1 from public.roles r where r.id = e->>'role_id')
  on conflict (user_id, role_id) do update set priority = excluded.priority;
end $fn$;
grant execute on function public.set_creator_roles(jsonb, jsonb) to authenticated;

-- The caller's own roles (raw ids + skill/priority) for the editor.
create or replace function public.my_creator_roles()
returns table(offers jsonb, seeks jsonb)
language sql security definer set search_path = public stable as $fn$
  select
    coalesce((select jsonb_agg(jsonb_build_object('role_id', role_id, 'skill', skill) order by role_id)
              from public.creator_roles where user_id = auth.uid()), '[]'::jsonb),
    coalesce((select jsonb_agg(jsonb_build_object('role_id', role_id, 'priority', priority) order by role_id)
              from public.creator_seeks where user_id = auth.uid()), '[]'::jsonb);
$fn$;
grant execute on function public.my_creator_roles() to authenticated;

-- A user's offered + sought role LABELS for public display (roles are public by
-- design — they are the core collab-discovery identity, never a private facet).
create or replace function public.creator_roles_for(p_id uuid)
returns table(offers text[], seeks text[])
language sql security definer set search_path = public stable as $fn$
  select
    coalesce(array(select r.label from public.creator_roles cr
                    join public.roles r on r.id = cr.role_id
                    where cr.user_id = p_id order by r.family, r.sort), '{}'),
    coalesce(array(select r.label from public.creator_seeks cs
                    join public.roles r on r.id = cs.role_id
                    where cs.user_id = p_id order by r.family, r.sort), '{}');
$fn$;
grant execute on function public.creator_roles_for(uuid) to anon, authenticated;

-- ── 5. Seeds ──────────────────────────────────────────────────────────────────
-- Roles (§7.2) — every role is both offerable and seekable.
insert into public.roles (id, label, family, sort) values
  ('drums','Drums','instrument',10),
  ('percussion','Percussion','instrument',20),
  ('piano','Pianist','instrument',30),
  ('keys_synth','Keys / Synth','instrument',40),
  ('guitar_electric','Electric Guitar','instrument',50),
  ('guitar_acoustic','Acoustic Guitar','instrument',60),
  ('bass','Bass','instrument',70),
  ('violin','Violin','instrument',80),
  ('cello','Cello','instrument',90),
  ('saxophone','Saxophone','instrument',100),
  ('trumpet','Trumpet','instrument',110),
  ('flute','Flute','instrument',120),
  ('strings_section','Strings Section','instrument',130),
  ('brass_section','Brass Section','instrument',140),
  ('dj_turntables','DJ / Turntables','instrument',150),
  ('other_instrument','Other Instrument','instrument',160),
  ('vocals_lead','Lead Vocalist','vocal',210),
  ('vocals_backing','Backing Vocalist','vocal',220),
  ('rapper','Rapper','vocal',230),
  ('topliner','Topliner','vocal',240),
  ('songwriter_lyricist','Songwriter / Lyricist','vocal',250),
  ('spoken_word','Spoken Word','vocal',260),
  ('producer','Producer','production',310),
  ('beatmaker','Beatmaker','production',320),
  ('sound_designer','Sound Designer','production',330),
  ('composer','Composer','production',340),
  ('arranger','Arranger','production',350),
  ('remixer','Remixer','production',360),
  ('sampler','Sampler','production',370),
  ('mix_engineer','Mix Engineer','engineering',410),
  ('master_engineer','Mastering Engineer','engineering',420),
  ('recording_engineer','Recording Engineer','engineering',430),
  ('vocal_tuning_editor','Vocal Tuning / Editing','engineering',440),
  ('band','Band','performance',510),
  ('live_performer','Live Performer','performance',520),
  ('session_musician','Session Musician','performance',530),
  ('manager','Manager','business',610),
  ('a_and_r','A&R','business',620),
  ('sync_licensing','Sync / Licensing','business',630),
  ('studio_owner','Studio Owner','business',640)
on conflict (id) do update set label = excluded.label, family = excluded.family, sort = excluded.sort;

-- Genres (§9). id = slug; label is the join key stored in profile jsonb.
insert into public.genres (id, label, sort) values
  ('hip_hop','Hip-Hop',10),('trap','Trap',20),('rnb','R&B',30),('neo_soul','Neo-Soul',40),
  ('pop','Pop',50),('afrobeats','Afrobeats',60),('amapiano','Amapiano',70),('house','House',80),
  ('techno','Techno',90),('dnb','Drum & Bass',100),('dubstep','Dubstep',110),('edm','EDM',120),
  ('lofi','Lo-Fi',130),('jazz','Jazz',140),('funk','Funk',150),('soul','Soul',160),
  ('rock','Rock',170),('metal','Metal',180),('punk','Punk',190),('indie','Indie',200),
  ('folk','Folk',210),('country','Country',220),('reggae','Reggae',230),('dancehall','Dancehall',240),
  ('latin','Latin',250),('reggaeton','Reggaeton',260),('classical','Classical',270),('ambient','Ambient',280),
  ('experimental','Experimental',290),('gospel','Gospel',300),('blues','Blues',310),('world','World',320)
on conflict (id) do update set label = excluded.label, sort = excluded.sort;

-- DAWs (§8.3) with project file extensions.
insert into public.daws (id, label, project_ext, sort) values
  ('ableton','Ableton Live','.als',10),
  ('fl_studio','FL Studio','.flp',20),
  ('logic','Logic Pro','.logicx',30),
  ('pro_tools','Pro Tools','.ptx',40),
  ('reaper','Reaper','.rpp',50),
  ('studio_one','Studio One','.song',60),
  ('bitwig','Bitwig','.bwproject',70),
  ('cubase','Cubase','.cpr',80),
  ('reason','Reason','.reason',90),
  ('garageband','GarageBand','.band',100)
on conflict (id) do update set label = excluded.label, project_ext = excluded.project_ext, sort = excluded.sort;

-- Plugins — curated launch seed (§5.5). All verified=true (admin-curated canon).
insert into public.plugins (id, label, vendor, category, formats, verified) values
  ('serum','Serum','Xfer Records','synth','{VST3,AU,AAX}',true),
  ('serum2','Serum 2','Xfer Records','synth','{VST3,AU,AAX}',true),
  ('massive','Massive','Native Instruments','synth','{VST3,AU,AAX}',true),
  ('massive_x','Massive X','Native Instruments','synth','{VST3,AU,AAX}',true),
  ('omnisphere','Omnisphere','Spectrasonics','synth','{VST3,AU,AAX}',true),
  ('keyscape','Keyscape','Spectrasonics','sampler','{VST3,AU,AAX}',true),
  ('trilian','Trilian','Spectrasonics','sampler','{VST3,AU,AAX}',true),
  ('sylenth1','Sylenth1','LennarDigital','synth','{VST3,AU}',true),
  ('spire','Spire','Reveal Sound','synth','{VST3,AU,AAX}',true),
  ('nexus','Nexus','reFX','synth','{VST3,AU,AAX}',true),
  ('vital','Vital','Vital Audio','synth','{VST3,AU}',true),
  ('phase_plant','Phase Plant','Kilohearts','synth','{VST3,AU,AAX}',true),
  ('pigments','Pigments','Arturia','synth','{VST3,AU,AAX}',true),
  ('diva','Diva','u-he','synth','{VST3,AU,AAX,CLAP}',true),
  ('repro','Repro','u-he','synth','{VST3,AU,AAX,CLAP}',true),
  ('kontakt','Kontakt','Native Instruments','sampler','{VST3,AU,AAX}',true),
  ('battery','Battery','Native Instruments','drum_machine','{VST3,AU,AAX}',true),
  ('maschine','Maschine','Native Instruments','drum_machine','{VST3,AU,AAX}',true),
  ('nnxt','NN-XT','Reason Studios','sampler','{VST3,AU}',true),
  ('fabfilter_pro_q3','FabFilter Pro-Q 3','FabFilter','eq','{VST3,AU,AAX}',true),
  ('fabfilter_pro_c2','FabFilter Pro-C 2','FabFilter','compressor','{VST3,AU,AAX}',true),
  ('fabfilter_pro_l2','FabFilter Pro-L 2','FabFilter','mastering','{VST3,AU,AAX}',true),
  ('fabfilter_pro_r','FabFilter Pro-R','FabFilter','reverb','{VST3,AU,AAX}',true),
  ('fabfilter_saturn2','FabFilter Saturn 2','FabFilter','saturation','{VST3,AU,AAX}',true),
  ('ozone','Ozone','iZotope','mastering','{VST3,AU,AAX}',true),
  ('neutron','Neutron','iZotope','utility','{VST3,AU,AAX}',true),
  ('rx','RX','iZotope','utility','{VST3,AU,AAX}',true),
  ('nectar','Nectar','iZotope','fx','{VST3,AU,AAX}',true),
  ('waves_ssl','Waves SSL E-Channel','Waves','eq','{VST3,AU,AAX}',true),
  ('waves_cla76','Waves CLA-76','Waves','compressor','{VST3,AU,AAX}',true),
  ('waves_h_delay','Waves H-Delay','Waves','delay','{VST3,AU,AAX}',true),
  ('soundtoys_decapitator','Decapitator','Soundtoys','saturation','{VST3,AU,AAX}',true),
  ('soundtoys_echoboy','EchoBoy','Soundtoys','delay','{VST3,AU,AAX}',true),
  ('soundtoys_littleplate','Little Plate','Soundtoys','reverb','{VST3,AU,AAX}',true),
  ('valhalla_vintageverb','Valhalla VintageVerb','Valhalla DSP','reverb','{VST3,AU,AAX}',true),
  ('valhalla_supermassive','Valhalla Supermassive','Valhalla DSP','reverb','{VST3,AU}',true),
  ('valhalla_delay','ValhallaDelay','Valhalla DSP','delay','{VST3,AU,AAX}',true),
  ('gullfoss','Gullfoss','Soundtheory','eq','{VST3,AU,AAX}',true),
  ('sausage_fattener','Sausage Fattener','Dada Life','saturation','{VST3,AU}',true),
  ('ott','OTT','Xfer Records','compressor','{VST3,AU}',true),
  ('effectrix','Effectrix','Sugar Bytes','fx','{VST3,AU,AAX}',true),
  ('portal','Portal','Output','fx','{VST3,AU,AAX}',true),
  ('arcade','Arcade','Output','sampler','{VST3,AU,AAX}',true),
  ('addictive_drums2','Addictive Drums 2','XLN Audio','drum_machine','{VST3,AU,AAX}',true),
  ('superior_drummer3','Superior Drummer 3','Toontrack','drum_machine','{VST3,AU,AAX}',true),
  ('ez_keys','EZkeys','Toontrack','sampler','{VST3,AU,AAX}',true),
  ('electra2','Electra2','Tone2','synth','{VST3,AU,AAX}',true),
  ('gladiator','Gladiator 3','Tone2','synth','{VST3,AU,AAX}',true),
  ('sforzando','sforzando','Plogue','sampler','{VST3,AU,AAX}',true),
  ('autotune_pro','Auto-Tune Pro','Antares','fx','{VST3,AU,AAX}',true),
  ('melodyne','Melodyne','Celemony','utility','{VST3,AU,AAX}',true),
  ('komplete','Komplete','Native Instruments','sampler','{VST3,AU,AAX}',true),
  ('spitfire_labs','Spitfire LABS','Spitfire Audio','orchestral','{VST3,AU,AAX}',true),
  ('bbc_so','BBC Symphony Orchestra','Spitfire Audio','orchestral','{VST3,AU,AAX}',true)
on conflict (id) do update set label = excluded.label, vendor = excluded.vendor, category = excluded.category, formats = excluded.formats, verified = excluded.verified;
