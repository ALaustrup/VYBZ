-- ===========================================================================
-- VYBZ Phase 2 — the matchmaking engine (collab_matches).
--
-- A generic role-complementarity model (§7): for caller ME and candidate U,
--   forward  = |me.seeks ∩ u.offers|   (they have what I want)
--   backward = |u.seeks ∩ me.offers|   (I have what they want)
--   mutual   = both > 0                (the gold standard — two-way fit)
-- blended with music-domain overlap (genres, DAWs, plugins, tempo, languages)
-- and semantic resonance (profile_embeddings). No pairs are ever hardcoded, so
-- drummer⇄pianist / vocalist⇄band / guitarist⇄beatmaker surface each other
-- automatically, in both directions.
--
-- SECURITY DEFINER (mirrors user_matches): reads private facets to sharpen YOUR
-- matches, but only ever emits aggregates + role labels — never raw private
-- values. user_matches is left intact for generic social use.
-- ===========================================================================

create or replace function public.collab_matches(p_limit int default 20)
returns table(
  user_id uuid,
  username text,
  alias text,
  offers_you_seek text[],   -- roles THEY offer that YOU seek (forward)
  seeks_you_offer text[],   -- roles THEY seek that YOU offer (backward)
  mutual boolean,
  shared_genres text[],
  shared_daws text[],
  shared_plugins text[],
  open_to_work boolean,
  resonance numeric,        -- 0..1 semantic similarity
  fit numeric               -- 0..1 blended
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres',  '[]'::jsonb) as genres,
           coalesce(profile->'daws',    '[]'::jsonb) as daws,
           coalesce(profile->'plugins', '[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric   as tempo_min,
           nullif(profile->>'tempoMax','')::numeric   as tempo_max
    from public.profiles where id = auth.uid()
  ),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  -- Candidate pool: offers something I seek, OR seeks something I offer, OR is
  -- semantically near me (so thin profiles still match). ORDER/LIMIT is wrapped
  -- so it binds to the semantic branch, not the whole UNION.
  cand as (
    select distinct user_id from (
      select cr.user_id from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
      union
      select cs.user_id from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
      union
      select sem.user_id from (
        select e.user_id from public.profile_embeddings e
        where exists (select 1 from me_vec) and e.user_id <> auth.uid()
        order by e.embedding <=> (select embedding from me_vec)
        limit 200
      ) sem
    ) u
    where user_id <> auth.uid()
  ),
  scored as (
    select
      c.user_id,
      array(select r.label from public.creator_roles cr
              join my_seeks s on s.role_id = cr.role_id
              join public.roles r on r.id = cr.role_id
             where cr.user_id = c.user_id
             order by r.family, r.sort)                       as offers_you_seek,
      array(select r.label from public.creator_seeks cs
              join my_offers o on o.role_id = cs.role_id
              join public.roles r on r.id = cs.role_id
             where cs.user_id = c.user_id
             order by r.family, r.sort)                       as seeks_you_offer,
      public.jsonb_overlap_names(p.profile->'genres',    me.genres)    as shared_genres,
      public.jsonb_overlap_names(p.profile->'daws',      me.daws)      as shared_daws,
      public.jsonb_overlap_names(p.profile->'plugins',   me.plugins)   as shared_plugins,
      public.jsonb_overlap_count(p.profile->'languages', me.languages) as shared_langs,
      -- Tempo affinity: do the two BPM ranges overlap?
      (case
        when me.tempo_min is not null and me.tempo_max is not null
         and nullif(p.profile->>'tempoMin','')::numeric is not null
         and nullif(p.profile->>'tempoMax','')::numeric is not null
         and me.tempo_min <= nullif(p.profile->>'tempoMax','')::numeric
         and me.tempo_max >= nullif(p.profile->>'tempoMin','')::numeric
        then true else false end)                             as tempo_fit,
      (case when exists (select 1 from me_vec) and pe.embedding is not null
            then greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec)))
            else 0 end)::numeric                              as sim,
      coalesce((p.profile->>'openToWork')::boolean, false)     as open_to_work
    from cand c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join public.profile_embeddings pe on pe.user_id = c.user_id
    where coalesce(p.banned, false) = false
      and coalesce(p.anonymous, false) = false
  ),
  blended as (
    select s.*,
      ( coalesce(array_length(s.offers_you_seek,1),0) * 3.0
      + coalesce(array_length(s.seeks_you_offer,1),0) * 3.0
      + case when coalesce(array_length(s.offers_you_seek,1),0) > 0
              and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then 4.0 else 0 end
      + coalesce(array_length(s.shared_genres,1),0)  * 1.4
      + coalesce(array_length(s.shared_daws,1),0)    * 1.2
      + least(5, coalesce(array_length(s.shared_plugins,1),0)) * 0.9
      + s.shared_langs * 0.5
      + case when s.tempo_fit then 0.6 else 0 end
      + s.sim * 3.0
      + case when s.open_to_work then 1.0 else 0 end ) as raw
    from scored s
  )
  select
    b.user_id, pr.username, pr.alias,
    b.offers_you_seek, b.seeks_you_offer,
    ( coalesce(array_length(b.offers_you_seek,1),0) > 0
      and coalesce(array_length(b.seeks_you_offer,1),0) > 0 ) as mutual,
    b.shared_genres, b.shared_daws, b.shared_plugins,
    b.open_to_work,
    round(b.sim, 3) as resonance,
    round(least(1.0, b.raw / 18.0), 3) as fit
  from blended b
  join public.profiles pr on pr.id = b.user_id
  where ( coalesce(array_length(b.offers_you_seek,1),0) > 0
       or coalesce(array_length(b.seeks_you_offer,1),0) > 0
       or b.sim >= 0.6 )
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int) to authenticated;
