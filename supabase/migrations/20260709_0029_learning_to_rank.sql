-- ===========================================================================
-- VYBZ — Learning-to-Rank + Match confidence (masterplan §5.4h, §5.4k)
--
-- Closes the loop opened by match_feedback (0028): outcomes now *tune the
-- ranking*. Every connect/pass/accept/decline snapshots the normalized signal
-- vector between the two creators; a periodic tuner reads those outcomes and
-- nudges each signal's weight toward what actually converts — while the
-- hand-tuned defaults remain the floor and admin overrides always win.
--
-- Adds:
--   1. mm_defaults()                 — canonical base weights (single source).
--   2. matchmaking_learning          — learned weights + explainable report.
--   3. mm_w() v2                      — admin override > learned > default.
--   4. match_signal_vector()         — normalized 0..1 signal map for a pair
--                                      (drives both feedback snapshots + the
--                                      confidence read).
--   5. log_match_feedback / respond_connection — snapshot signals on write.
--   6. tune_matchmaking_weights()    — outcome-driven weight tuning (the LTR).
--   7. run_match_learning() / match_learning_report() — admin surface.
--   8. collab_matches v6             — returns an explainable `confidence`.
-- Everything is additive, idempotent, RLS-safe, and definer-gated.
-- ===========================================================================

set search_path = public, extensions;

-- ── 1. Canonical base weights ───────────────────────────────────────────────
-- The one place default weights live. mm_w() falls back here; the tuner uses
-- these as the base it scales. Keep in sync with collab_matches call sites.
create or replace function public.mm_defaults()
returns jsonb language sql immutable set search_path = public as $fn$
  select jsonb_build_object(
    'offers', 3.0, 'seeks', 3.0, 'mutual', 4.0, 'shared_discipline', 4.0,
    'attr', 0.7, 'intent', 0.5, 'follow_their', 2.5, 'follow_mine', 2.0,
    'shared_follow', 0.6, 'affinity', 1.5, 'skill', 0.4, 'genre', 1.4,
    'daw', 1.2, 'plugin', 0.9, 'lang', 0.5, 'tempo', 0.6, 'resonance', 3.0,
    'reputation', 1.5, 'open', 1.0, 'divisor', 30.0
  );
$fn$;

-- ── 2. Learned-weight store (single row) ────────────────────────────────────
create table if not exists public.matchmaking_learning (
  id             int primary key default 1 check (id = 1),
  learned        jsonb not null default '{}'::jsonb,  -- key -> tuned weight
  report         jsonb not null default '{}'::jsonb,  -- key -> {base,learned,multiplier,pos,neg,support}
  runs           int   not null default 0,
  feedback_count int   not null default 0,
  updated_at     timestamptz not null default now()
);
insert into public.matchmaking_learning (id) values (1) on conflict (id) do nothing;
alter table public.matchmaking_learning enable row level security;
-- No direct client access; read via match_learning_report(), write via tuner.

-- ── 3. Weight lookup v2 — admin override > learned > coded default ───────────
create or replace function public.mm_w(k text, d numeric)
returns numeric language sql stable security definer set search_path = public as $fn$
  select coalesce(
    (select (config->>k)::numeric  from public.matchmaking_config   where id = 1 and config  ? k),
    (select (learned->>k)::numeric from public.matchmaking_learning where id = 1 and learned ? k),
    d
  );
$fn$;

-- ── 4. Pairwise normalized signal vector ────────────────────────────────────
-- Every matchmaking signal, scored 0..1, for the caller p_me toward candidate
-- p_peer. Definer so it can read private facets, but it only ever emits the
-- normalized aggregate strengths (never raw facets). This is the shared truth
-- behind feedback snapshots (for LTR) and the confidence read.
create or replace function public.match_signal_vector(p_me uuid, p_peer uuid)
returns jsonb language sql stable security definer set search_path = public as $fn$
  with me as (
    select coalesce(profile->'genres','[]'::jsonb) as genres,
           coalesce(profile->'daws','[]'::jsonb) as daws,
           coalesce(profile->'plugins','[]'::jsonb) as plugins,
           coalesce(profile->'languages','[]'::jsonb) as languages,
           nullif(profile->>'tempoMin','')::numeric as tempo_min,
           nullif(profile->>'tempoMax','')::numeric as tempo_max
    from public.profiles where id = p_me
  ),
  my_offers  as (select role_id from public.creator_roles where user_id = p_me),
  my_seeks   as (select role_id from public.creator_seeks where user_id = p_me),
  my_disc    as (select role_id from public.profile_modules where user_id = p_me and archived_at is null),
  my_proj    as (select id from public.profile_projects where user_id = p_me and archived_at is null),
  my_follows as (select project_id from public.project_follows where user_id = p_me),
  me_vec     as (select embedding from public.profile_embeddings where user_id = p_me),
  me_attrs   as (
    select distinct e.v as v from public.profile_modules m,
      lateral jsonb_each(m.attrs) kv,
      lateral jsonb_array_elements_text(case when jsonb_typeof(kv.value)='array' then kv.value else '[]'::jsonb end) as e(v)
    where m.user_id = p_me and m.archived_at is null
  ),
  me_intents as (
    select distinct s as v from public.profile_modules m, lateral unnest(m.seeking) s
    where m.user_id = p_me and m.archived_at is null
  ),
  p  as (select profile from public.profiles where id = p_peer),
  pe as (select embedding from public.profile_embeddings where user_id = p_peer),
  v as (
    select
      (select count(*) from public.creator_roles cr join my_seeks s on s.role_id = cr.role_id where cr.user_id = p_peer)::int as offers_n,
      (select count(*) from public.creator_seeks cs join my_offers o on o.role_id = cs.role_id where cs.user_id = p_peer)::int as seeks_n,
      (select count(*) from public.profile_modules pm where pm.user_id = p_peer and pm.archived_at is null and pm.role_id in (select role_id from my_disc))::int as disc_n,
      public.jsonb_overlap_count((select profile from p)->'genres',   (select genres   from me)) as genre_n,
      public.jsonb_overlap_count((select profile from p)->'daws',     (select daws     from me)) as daw_n,
      public.jsonb_overlap_count((select profile from p)->'plugins',  (select plugins  from me)) as plugin_n,
      public.jsonb_overlap_count((select profile from p)->'languages',(select languages from me)) as lang_n,
      (select count(*) from (
         select distinct e2.v from public.profile_modules m2,
           lateral jsonb_each(m2.attrs) kv2,
           lateral jsonb_array_elements_text(case when jsonb_typeof(kv2.value)='array' then kv2.value else '[]'::jsonb end) as e2(v)
         where m2.user_id = p_peer and m2.archived_at is null
       ) cv where cv.v in (select v from me_attrs))::int as attr_n,
      (select count(*) from (
         select distinct s2 from public.profile_modules m3, lateral unnest(m3.seeking) s2
         where m3.user_id = p_peer and m3.archived_at is null
       ) ci where ci.s2 in (select v from me_intents))::int as intent_n,
      (select count(*) from public.profile_projects pr join public.project_follows f on f.project_id = pr.id
         where pr.user_id = p_peer and pr.archived_at is null and f.user_id = p_me)::int as i_follow_them,
      (select count(*) from public.project_follows f where f.user_id = p_peer and f.project_id in (select id from my_proj))::int as they_follow_me,
      (select count(*) from public.project_follows f where f.user_id = p_peer and f.project_id in (select project_id from my_follows))::int as shared_follows,
      least(6.0, coalesce((
        select sum(ra.weight) from public.creator_roles cu
        join public.role_affinities ra on ra.to_role = cu.role_id
        where cu.user_id = p_peer and ra.from_role in (select role_id from my_offers)
      ), 0))::numeric as affinity,
      coalesce((select avg(cr.skill) from public.creator_roles cr
        join my_seeks s on s.role_id = cr.role_id where cr.user_id = p_peer), 0)::numeric as skill_on_seek,
      (case when (select tempo_min from me) is not null and (select tempo_max from me) is not null
         and nullif((select profile from p)->>'tempoMin','')::numeric is not null
         and nullif((select profile from p)->>'tempoMax','')::numeric is not null
         and (select tempo_min from me) <= nullif((select profile from p)->>'tempoMax','')::numeric
         and (select tempo_max from me) >= nullif((select profile from p)->>'tempoMin','')::numeric
        then true else false end) as tempo_fit,
      (case when exists (select 1 from me_vec) and (select embedding from pe) is not null
        then greatest(0, 1 - ((select embedding from pe) <=> (select embedding from me_vec))) else 0 end)::numeric as sim,
      public.creator_reputation(p_peer) as reputation,
      coalesce(((select profile from p)->>'openToWork')::boolean, false) as open_to_work
  )
  select jsonb_build_object(
    'offers',            round(least(1.0, offers_n / 2.0), 4),
    'seeks',             round(least(1.0, seeks_n / 2.0), 4),
    'mutual',            case when offers_n > 0 and seeks_n > 0 then 1 else 0 end,
    'shared_discipline', round(least(1.0, disc_n / 2.0), 4),
    'attr',              round(least(1.0, attr_n / 6.0), 4),
    'intent',            round(least(1.0, intent_n / 4.0), 4),
    'follow_their',      round(least(1.0, i_follow_them / 2.0), 4),
    'follow_mine',       round(least(1.0, they_follow_me / 2.0), 4),
    'shared_follow',     round(least(1.0, shared_follows / 6.0), 4),
    'affinity',          round(least(1.0, affinity / 6.0), 4),
    'skill',             round(least(1.0, skill_on_seek / 5.0), 4),
    'genre',             round(least(1.0, genre_n / 3.0), 4),
    'daw',               round(least(1.0, daw_n / 2.0), 4),
    'plugin',            round(least(1.0, plugin_n / 5.0), 4),
    'lang',              round(least(1.0, lang_n / 2.0), 4),
    'tempo',             case when tempo_fit then 1 else 0 end,
    'resonance',         round(sim, 4),
    'reputation',        round(reputation, 4),
    'open',              case when open_to_work then 1 else 0 end
  ) from v;
$fn$;
grant execute on function public.match_signal_vector(uuid, uuid) to authenticated;

-- ── 5. Snapshot signals on every feedback write ─────────────────────────────
alter table public.match_feedback add column if not exists signals jsonb not null default '{}'::jsonb;

create or replace function public.log_match_feedback(p_peer uuid, p_outcome text, p_source text default 'spark')
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_peer is null or p_peer = uid then return; end if;
  if p_outcome not in ('accepted','declined','pass','connect') then
    raise exception 'invalid outcome';
  end if;
  if p_source not in ('spark','connection','connect_page') then
    p_source := 'spark';
  end if;
  insert into public.match_feedback (user_id, peer_id, outcome, source, signals)
  values (uid, p_peer, p_outcome, p_source,
          coalesce(public.match_signal_vector(uid, p_peer), '{}'::jsonb));
end $fn$;
grant execute on function public.log_match_feedback(uuid, text, text) to authenticated;

create or replace function public.respond_connection(p_requester uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_requester is null or p_requester = uid then return false; end if;

  update public.connections
     set status = case when p_accept then 'accepted' else 'declined' end
   where requester_id = p_requester
     and addressee_id = uid
     and status = 'pending';
  get diagnostics updated = row_count;
  if updated = 0 then return false; end if;

  insert into public.match_feedback (user_id, peer_id, outcome, source, signals)
  values (uid, p_requester, case when p_accept then 'accepted' else 'declined' end, 'connection',
          coalesce(public.match_signal_vector(uid, p_requester), '{}'::jsonb));

  if p_accept then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id)
    values (p_requester, 'connection', uid,
            public.uname(uid) || ' accepted your connection', null, uid);
  end if;
  return true;
end $fn$;
grant execute on function public.respond_connection(uuid, boolean) to authenticated;

-- ── 6. The learner — tune weights from outcomes ─────────────────────────────
-- For each tunable signal: compare its average strength among positive
-- outcomes (connect/accept) vs negative (pass/decline). A positive gap means
-- the signal predicts real intent → scale its weight up; a negative gap scales
-- it down. Confidence-shrunk by support so thin data barely moves, and clamped
-- to [0.4×, 2.0×] of the hand-tuned base so no signal is ever zeroed or runs
-- away. Callable by admins (UI button) or unauthenticated cron (auth.uid null).
create or replace function public.tune_matchmaking_weights(
  p_lookback_days int default 120,
  p_lr numeric default 0.6,
  p_min_support int default 6
)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  defs jsonb := public.mm_defaults();
  tunable text[] := array['offers','seeks','mutual','shared_discipline','attr','intent',
    'follow_their','follow_mine','shared_follow','affinity','skill','genre','daw',
    'plugin','lang','tempo','resonance','reputation','open'];
  out_learned jsonb;
  out_report jsonb;
  fb_count int;
begin
  if uid is not null and not public.is_platform_admin() then
    raise exception 'admin only';
  end if;

  select count(*) into fb_count
    from public.match_feedback
   where created_at > now() - make_interval(days => p_lookback_days)
     and signals is not null and signals <> '{}'::jsonb;

  with fb as (
    select (outcome in ('connect','accepted')) as positive, signals
    from public.match_feedback
    where created_at > now() - make_interval(days => p_lookback_days)
      and signals is not null and signals <> '{}'::jsonb
  ),
  agg as (
    select k as key,
      coalesce((defs->>k)::numeric, 1.0) as base,
      coalesce(avg((f.signals->>k)::numeric) filter (where f.positive     and f.signals ? k), 0) as posv,
      coalesce(avg((f.signals->>k)::numeric) filter (where not f.positive and f.signals ? k), 0) as negv,
      count(*) filter (where f.signals ? k and (f.signals->>k)::numeric > 0) as support
    from unnest(tunable) as k
    left join fb f on true
    group by k
  ),
  calc as (
    select key, base, posv, negv, support,
      greatest(0.4, least(2.0,
        1 + p_lr * (posv - negv) * (support::numeric / (support + p_min_support))
      )) as mult
    from agg
  )
  select
    jsonb_object_agg(key, round(base * mult, 4)),
    jsonb_object_agg(key, jsonb_build_object(
      'base', base, 'learned', round(base * mult, 4), 'multiplier', round(mult, 3),
      'pos', round(posv, 3), 'neg', round(negv, 3), 'support', support))
  into out_learned, out_report
  from calc;

  update public.matchmaking_learning
     set learned = coalesce(out_learned, '{}'::jsonb),
         report  = coalesce(out_report, '{}'::jsonb),
         runs = runs + 1, feedback_count = fb_count, updated_at = now()
   where id = 1;

  return jsonb_build_object('feedback_count', fb_count,
                            'learned', coalesce(out_learned, '{}'::jsonb),
                            'report', coalesce(out_report, '{}'::jsonb));
end $fn$;
grant execute on function public.tune_matchmaking_weights(int, numeric, int) to authenticated;

-- ── 7. Admin surface ────────────────────────────────────────────────────────
create or replace function public.run_match_learning()
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  return public.tune_matchmaking_weights();
end $fn$;
grant execute on function public.run_match_learning() to authenticated;

create or replace function public.match_learning_report()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when public.is_platform_admin() then
    jsonb_build_object(
      'report', coalesce((select report from public.matchmaking_learning where id = 1), '{}'::jsonb),
      'learned', coalesce((select learned from public.matchmaking_learning where id = 1), '{}'::jsonb),
      'runs', coalesce((select runs from public.matchmaking_learning where id = 1), 0),
      'feedbackCount', coalesce((select feedback_count from public.matchmaking_learning where id = 1), 0),
      'updatedAt', (select updated_at from public.matchmaking_learning where id = 1)
    )
  else '{}'::jsonb end;
$fn$;
grant execute on function public.match_learning_report() to authenticated;

-- ── 8. collab_matches v6 — same blend, now with an explainable confidence ────
drop function if exists public.collab_matches(int, text);
create or replace function public.collab_matches(p_limit int default 20, p_category text default null)
returns table(
  user_id uuid, username text, alias text,
  offers_you_seek text[], seeks_you_offer text[], mutual boolean,
  shared_genres text[], shared_daws text[], shared_plugins text[],
  open_to_work boolean, resonance numeric, reputation numeric, fit numeric,
  shared_disciplines text[], confidence numeric
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
      coalesce((p.profile->>'openToWork')::boolean, false) as open_to_work
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
      + case when s.open_to_work then public.mm_w('open',1.0) else 0 end ) as raw
    from scored s
  ),
  finalized as (
    select b.*,
      least(1.0, b.raw / public.mm_w('divisor',30.0)) as fit_val,
      ( (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 or coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_disciplines,1),0) > 0 then 1 else 0 end)
      + (case when b.affinity > 0 then 1 else 0 end)
      + (case when coalesce(array_length(b.shared_genres,1),0) > 0 or coalesce(array_length(b.shared_daws,1),0) > 0 or coalesce(array_length(b.shared_plugins,1),0) > 0 then 1 else 0 end)
      + (case when b.sim >= 0.5 then 1 else 0 end)
      + (case when b.reputation >= 0.3 then 1 else 0 end)
      + (case when b.i_follow_them > 0 or b.they_follow_me > 0 or b.shared_follows > 0 then 1 else 0 end)
      ) as evidence
    from blended b
  )
  select f.user_id, pr.username, pr.username,
    f.offers_you_seek, f.seeks_you_offer,
    (coalesce(array_length(f.offers_you_seek,1),0) > 0 and coalesce(array_length(f.seeks_you_offer,1),0) > 0),
    f.shared_genres, f.shared_daws, f.shared_plugins, f.open_to_work,
    round(f.sim, 3), round(f.reputation, 3), round(f.fit_val, 3),
    f.shared_disciplines,
    round(least(1.0, 0.55 * (f.evidence / 8.0) + 0.45 * least(1.0, f.fit_val * 1.25)), 3) as confidence
  from finalized f join public.profiles pr on pr.id = f.user_id
  where (coalesce(array_length(f.offers_you_seek,1),0) > 0
      or coalesce(array_length(f.seeks_you_offer,1),0) > 0
      or coalesce(array_length(f.shared_disciplines,1),0) > 0
      or f.affinity > 0 or f.sim >= 0.6
      or f.i_follow_them > 0 or f.they_follow_me > 0)
    and (p_category is null or exists (
      select 1 from public.profile_modules pm
      where pm.user_id = f.user_id and pm.archived_at is null and pm.category = p_category))
  order by f.raw desc, f.sim desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.collab_matches(int, text) to authenticated;

-- ── Optional: nightly auto-tune via pg_cron when available (free tier). ──────
-- No-op if pg_cron isn't provisioned; admins can always run it from /admin.
do $$
begin
  if exists (select 1 from pg_available_extensions where name = 'pg_cron') then
    begin
      create extension if not exists pg_cron;
      perform cron.unschedule('vybz-match-ltr') where exists (select 1 from cron.job where jobname = 'vybz-match-ltr');
      perform cron.schedule('vybz-match-ltr', '17 4 * * *', $cron$ select public.tune_matchmaking_weights(); $cron$);
    exception when others then
      raise notice 'pg_cron scheduling skipped: %', sqlerrm;
    end;
  end if;
end $$;
