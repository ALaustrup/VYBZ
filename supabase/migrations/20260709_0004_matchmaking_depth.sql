-- ===========================================================================
-- VYBZ Phase B — matchmaking depth.
--
-- Adds a curated ROLE-AFFINITY GRAPH so strong complements surface even when a
-- creator hasn't explicitly declared them, plus skill-tier proximity and an
-- expanded candidate pool. Captures both musicianship complements (rapper↔
-- beatmaker, drums↔bass, band↔instrumentalists, …) and production/agency
-- relationships (producer↔artist, engineer↔artist, A&R/manager↔artist,
-- composer↔arranger, …). Everything remains additive; collab_matches keeps its
-- signature + return shape (no client change required) — only its precision and
-- candidate discovery improve. Declared complements stay the visible "why";
-- affinity is used for ranking + candidate expansion (kept honest).
-- ===========================================================================

set search_path = public, extensions;

-- ── Role affinity graph ──────────────────────────────────────────────────────
create table if not exists public.role_affinities (
  from_role text not null references public.roles(id),
  to_role   text not null references public.roles(id),
  weight    numeric not null default 1.0,
  bidirectional boolean not null default true,
  primary key (from_role, to_role)
);
alter table public.role_affinities enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='role_affinities' and policyname='role_affinities read') then
    create policy "role_affinities read" on public.role_affinities for select using (true);
  end if;
end $$;
grant select on public.role_affinities to anon, authenticated;

-- Curated base edges (weight ~ strength of the natural pairing). `bidirectional`
-- means both creators should discover each other; reverse rows are generated
-- automatically below so the matching query stays a clean single-direction join.
insert into public.role_affinities (from_role, to_role, weight, bidirectional) values
  -- Vocal / topline ↔ production
  ('rapper','beatmaker',1.6,true), ('rapper','producer',1.4,true),
  ('topliner','producer',1.6,true), ('topliner','beatmaker',1.3,true),
  ('vocals_lead','producer',1.4,true), ('vocals_lead','songwriter_lyricist',1.2,true),
  ('vocals_lead','piano',1.0,true), ('vocals_lead','guitar_acoustic',1.0,true),
  ('songwriter_lyricist','producer',1.2,true), ('songwriter_lyricist','topliner',1.1,true),
  ('vocals_backing','vocals_lead',1.0,true),
  -- Rhythm section / instrumentalists
  ('drums','bass',1.4,true), ('bass','guitar_electric',1.2,true), ('drums','guitar_electric',1.0,true),
  ('drums','keys_synth',1.0,true), ('keys_synth','producer',1.2,true), ('piano','producer',1.0,true),
  ('guitar_electric','vocals_lead',1.0,true), ('percussion','drums',0.9,true),
  -- Bands ↔ members
  ('band','guitar_electric',1.3,true), ('band','bass',1.3,true), ('band','drums',1.3,true),
  ('band','vocals_lead',1.3,true), ('band','keys_synth',1.2,true),
  -- Production ↔ artist
  ('producer','vocals_lead',1.4,true), ('producer','rapper',1.4,true), ('producer','topliner',1.5,true),
  ('beatmaker','rapper',1.6,true), ('sampler','producer',1.0,true), ('remixer','producer',1.0,true),
  -- Engineering ↔ everyone with material (production/agency, discoverable both ways)
  ('mix_engineer','producer',1.3,true), ('mix_engineer','vocals_lead',1.2,true), ('mix_engineer','band',1.2,true),
  ('mix_engineer','rapper',1.1,true), ('master_engineer','mix_engineer',1.2,true), ('master_engineer','producer',1.1,true),
  ('recording_engineer','band',1.1,true), ('recording_engineer','vocals_lead',1.0,true),
  ('vocal_tuning_editor','vocals_lead',1.1,true), ('vocal_tuning_editor','topliner',1.0,true),
  -- Composition / arrangement / orchestral
  ('composer','arranger',1.2,true), ('composer','strings_section',1.1,true), ('composer','brass_section',1.0,true),
  ('arranger','band',1.0,true), ('composer','sync_licensing',1.0,true),
  -- Business / agency ↔ artist (asymmetric intent, but discoverable both ways)
  ('a_and_r','producer',0.9,true), ('a_and_r','vocals_lead',0.9,true), ('a_and_r','rapper',0.9,true),
  ('manager','vocals_lead',0.8,true), ('manager','band',0.8,true), ('manager','producer',0.8,true),
  ('sync_licensing','composer',1.0,true), ('sync_licensing','producer',0.9,true),
  ('studio_owner','band',0.9,true), ('studio_owner','session_musician',0.9,true), ('studio_owner','recording_engineer',0.9,true),
  ('session_musician','producer',1.0,true), ('session_musician','band',1.1,true),
  ('dj_turntables','producer',0.9,true), ('sound_designer','producer',1.0,true)
on conflict (from_role, to_role) do update set weight = excluded.weight, bidirectional = excluded.bidirectional;

-- Generate reverse edges for bidirectional pairs so discovery works both ways.
insert into public.role_affinities (from_role, to_role, weight, bidirectional)
select to_role, from_role, weight, true from public.role_affinities where bidirectional = true
on conflict (from_role, to_role) do nothing;

-- ── collab_matches v2 — affinity + skill-tier + expanded candidate pool ──────
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
      -- Affinity-inferred: creators offering a role that pairs with one I offer.
      select cu.user_id from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where ra.from_role in (select role_id from my_offers)
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
      -- Affinity-graph strength between my offered roles and theirs (capped).
      least(6.0, coalesce((
        select sum(ra.weight) from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where cu.user_id = c.user_id and ra.from_role in (select role_id from my_offers)
      ), 0))::numeric as affinity,
      -- Avg skill of the candidate on roles I seek that they offer (1..5).
      coalesce((select avg(cr.skill) from public.creator_roles cr
        join my_seeks s on s.role_id = cr.role_id where cr.user_id = c.user_id), 0)::numeric as skill_on_seek,
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
      + s.affinity * 1.5
      + s.skill_on_seek * 0.4
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
    round(b.sim, 3), round(least(1.0, b.raw / 20.0), 3)
  from blended b join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0
      or coalesce(array_length(b.seeks_you_offer,1),0) > 0
      or b.affinity > 0
      or b.sim >= 0.6)
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int) to authenticated;
