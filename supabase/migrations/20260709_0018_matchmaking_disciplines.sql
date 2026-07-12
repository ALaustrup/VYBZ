-- ===========================================================================
-- VYBZ — matchmaking upgrade for multi-discipline profiles (P4).
--
-- Extends collab_matches to understand discipline MODULES:
--   • "shared disciplines" — you both actively practice the same discipline,
--   • module attribute overlap (specializations/genres/tools/styles/engines…),
--   • seeking-intent alignment (paid/collab/mentorship/cofounding/spark),
--   • an optional category filter (Music / Film / Visual Arts / Game Dev),
-- and seeds a cross/within-discipline affinity graph for the new verticals so
-- complementary creators surface even without explicit declarations.
-- The existing return shape is preserved and a `shared_disciplines` column is
-- appended (additive for the client).
-- ===========================================================================

set search_path = public, extensions;

-- ── Affinity edges for the new verticals (complementary collaborators) ──────
insert into public.role_affinities (from_role, to_role, weight, bidirectional) values
  -- Game development
  ('game_designer','game_programmer',1.5,true), ('game_designer','game_artist',1.4,true),
  ('game_designer','narrative_designer',1.3,true), ('game_designer','level_designer',1.3,true),
  ('game_designer','systems_designer',1.3,true), ('game_designer','game_audio_designer',1.1,true),
  ('game_designer','ui_ux_designer_game',1.1,true), ('game_designer','producer_game',1.0,true),
  ('game_programmer','technical_artist',1.3,true), ('game_artist','technical_artist',1.1,true),
  ('game_artist','game_audio_designer',0.8,true), ('narrative_designer','level_designer',1.0,true),
  -- Film & video
  ('director','cinematographer',1.5,true), ('director','screenwriter_film',1.4,true),
  ('director','video_editor',1.3,true), ('director','producer_film',1.2,true),
  ('director','composer_score',1.2,true), ('cinematographer','gaffer',1.3,true),
  ('video_editor','colorist',1.3,true), ('video_editor','motion_designer',1.1,true),
  ('video_editor','vfx_artist',1.1,true), ('video_editor','sound_designer_film',1.1,true),
  ('composer_score','sound_designer_film',1.0,true),
  -- Visual arts
  ('illustrator','concept_artist',1.3,true), ('concept_artist','3d_modeler',1.2,true),
  ('3d_modeler','character_artist',1.3,true), ('character_artist','animator_3d',1.3,true),
  ('3d_modeler','animator_3d',1.2,true), ('illustrator','graphic_designer',1.0,true),
  ('graphic_designer','animator_2d',0.9,true), ('photographer','photo_editor',1.4,true),
  -- Cross-discipline adjacency (music ↔ film, art ↔ product)
  ('producer','composer_score',1.2,true), ('graphic_designer','producer',0.9,true),
  ('illustrator','game_artist',1.0,true), ('concept_artist','game_designer',0.9,true)
on conflict (from_role, to_role) do update set weight = excluded.weight, bidirectional = excluded.bidirectional;

-- Generate reverse edges for the bidirectional pairs (discovery works both ways).
insert into public.role_affinities (from_role, to_role, weight, bidirectional)
select to_role, from_role, weight, true from public.role_affinities where bidirectional = true
on conflict (from_role, to_role) do nothing;

-- ── collab_matches v3 — discipline-aware + category filter ──────────────────
drop function if exists public.collab_matches(int);

create or replace function public.collab_matches(p_limit int default 20, p_category text default null)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[]
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
  my_disc   as (select role_id from public.profile_modules where user_id = auth.uid() and archived_at is null),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  me_attrs  as (
    select distinct e.v as v from public.profile_modules m,
      lateral jsonb_each(m.attrs) kv,
      lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value)='array' then kv.value else '[]'::jsonb end) as e(v)
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  me_intents as (
    select distinct s as v
    from public.profile_modules m, lateral unnest(m.seeking) s
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  cand as (
    select distinct user_id from (
      select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
      union
      select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
      union
      select cu.user_id from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where ra.from_role in (select role_id from my_offers)
      union
      select pm.user_id from public.profile_modules pm
        where pm.archived_at is null and pm.role_id in (select role_id from my_disc)
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
      array(select distinct r.label from public.profile_modules pm join public.roles r on r.id = pm.role_id
            where pm.user_id = c.user_id and pm.archived_at is null and pm.role_id in (select role_id from my_disc)
            order by r.label) as shared_disciplines,
      public.jsonb_overlap_names(p.profile->'genres', me.genres) as shared_genres,
      public.jsonb_overlap_names(p.profile->'daws', me.daws) as shared_daws,
      public.jsonb_overlap_names(p.profile->'plugins', me.plugins) as shared_plugins,
      public.jsonb_overlap_count(p.profile->'languages', me.languages) as shared_langs,
      (select count(*) from (
         select distinct e2.v from public.profile_modules m2,
           lateral jsonb_each(m2.attrs) kv2,
           lateral jsonb_array_elements_text(case when jsonb_typeof(kv2.value)='array' then kv2.value else '[]'::jsonb end) as e2(v)
         where m2.user_id = c.user_id and m2.archived_at is null
       ) cv where cv.v in (select v from me_attrs))::int as shared_attr_count,
      (select count(*) from (
         select distinct s2 from public.profile_modules m3, lateral unnest(m3.seeking) s2
         where m3.user_id = c.user_id and m3.archived_at is null
       ) ci where ci.s2 in (select v from me_intents))::int as intent_align,
      least(6.0, coalesce((
        select sum(ra.weight) from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where cu.user_id = c.user_id and ra.from_role in (select role_id from my_offers)
      ), 0))::numeric as affinity,
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
      public.creator_reputation(c.user_id) as reputation,
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
      + coalesce(array_length(s.shared_disciplines,1),0) * 4.0
      + least(6, s.shared_attr_count) * 0.7
      + least(4, s.intent_align) * 0.5
      + s.affinity * 1.5
      + s.skill_on_seek * 0.4
      + coalesce(array_length(s.shared_genres,1),0) * 1.4
      + coalesce(array_length(s.shared_daws,1),0) * 1.2
      + least(5, coalesce(array_length(s.shared_plugins,1),0)) * 0.9
      + s.shared_langs * 0.5
      + case when s.tempo_fit then 0.6 else 0 end
      + s.sim * 3.0
      + s.reputation * 1.5
      + case when s.open_to_work then 1.0 else 0 end ) as raw
    from scored s
  )
  select b.user_id, pr.username, pr.username,
    b.offers_you_seek, b.seeks_you_offer,
    (coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0),
    b.shared_genres, b.shared_daws, b.shared_plugins, b.open_to_work,
    round(b.sim, 3), round(b.reputation, 3), round(least(1.0, b.raw / 28.0), 3),
    b.shared_disciplines
  from blended b join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0
      or coalesce(array_length(b.seeks_you_offer,1),0) > 0
      or coalesce(array_length(b.shared_disciplines,1),0) > 0
      or b.affinity > 0
      or b.sim >= 0.6)
    and (p_category is null or exists (
      select 1 from public.profile_modules pm
      where pm.user_id = b.user_id and pm.archived_at is null and pm.category = p_category))
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int, text) to authenticated;
