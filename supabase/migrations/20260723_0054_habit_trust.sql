-- Habit + trust (§5.4g / §5.4j / §5.4f):
--   • freshness + co-Vyb soft signals in collab_matches
--   • post-collab ratings → reputation
-- Digest / Stripe tips stay deferred (infra-gated).

-- ── mm_defaults: add habit/trust weights ─────────────────────────────────────
create or replace function public.mm_defaults()
returns jsonb language sql immutable set search_path = public as $fn$
  select jsonb_build_object(
    'offers', 3.0, 'seeks', 3.0, 'mutual', 4.0, 'shared_discipline', 4.0,
    'attr', 0.7, 'intent', 0.5, 'follow_their', 2.5, 'follow_mine', 2.0,
    'shared_follow', 0.6, 'affinity', 1.5, 'skill', 0.4, 'genre', 1.4,
    'daw', 1.2, 'plugin', 0.9, 'lang', 0.5, 'tempo', 0.6, 'resonance', 3.0,
    'reputation', 1.5, 'open', 1.0, 'roleclass', 1.0, 'profession', 2.0,
    'profession_scope', 1.5, 'freshness', 1.2, 'covyb', 0.8, 'divisor', 32.0
  );
$fn$;

-- ── Post-collab ratings ──────────────────────────────────────────────────────
create table if not exists public.collab_ratings (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  rater_id uuid not null references public.profiles(id) on delete cascade,
  ratee_id uuid not null references public.profiles(id) on delete cascade,
  rating int not null check (rating between 1 and 5),
  created_at timestamptz not null default now(),
  constraint collab_ratings_pair unique (project_id, rater_id, ratee_id),
  constraint collab_ratings_not_self check (rater_id <> ratee_id)
);
create index if not exists collab_ratings_ratee_idx on public.collab_ratings(ratee_id, created_at desc);
create index if not exists collab_ratings_project_idx on public.collab_ratings(project_id);

alter table public.collab_ratings enable row level security;

drop policy if exists "collab_ratings read members" on public.collab_ratings;
create policy "collab_ratings read members" on public.collab_ratings
  for select using (
    public.is_project_member(project_id, auth.uid())
    or ratee_id = auth.uid()
    or rater_id = auth.uid()
  );

drop policy if exists "collab_ratings insert own" on public.collab_ratings;
create policy "collab_ratings insert own" on public.collab_ratings
  for insert with check (rater_id = auth.uid());

drop policy if exists "collab_ratings update own" on public.collab_ratings;
create policy "collab_ratings update own" on public.collab_ratings
  for update using (rater_id = auth.uid()) with check (rater_id = auth.uid());

grant select, insert, update on public.collab_ratings to authenticated;

create or replace function public.rate_collaborator(p_project uuid, p_ratee uuid, p_rating int)
returns void
language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null then raise exception 'Not signed in'; end if;
  if p_ratee = uid then raise exception 'Cannot rate yourself'; end if;
  if p_rating < 1 or p_rating > 5 then raise exception 'Rating must be 1–5'; end if;
  if not exists (
    select 1 from public.projects p
    where p.id = p_project and p.status = 'released'
  ) then raise exception 'Project is not released'; end if;
  if not public.is_project_member(p_project, uid) then raise exception 'Not a member'; end if;
  if not public.is_project_member(p_project, p_ratee) then raise exception 'Ratee is not a member'; end if;

  insert into public.collab_ratings (project_id, rater_id, ratee_id, rating)
  values (p_project, uid, p_ratee, p_rating)
  on conflict (project_id, rater_id, ratee_id)
  do update set rating = excluded.rating, created_at = now();
end;
$fn$;
grant execute on function public.rate_collaborator(uuid, uuid, int) to authenticated;

create or replace function public.project_collab_ratings(p_project uuid)
returns table(ratee_id uuid, rating int)
language sql security definer set search_path = public stable as $fn$
  select r.ratee_id, r.rating
  from public.collab_ratings r
  where r.project_id = p_project and r.rater_id = auth.uid()
    and public.is_project_member(p_project, auth.uid());
$fn$;
grant execute on function public.project_collab_ratings(uuid) to authenticated;

-- Fold post-collab ratings into reputation (§5.4f).
create or replace function public.creator_reputation(p_id uuid)
returns numeric language sql stable security definer set search_path = public as $fn$
  select round(least(1.0,
      coalesce((select avg_rating from public.creator_stats where user_id = p_id), 0) / 5.0 * 0.4
    + least(1.0, coalesce((select ratings from public.creator_stats where user_id = p_id), 0) / 20.0) * 0.15
    + least(1.0, coalesce((select connections from public.creator_stats where user_id = p_id), 0) / 10.0) * 0.1
    + least(1.0, (select count(*) from public.projects p
        join public.project_collaborators c on c.project_id = p.id and c.user_id = p_id
        left join public.split_sheets s on s.project_id = p.id and s.user_id = p_id
        where p.status = 'released' and coalesce(s.agreed,false) = true) / 5.0) * 0.15
    + least(1.0, coalesce((select avg(rating)::numeric from public.collab_ratings where ratee_id = p_id), 0) / 5.0) * 0.2
  ), 3);
$fn$;

-- ── collab_matches: freshness (§5.4j) + co-Vyb (§5.4g) ───────────────────────
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
  my_feels as (
    select drop_id from public.reactions
    where user_id = auth.uid() and reaction = 'feel'
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
      coalesce(p.profile->'languages','[]'::jsonb) as cand_languages,
      -- §5.4j: newer accounts surface; decay over ~90 days
      least(1.0, greatest(0.0,
        1.0 - extract(epoch from (now() - p.created_at)) / (90.0 * 86400.0)
      ))::numeric as account_fresh,
      -- underexposure: keep low-rep creators visible
      least(1.0, greatest(0.0, 1.0 - public.creator_reputation(c.user_id)))::numeric as underexposed,
      -- §5.4g: shared feel reactions on the same drops
      (select count(*)::int from public.reactions r2
        where r2.user_id = c.user_id and r2.reaction = 'feel'
          and r2.drop_id in (select drop_id from my_feels)
      ) as covyb_n
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
      + (0.55 * s.account_fresh + 0.45 * s.underexposed) * public.mm_w('freshness',1.2)
      + least(5, s.covyb_n) * public.mm_w('covyb',0.8)
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
      + (case when b.covyb_n > 0 then 1 else 0 end)
      ) as evidence
    from blended b
  )
  select f.user_id, pr.username, pr.username,
    f.offers_you_seek, f.seeks_you_offer,
    (coalesce(array_length(f.offers_you_seek,1),0) > 0 and coalesce(array_length(f.seeks_you_offer,1),0) > 0),
    f.shared_genres, f.shared_daws, f.shared_plugins, f.open_to_work,
    round(f.sim, 3), round(f.reputation, 3), round(f.fit_val, 3),
    f.shared_disciplines,
    round(least(1.0, 0.55 * (f.evidence / 10.0) + 0.45 * least(1.0, f.fit_val * 1.25)), 3) as confidence,
    f.cand_class as role_class,
    f.shared_professions
  from finalized f join public.profiles pr on pr.id = f.user_id
  where (coalesce(array_length(f.offers_you_seek,1),0) > 0
      or coalesce(array_length(f.seeks_you_offer,1),0) > 0
      or coalesce(array_length(f.shared_disciplines,1),0) > 0
      or coalesce(array_length(f.shared_professions,1),0) > 0
      or f.affinity > 0 or f.sim >= 0.6
      or f.i_follow_them > 0 or f.they_follow_me > 0
      or f.covyb_n >= 2)
    and (
      p_category is null
      or p_category = any (f.cand_professions)
      or exists (
        select 1 from public.profile_modules pm
        where pm.user_id = f.user_id and pm.archived_at is null and pm.category = p_category
      )
    )
    and (p_remote_only is distinct from true or f.remote_ok = true)
    and (p_daw is null or p_daw = '' or f.cand_daws ? p_daw)
    and (p_language is null or p_language = '' or f.cand_languages ? p_language)
  order by f.demote asc, f.raw desc, f.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;

grant execute on function public.collab_matches(int, text, boolean, text, text) to authenticated;
