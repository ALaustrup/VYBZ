-- ===========================================================================
-- VYBZ Phase B (cont.) — reputation & reliability signal.
--
-- A trust layer derived entirely from in-app data (no external services):
--   • avg star rating across a creator's drops (quality of work)
--   • total ratings received (breadth of validation)
--   • number of accepted connections (social proof)
--   • drop count (activity)
-- Blended into a 0..1 reputation score that (a) nudges match ranking so proven
-- creators surface a bit higher, and (b) is shown on cards/profiles. Honest by
-- construction — it reflects real ratings + connections, not vanity metrics.
-- (Reliability signals like on-time delivery await the projects/handoff phase.)
-- ===========================================================================

set search_path = public, extensions;

-- World-readable aggregate stats (safe public numbers only).
create or replace view public.creator_stats with (security_invoker = off) as
  select p.id as user_id,
    coalesce(round(avg(a.rating_avg) filter (where a.rating_count > 0), 2), 0) as avg_rating,
    coalesce(sum(a.rating_count), 0)::int as ratings,
    count(distinct d.id)::int as drops,
    (select count(*) from public.connections c
       where (c.requester_id = p.id or c.addressee_id = p.id) and c.status = 'accepted')::int as connections
  from public.profiles p
  left join public.drops d on d.author_id = p.id
  left join public.assets a on a.id = d.asset_id
  group by p.id;
grant select on public.creator_stats to anon, authenticated;

-- 0..1 reputation score (rating-weighted, with social-proof + activity boosts).
create or replace function public.creator_reputation(p_id uuid)
returns numeric language sql stable security definer set search_path = public as $fn$
  select round(least(1.0,
      coalesce((select avg_rating from public.creator_stats where user_id = p_id), 0) / 5.0 * 0.6
    + least(1.0, coalesce((select ratings from public.creator_stats where user_id = p_id), 0) / 20.0) * 0.25
    + least(1.0, coalesce((select connections from public.creator_stats where user_id = p_id), 0) / 10.0) * 0.15
  ), 3);
$fn$;
grant execute on function public.creator_reputation(uuid) to anon, authenticated;

-- ── collab_matches v3 — add reputation to ranking + return it ─────────────────
drop function if exists public.collab_matches(int);
create or replace function public.collab_matches(p_limit int default 20)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric
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
    round(b.sim, 3), round(b.reputation, 3), round(least(1.0, b.raw / 21.0), 3)
  from blended b join public.profiles pr on pr.id = b.user_id
  where (coalesce(array_length(b.offers_you_seek,1),0) > 0
      or coalesce(array_length(b.seeks_you_offer,1),0) > 0
      or b.affinity > 0
      or b.sim >= 0.6)
  order by b.raw desc, b.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int) to authenticated;

-- Public reputation + stats for a profile page.
create or replace function public.creator_profile_stats(p_id uuid)
returns table(avg_rating numeric, ratings int, drops int, connections int, reputation numeric)
language sql stable security definer set search_path = public as $fn$
  select s.avg_rating, s.ratings, s.drops, s.connections, public.creator_reputation(p_id)
  from public.creator_stats s where s.user_id = p_id;
$fn$;
grant execute on function public.creator_profile_stats(uuid) to anon, authenticated;
