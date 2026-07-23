-- Network precision (§5.4i): hard filters on collab_matches + kind/budget on my_opportunities.
-- Soft ranking is unchanged; filters only exclude non-negotiables.

drop function if exists public.collab_matches(int, text);
drop function if exists public.collab_matches(int, text, boolean, text, text);

create or replace function public.collab_matches(
  p_limit int default 20,
  p_category text default null,
  p_remote_only boolean default null,
  p_daw text default null,
  p_language text default null
)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[], confidence numeric, role_class text,
  shared_professions text[]
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select id,
           coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max,
           coalesce(nullif(profile->>'roleClass',''),'creator') as role_class,
           public.profile_profession_ids(profile) as professions
    from public.profiles where id = auth.uid()
  ),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid()),
  my_seeks  as (select role_id from public.creator_seeks where user_id = auth.uid()),
  my_disc   as (select role_id from public.profile_modules where user_id = auth.uid() and archived_at is null),
  my_proj   as (select id from public.profile_projects where user_id = auth.uid() and archived_at is null),
  my_follows as (select project_id from public.project_follows where user_id = auth.uid()),
  me_vec    as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  me_attrs  as (
    select distinct e.v as v from public.profile_modules m,
      lateral jsonb_each(m.attrs) kv,
      lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value)='array' then kv.value else '[]'::jsonb end) as e(v)
    where m.user_id = auth.uid() and m.archived_at is null
  ),
  me_intents as (
    select distinct s as v from public.profile_modules m, lateral unnest(m.seeking) s
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
      select pr.user_id from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
        where f.user_id = auth.uid() and pr.archived_at is null
      union
      select f.user_id from public.project_follows f where f.project_id in (select id from my_proj)
      union
      select sem.user_id from (
        select e.user_id from public.profile_embeddings e
        where exists (select 1 from me_vec) and e.user_id <> auth.uid()
        order by e.embedding <=> (select embedding from me_vec) limit 200
      ) sem
      union
      select p2.id as user_id from public.profiles p2, me
      where p2.id <> auth.uid() and coalesce(p2.banned,false) = false
        and cardinality(me.professions) > 0
        and public.profile_profession_ids(p2.profile) && me.professions
    ) u where user_id <> auth.uid()
  ),
  scored as (
    select c.user_id,
      me.role_class as caller_class,
      coalesce(nullif(p.profile->>'roleClass',''),'creator') as cand_class,
      array(select r.label from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id
            join public.roles r on r.id = cr.role_id where cr.user_id = c.user_id order by r.family, r.sort) as offers_you_seek,
      array(select r.label from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id
            join public.roles r on r.id = cs.role_id where cs.user_id = c.user_id order by r.family, r.sort) as seeks_you_offer,
      array(select distinct r.label from public.profile_modules pm join public.roles r on r.id = pm.role_id
            where pm.user_id = c.user_id and pm.archived_at is null and pm.role_id in (select role_id from my_disc)
            order by r.label) as shared_disciplines,
      array(
        select x from (
          select unnest(me.professions)
          intersect
          select unnest(public.profile_profession_ids(p.profile))
        ) s(x) order by x
      ) as shared_professions,
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
      (select count(*) from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
         where pr.user_id = c.user_id and pr.archived_at is null and f.user_id = auth.uid())::int as i_follow_them,
      (select count(*) from public.project_follows f where f.user_id = c.user_id and f.project_id in (select id from my_proj))::int as they_follow_me,
      (select count(*) from public.project_follows f where f.user_id = c.user_id and f.project_id in (select project_id from my_follows))::int as shared_follows,
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
      coalesce((p.profile->>'openToWork')::boolean, false) as open_to_work,
      coalesce((p.profile->>'remoteOk')::boolean, false) as remote_ok,
      public.profile_profession_ids(p.profile) as cand_professions,
      coalesce(p.profile->'daws','[]'::jsonb) as cand_daws,
      coalesce(p.profile->'languages','[]'::jsonb) as cand_languages
    from cand c
    join public.profiles p on p.id = c.user_id
    cross join me
    left join public.profile_embeddings pe on pe.user_id = c.user_id
    where coalesce(p.banned, false) = false
  ),
  blended as (
    select s.*,
      ( coalesce(array_length(s.offers_you_seek,1),0) * public.mm_w('offers',3.0)
      + coalesce(array_length(s.seeks_you_offer,1),0) * public.mm_w('seeks',3.0)
      + case when coalesce(array_length(s.offers_you_seek,1),0) > 0 and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then public.mm_w('mutual',4.0) else 0 end
      + coalesce(array_length(s.shared_disciplines,1),0) * public.mm_w('shared_discipline',4.0)
      + least(6, s.shared_attr_count) * public.mm_w('attr',0.7)
      + least(4, s.intent_align) * public.mm_w('intent',0.5)
      + least(4, s.i_follow_them) * public.mm_w('follow_their',2.5)
      + least(4, s.they_follow_me) * public.mm_w('follow_mine',2.0)
      + least(6, s.shared_follows) * public.mm_w('shared_follow',0.6)
      + s.affinity * public.mm_w('affinity',1.5)
      + s.skill_on_seek * public.mm_w('skill',0.4)
      + coalesce(array_length(s.shared_genres,1),0) * public.mm_w('genre',1.4)
      + coalesce(array_length(s.shared_daws,1),0) * public.mm_w('daw',1.2)
      + least(5, coalesce(array_length(s.shared_plugins,1),0)) * public.mm_w('plugin',0.9)
      + s.shared_langs * public.mm_w('lang',0.5)
      + case when s.tempo_fit then public.mm_w('tempo',0.6) else 0 end
      + s.sim * public.mm_w('resonance',3.0)
      + s.reputation * public.mm_w('reputation',1.5)
      + case when s.open_to_work then public.mm_w('open',1.0) else 0 end
      + case when (s.caller_class <> 'creator' and coalesce(array_length(s.offers_you_seek,1),0) > 0)
                or (s.cand_class <> 'creator' and coalesce(array_length(s.seeks_you_offer,1),0) > 0)
             then public.mm_w('roleclass',1.0) else 0 end
      + least(2, coalesce(array_length(s.shared_professions,1),0)) * public.mm_w('profession',2.0)
      + case when p_category is not null and p_category = any (s.cand_professions)
             then public.mm_w('profession_scope',1.5) else 0 end
      ) as raw
    from scored s
  ),
  finalized as (
    select b.*,
      least(1.0, b.raw / public.mm_w('divisor',32.0)) as fit_val,
      (case when b.caller_class = 'creator' and b.cand_class <> 'creator' then 1 else 0 end) as demote,
      ( (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 or coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_disciplines,1),0) > 0 then 1 else 0 end)
      + (case when b.affinity > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_genres,1),0) > 0 or coalesce(array_length(b.shared_daws,1),0) > 0 or coalesce(array_length(b.shared_plugins,1),0) > 0 then 1 else 0 end)
      + (case when b.sim >= 0.5 then 1 else 0 end)
      + (case when b.reputation >= 0.3 then 1 else 0 end)
      + (case when b.i_follow_them > 0 or b.they_follow_me > 0 or b.shared_follows > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_professions,1),0) > 0 then 1 else 0 end)
      ) as evidence
    from blended b
  )
  select f.user_id, pr.username, pr.username,
    f.offers_you_seek, f.seeks_you_offer,
    (coalesce(array_length(f.offers_you_seek,1),0) > 0 and coalesce(array_length(f.seeks_you_offer,1),0) > 0),
    f.shared_genres, f.shared_daws, f.shared_plugins, f.open_to_work,
    round(f.sim, 3), round(f.reputation, 3), round(f.fit_val, 3),
    f.shared_disciplines,
    round(least(1.0, 0.55 * (f.evidence / 9.0) + 0.45 * least(1.0, f.fit_val * 1.25)), 3) as confidence,
    f.cand_class as role_class,
    f.shared_professions
  from finalized f join public.profiles pr on pr.id = f.user_id
  where (coalesce(array_length(f.offers_you_seek,1),0) > 0
      or coalesce(array_length(f.seeks_you_offer,1),0) > 0
      or coalesce(array_length(f.shared_disciplines,1),0) > 0
      or coalesce(array_length(f.shared_professions,1),0) > 0
      or f.affinity > 0 or f.sim >= 0.6
      or f.i_follow_them > 0 or f.they_follow_me > 0)
    and (
      p_category is null
      or p_category = any (f.cand_professions)
      or exists (
        select 1 from public.profile_modules pm
        where pm.user_id = f.user_id and pm.archived_at is null and pm.category = p_category
      )
    )
    -- Hard filters (§5.4i): non-negotiables, not soft boosts
    and (p_remote_only is distinct from true or f.remote_ok = true)
    and (p_daw is null or p_daw = '' or f.cand_daws ? p_daw)
    and (p_language is null or p_language = '' or f.cand_languages ? p_language)
  order by f.demote asc, f.raw desc, f.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;

grant execute on function public.collab_matches(int, text, boolean, text, text) to authenticated;

-- Ranked openings: include commission columns so For-you can show budget/kind.
drop function if exists public.my_opportunities(int);
create or replace function public.my_opportunities(p_limit int default 40)
returns table(
  id uuid, author_id uuid, author_alias text, author_username text,
  role_needed text, role_label text, title text, body text,
  genres text[], daws text[], remote_ok boolean, location text, commitment text,
  created_at timestamptz, shared_genres text[], shared_daws text[], applied boolean, fit numeric,
  kind text, budget text
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
      + 2.0) / 8.0))::numeric, 3) as fit,
    cp.kind, cp.budget
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
