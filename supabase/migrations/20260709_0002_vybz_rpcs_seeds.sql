-- ===========================================================================
-- VYBZ v1 — matchmaking RPCs, creator-role editing, ratings, and taxonomy seeds.
-- All definer functions emit only aggregates + labels, never raw private facets.
-- ===========================================================================

set search_path = public, extensions;

-- ── Creator-role editing ─────────────────────────────────────────────────────
create or replace function public.set_creator_roles(p_offers jsonb, p_seeks jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then return; end if;
  delete from public.creator_roles where user_id = uid;
  delete from public.creator_seeks where user_id = uid;
  insert into public.creator_roles (user_id, role_id, skill)
  select uid, e->>'role_id', least(5, greatest(1, coalesce((e->>'skill')::int, 3)))::smallint
  from jsonb_array_elements(coalesce(p_offers, '[]'::jsonb)) e
  where exists (select 1 from public.roles r where r.id = e->>'role_id')
  on conflict (user_id, role_id) do update set skill = excluded.skill;
  insert into public.creator_seeks (user_id, role_id, priority)
  select uid, e->>'role_id', least(3, greatest(1, coalesce((e->>'priority')::int, 1)))::smallint
  from jsonb_array_elements(coalesce(p_seeks, '[]'::jsonb)) e
  where exists (select 1 from public.roles r where r.id = e->>'role_id')
  on conflict (user_id, role_id) do update set priority = excluded.priority;
end $fn$;
grant execute on function public.set_creator_roles(jsonb, jsonb) to authenticated;

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

create or replace function public.creator_roles_for(p_id uuid)
returns table(offers text[], seeks text[])
language sql security definer set search_path = public stable as $fn$
  select
    coalesce(array(select r.label from public.creator_roles cr join public.roles r on r.id = cr.role_id
                   where cr.user_id = p_id order by r.family, r.sort), '{}'),
    coalesce(array(select r.label from public.creator_seeks cs join public.roles r on r.id = cs.role_id
                   where cs.user_id = p_id order by r.family, r.sort), '{}');
$fn$;
grant execute on function public.creator_roles_for(uuid) to anon, authenticated;

-- ── The matchmaking engine — complementary collaborators ─────────────────────
create or replace function public.collab_matches(p_limit int default 20)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, fit numeric
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max
    from public.profiles where id = auth.uid()
  ),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  cand as (
    select distinct user_id from (
      select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
      union
      select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
      union
      select sem.user_id from (
        select e.user_id from public.profile_embeddings e
        where exists (select 1 from me_vec) and e.user_id <> auth.uid()
        order by e.embedding <=> (select embedding from me_vec) limit 200
      ) sem
    ) u where user_id <> auth.uid()
  ),
  scored as (
    select c.user_id,
      array(select r.label from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
            join public.roles r on r.id = cr.role_id where cr.user_id = c.user_id order by r.family, r.sort) as offers_you_seek,
      array(select r.label from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
            join public.roles r on r.id = cs.role_id where cs.user_id = c.user_id order by r.family, r.sort) as seeks_you_offer,
      public.jsonb_overlap_names(p.profile->'genres', me.genres) as shared_genres,
      public.jsonb_overlap_names(p.profile->'daws', me.daws) as shared_daws,
      public.jsonb_overlap_names(p.profile->'plugins', me.plugins) as shared_plugins,
      public.jsonb_overlap_count(p.profile->'languages', me.languages) as shared_langs,
      (case when me.tempo_min is not null and me.tempo_max is not null
         and nullif(p.profile->>'tempoMin','')::numeric is not null
         and nullif(p.profile->>'tempoMax','')::numeric is not null
         and me.tempo_min <= nullif(p.profile->>'tempoMax','')::numeric
         and me.tempo_max >= nullif(p.profile->>'tempoMin','')::numeric
        then true else false end) as tempo_fit,
      (case when exists (select 1 from me_vec) and pe.embedding is not null
        then greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec))) else 0 end)::numeric as sim,
      coalesce((p.profile->>'openToWork')::boolean, false) as open_to_work
    from cand c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join public.profile_embeddings pe on pe.user_id = c.user_id
    where coalesce(p.banned, false) = false
  ),
  blended as (
    select s.*,
      ( coalesce(array_length(s.offers_you_seek,1),0) * 3.0
      + coalesce(array_length(s.seeks_you_offer,1),0) * 3.0
      + case when coalesce(array_length(s.offers_you_seek,1),0) > 0 and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then 4.0 else 0 end
      + coalesce(array_length(s.shared_genres,1),0) * 1.4
      + coalesce(array_length(s.shared_daws,1),0) * 1.2
      + least(5, coalesce(array_length(s.shared_plugins,1),0)) * 0.9
      + s.shared_langs * 0.5
      + case when s.tempo_fit then 0.6 else 0 end
      + s.sim * 3.0
      + case when s.open_to_work then 1.0 else 0 end ) as raw
    from scored s
  )
  select b.user_id, pr.username, pr.username,
    b.offers_you_seek, b.seeks_you_offer,
    (coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0),
    b.shared_genres, b.shared_daws, b.shared_plugins, b.open_to_work,
    round(b.sim, 3), round(least(1.0, b.raw / 18.0), 3)
  from blended b join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0 or coalesce(array_length(b.seeks_you_offer,1),0) > 0 or b.sim >= 0.6)
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int) to authenticated;

-- ── Opportunity matching ─────────────────────────────────────────────────────
create or replace function public.my_opportunities(p_limit int default 40)
returns table(
  id uuid, author_id uuid, author_alias text, author_username text,
  role_needed text, role_label text, title text, body text,
  genres text[], daws text[], remote_ok boolean, location text, commitment text,
  created_at timestamptz, shared_genres text[], shared_daws text[], applied boolean, fit numeric
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select coalesce(array(select jsonb_array_elements_text(profile->'genres')), '{}') as genres,
           coalesce(array(select jsonb_array_elements_text(profile->'daws')), '{}') as daws,
           coalesce((profile->>'remoteOk')::boolean, false) as remote_ok, location
    from public.profiles where id = auth.uid()
  ),
  me_vec as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid())
  select cp.id, cp.author_id, pr.username, pr.username, cp.role_needed, r.label,
    cp.title, cp.body, cp.genres, cp.daws, cp.remote_ok, cp.location, cp.commitment, cp.created_at,
    array(select g from unnest(cp.genres) g intersect select unnest(me.genres)) as shared_genres,
    array(select d from unnest(cp.daws) d intersect select unnest(me.daws)) as shared_daws,
    exists(select 1 from public.collab_applications a where a.post_id = cp.id and a.applicant_id = auth.uid()) as applied,
    round((least(1.0, (
        coalesce(array_length(array(select g from unnest(cp.genres) g intersect select unnest(me.genres)),1),0) * 1.4
      + coalesce(array_length(array(select d from unnest(cp.daws) d intersect select unnest(me.daws)),1),0) * 1.2
      + case when cp.remote_ok or me.remote_ok or (cp.location is not null and cp.location = me.location) then 0.8 else 0 end
      + coalesce((select greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec)))
          from public.profile_embeddings pe where pe.user_id = cp.author_id and exists (select 1 from me_vec)), 0) * 3.0
      + 2.0) / 8.0))::numeric, 3) as fit
  from public.collab_posts cp
  join public.profiles pr on pr.id = cp.author_id
  join public.roles r on r.id = cp.role_needed
  cross join me
  where cp.status = 'open' and cp.author_id <> auth.uid()
    and cp.role_needed in (select role_id from my_offers)
    and coalesce(pr.banned, false) = false
  order by fit desc, cp.created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.my_opportunities(int) to authenticated;

-- ── Ratings ──────────────────────────────────────────────────────────────────
create or replace function public.rate_track(p_drop uuid, p_rating int)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); aid uuid;
begin
  if uid is null then return; end if;
  select asset_id into aid from public.drops where id = p_drop;
  if aid is null then return; end if;
  insert into public.track_ratings (asset_id, user_id, rating)
  values (aid, uid, least(5, greatest(1, p_rating))::smallint)
  on conflict (asset_id, user_id) do update set rating = excluded.rating, created_at = now();
end $fn$;
grant execute on function public.rate_track(uuid, int) to authenticated;

create or replace function public.request_asset_download(p_asset uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); a public.assets%rowtype;
begin
  if uid is null then return null; end if;
  select * into a from public.assets where id = p_asset;
  if a.id is null or not a.downloadable then return null; end if;
  if a.kind in ('project','preset') and a.owner_id <> uid then return null; end if;
  insert into public.asset_downloads (asset_id, user_id, license) values (a.id, uid, a.license)
  on conflict (asset_id, user_id) do update set created_at = now(), license = excluded.license;
  return a.url;
end $fn$;
grant execute on function public.request_asset_download(uuid) to authenticated;

-- ── Seeds ─────────────────────────────────────────────────────────────────────
insert into public.roles (id, label, family, sort) values
  ('drums','Drums','instrument',10),('percussion','Percussion','instrument',20),
  ('piano','Pianist','instrument',30),('keys_synth','Keys / Synth','instrument',40),
  ('guitar_electric','Electric Guitar','instrument',50),('guitar_acoustic','Acoustic Guitar','instrument',60),
  ('bass','Bass','instrument',70),('violin','Violin','instrument',80),('cello','Cello','instrument',90),
  ('saxophone','Saxophone','instrument',100),('trumpet','Trumpet','instrument',110),('flute','Flute','instrument',120),
  ('strings_section','Strings Section','instrument',130),('brass_section','Brass Section','instrument',140),
  ('dj_turntables','DJ / Turntables','instrument',150),('other_instrument','Other Instrument','instrument',160),
  ('vocals_lead','Lead Vocalist','vocal',210),('vocals_backing','Backing Vocalist','vocal',220),
  ('rapper','Rapper','vocal',230),('topliner','Topliner','vocal',240),
  ('songwriter_lyricist','Songwriter / Lyricist','vocal',250),('spoken_word','Spoken Word','vocal',260),
  ('producer','Producer','production',310),('beatmaker','Beatmaker','production',320),
  ('sound_designer','Sound Designer','production',330),('composer','Composer','production',340),
  ('arranger','Arranger','production',350),('remixer','Remixer','production',360),('sampler','Sampler','production',370),
  ('mix_engineer','Mix Engineer','engineering',410),('master_engineer','Mastering Engineer','engineering',420),
  ('recording_engineer','Recording Engineer','engineering',430),('vocal_tuning_editor','Vocal Tuning / Editing','engineering',440),
  ('band','Band','performance',510),('live_performer','Live Performer','performance',520),('session_musician','Session Musician','performance',530),
  ('manager','Manager','business',610),('a_and_r','A&R','business',620),('sync_licensing','Sync / Licensing','business',630),('studio_owner','Studio Owner','business',640)
on conflict (id) do update set label = excluded.label, family = excluded.family, sort = excluded.sort;

insert into public.genres (id, label, sort) values
  ('hip_hop','Hip-Hop',10),('trap','Trap',20),('rnb','R&B',30),('neo_soul','Neo-Soul',40),('pop','Pop',50),
  ('afrobeats','Afrobeats',60),('amapiano','Amapiano',70),('house','House',80),('techno','Techno',90),('dnb','Drum & Bass',100),
  ('dubstep','Dubstep',110),('edm','EDM',120),('lofi','Lo-Fi',130),('jazz','Jazz',140),('funk','Funk',150),('soul','Soul',160),
  ('rock','Rock',170),('metal','Metal',180),('punk','Punk',190),('indie','Indie',200),('folk','Folk',210),('country','Country',220),
  ('reggae','Reggae',230),('dancehall','Dancehall',240),('latin','Latin',250),('reggaeton','Reggaeton',260),('classical','Classical',270),
  ('ambient','Ambient',280),('experimental','Experimental',290),('gospel','Gospel',300),('blues','Blues',310),('world','World',320)
on conflict (id) do update set label = excluded.label, sort = excluded.sort;

insert into public.daws (id, label, project_ext, sort) values
  ('ableton','Ableton Live','.als',10),('fl_studio','FL Studio','.flp',20),('logic','Logic Pro','.logicx',30),
  ('pro_tools','Pro Tools','.ptx',40),('reaper','Reaper','.rpp',50),('studio_one','Studio One','.song',60),
  ('bitwig','Bitwig','.bwproject',70),('cubase','Cubase','.cpr',80),('reason','Reason','.reason',90),('garageband','GarageBand','.band',100)
on conflict (id) do update set label = excluded.label, project_ext = excluded.project_ext, sort = excluded.sort;

insert into public.plugins (id, label, vendor, category, formats, verified) values
  ('serum','Serum','Xfer Records','synth','{VST3,AU,AAX}',true),('serum2','Serum 2','Xfer Records','synth','{VST3,AU,AAX}',true),
  ('massive','Massive','Native Instruments','synth','{VST3,AU,AAX}',true),('massive_x','Massive X','Native Instruments','synth','{VST3,AU,AAX}',true),
  ('omnisphere','Omnisphere','Spectrasonics','synth','{VST3,AU,AAX}',true),('keyscape','Keyscape','Spectrasonics','sampler','{VST3,AU,AAX}',true),
  ('sylenth1','Sylenth1','LennarDigital','synth','{VST3,AU}',true),('vital','Vital','Vital Audio','synth','{VST3,AU}',true),
  ('pigments','Pigments','Arturia','synth','{VST3,AU,AAX}',true),('diva','Diva','u-he','synth','{VST3,AU,AAX,CLAP}',true),
  ('kontakt','Kontakt','Native Instruments','sampler','{VST3,AU,AAX}',true),('nexus','Nexus','reFX','synth','{VST3,AU,AAX}',true),
  ('fabfilter_pro_q3','FabFilter Pro-Q 3','FabFilter','eq','{VST3,AU,AAX}',true),('fabfilter_pro_c2','FabFilter Pro-C 2','FabFilter','compressor','{VST3,AU,AAX}',true),
  ('fabfilter_pro_l2','FabFilter Pro-L 2','FabFilter','mastering','{VST3,AU,AAX}',true),('ozone','Ozone','iZotope','mastering','{VST3,AU,AAX}',true),
  ('rx','RX','iZotope','utility','{VST3,AU,AAX}',true),('autotune_pro','Auto-Tune Pro','Antares','fx','{VST3,AU,AAX}',true),
  ('melodyne','Melodyne','Celemony','utility','{VST3,AU,AAX}',true),('valhalla_vintageverb','Valhalla VintageVerb','Valhalla DSP','reverb','{VST3,AU,AAX}',true),
  ('soundtoys_decapitator','Decapitator','Soundtoys','saturation','{VST3,AU,AAX}',true),('ott','OTT','Xfer Records','compressor','{VST3,AU}',true),
  ('arcade','Arcade','Output','sampler','{VST3,AU,AAX}',true),('superior_drummer3','Superior Drummer 3','Toontrack','drum_machine','{VST3,AU,AAX}',true),
  ('spitfire_labs','Spitfire LABS','Spitfire Audio','orchestral','{VST3,AU,AAX}',true)
on conflict (id) do update set label = excluded.label, vendor = excluded.vendor, category = excluded.category, formats = excluded.formats, verified = excluded.verified;
