-- ===========================================================================
-- VYBZ — admin console backend.
--
-- Adds: an admin guard, member management (ban / admin toggle), a tunable
-- matchmaking-weights config (read by collab_matches), custom-discipline
-- promotion into the taxonomy, and a bug-report inbox. Every admin RPC is
-- SECURITY DEFINER and re-checks is_admin(auth.uid()) so privilege can't leak.
-- ===========================================================================

set search_path = public, extensions;

-- ── Admin guard ─────────────────────────────────────────────────────────────
create or replace function public.is_platform_admin()
returns boolean language sql stable security definer set search_path = public as $fn$
  select coalesce((select is_admin from public.profiles where id = auth.uid()), false);
$fn$;
grant execute on function public.is_platform_admin() to authenticated;

-- ── Tunable matchmaking weights (single row) ────────────────────────────────
create table if not exists public.matchmaking_config (
  id         int primary key default 1 check (id = 1),
  config     jsonb not null default '{}'::jsonb,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles(id)
);
insert into public.matchmaking_config (id, config) values (1, '{}'::jsonb) on conflict (id) do nothing;
alter table public.matchmaking_config enable row level security;
-- No direct table access; only via RPCs.

-- Weight lookup with per-key default (used by collab_matches).
create or replace function public.mm_w(k text, d numeric)
returns numeric language sql stable security definer set search_path = public as $fn$
  select coalesce((select (config->>k)::numeric from public.matchmaking_config where id = 1), d);
$fn$;

create or replace function public.get_matchmaking_config()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when public.is_platform_admin()
    then coalesce((select config from public.matchmaking_config where id = 1), '{}'::jsonb)
    else '{}'::jsonb end;
$fn$;
grant execute on function public.get_matchmaking_config() to authenticated;

create or replace function public.set_matchmaking_config(p jsonb)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update public.matchmaking_config set config = coalesce(p, '{}'::jsonb), updated_at = now(), updated_by = auth.uid() where id = 1;
end $fn$;
grant execute on function public.set_matchmaking_config(jsonb) to authenticated;

-- ── collab_matches v4 — weights sourced from matchmaking_config ─────────────
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
      ( coalesce(array_length(s.offers_you_seek,1),0) * public.mm_w('offers',3.0)
      + coalesce(array_length(s.seeks_you_offer,1),0) * public.mm_w('seeks',3.0)
      + case when coalesce(array_length(s.offers_you_seek,1),0) > 0 and coalesce(array_length(s.seeks_you_offer,1),0) > 0 then public.mm_w('mutual',4.0) else 0 end
      + coalesce(array_length(s.shared_disciplines,1),0) * public.mm_w('shared_discipline',4.0)
      + least(6, s.shared_attr_count) * public.mm_w('attr',0.7)
      + least(4, s.intent_align) * public.mm_w('intent',0.5)
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
  )
  select b.user_id, pr.username, pr.username,
    b.offers_you_seek, b.seeks_you_offer,
    (coalesce(array_length(b.offers_you_seek,1),0) > 0 and coalesce(array_length(b.seeks_you_offer,1),0) > 0),
    b.shared_genres, b.shared_daws, b.shared_plugins, b.open_to_work,
    round(b.sim, 3), round(b.reputation, 3), round(least(1.0, b.raw / public.mm_w('divisor',28.0)), 3),
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

-- ── Member management ───────────────────────────────────────────────────────
create or replace function public.admin_list_members(p_q text default null, p_limit int default 50)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(x order by x->>'createdAt' desc), '[]'::jsonb) end
  from (
    select jsonb_build_object(
      'userId', p.id, 'username', p.username, 'location', p.location,
      'isAdmin', p.is_admin, 'banned', p.banned,
      'createdAt', p.created_at,
      'modules', (select count(*) from public.profile_modules m where m.user_id = p.id and m.archived_at is null),
      'drops', (select count(*) from public.drops d where d.author_id = p.id)
    ) as x
    from public.profiles p
    where p_q is null or p_q = '' or p.username ilike '%'||p_q||'%'
    order by p.created_at desc
    limit greatest(1, least(200, p_limit))
  ) s;
$fn$;
grant execute on function public.admin_list_members(text, int) to authenticated;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update public.profiles set banned = p_banned where id = p_user;
end $fn$;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;

create or replace function public.admin_set_admin(p_user uuid, p_is_admin boolean)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update public.profiles set is_admin = p_is_admin where id = p_user;
end $fn$;
grant execute on function public.admin_set_admin(uuid, boolean) to authenticated;

-- ── Custom-discipline review + promotion ────────────────────────────────────
create or replace function public.admin_pending_disciplines()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', r.id, 'rawLabel', r.raw_label, 'status', r.status,
    'requestedBy', pr.username, 'userId', r.user_id, 'createdAt', r.created_at
  ) order by r.created_at desc), '[]'::jsonb) end
  from public.custom_discipline_requests r
  left join public.profiles pr on pr.id = r.user_id
  where r.status = 'pending';
$fn$;
grant execute on function public.admin_pending_disciplines() to authenticated;

-- Promote a request into the taxonomy: either map to an existing role, or
-- create a brand-new discipline under a category. Adds a module for the asker.
create or replace function public.admin_promote_discipline(
  p_request uuid, p_category text default null, p_role text default null, p_label text default null)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  req public.custom_discipline_requests%rowtype;
  v_role text := p_role;
  v_label text;
  v_slug text;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  select * into req from public.custom_discipline_requests where id = p_request;
  if not found then raise exception 'request not found'; end if;

  if v_role is null then
    v_label := coalesce(nullif(btrim(p_label), ''), req.raw_label);
    v_slug := left(regexp_replace(lower(v_label), '[^a-z0-9]+', '_', 'g'), 40);
    v_slug := btrim(v_slug, '_');
    if v_slug = '' then v_slug := 'discipline'; end if;
    if exists (select 1 from public.roles where id = v_slug) then
      v_slug := v_slug || '_' || substr(replace(gen_random_uuid()::text,'-',''), 1, 4);
    end if;
    insert into public.roles (id, label, family, category, sort)
    values (v_slug, v_label, 'custom', p_category, 900);
    v_role := v_slug;
  end if;

  update public.custom_discipline_requests
    set status = 'promoted', mapped_role = v_role
    where id = p_request;

  -- Give the requester a module for the resolved discipline.
  insert into public.profile_modules (user_id, role_id, category,
    sort)
  select req.user_id, v_role, (select category from public.roles where id = v_role),
    coalesce((select max(sort)+1 from public.profile_modules where user_id = req.user_id and archived_at is null), 0)
  on conflict (user_id, role_id) where archived_at is null do nothing;
  perform public.sync_creator_graph(req.user_id);

  return jsonb_build_object('roleId', v_role, 'status', 'promoted');
end $fn$;
grant execute on function public.admin_promote_discipline(uuid, text, text, text) to authenticated;

create or replace function public.admin_reject_discipline(p_request uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  update public.custom_discipline_requests set status = 'rejected' where id = p_request;
end $fn$;
grant execute on function public.admin_reject_discipline(uuid) to authenticated;

-- ── Bug reports ─────────────────────────────────────────────────────────────
create table if not exists public.bug_reports (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references public.profiles(id) on delete set null,
  title      text not null,
  body       text,
  context    jsonb not null default '{}'::jsonb,
  status     text not null default 'open' check (status in ('open','reviewing','resolved','wontfix')),
  created_at timestamptz not null default now()
);
create index if not exists bug_reports_status_idx on public.bug_reports(status, created_at desc);
alter table public.bug_reports enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='bug_reports' and policyname='bug own read') then
    create policy "bug own read" on public.bug_reports for select using (user_id = auth.uid());
  end if;
end $$;

create or replace function public.submit_bug_report(p_title text, p_body text default null, p_context jsonb default '{}'::jsonb)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); v_id uuid;
begin
  if uid is null then raise exception 'auth required'; end if;
  if length(btrim(coalesce(p_title,''))) < 3 then raise exception 'title too short'; end if;
  insert into public.bug_reports (user_id, title, body, context)
  values (uid, btrim(p_title), nullif(btrim(coalesce(p_body,'')),''), coalesce(p_context,'{}'::jsonb))
  returning id into v_id;
  return v_id;
end $fn$;
grant execute on function public.submit_bug_report(text, text, jsonb) to authenticated;

create or replace function public.admin_list_bug_reports(p_status text default null)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select case when not public.is_platform_admin() then '[]'::jsonb else coalesce(jsonb_agg(jsonb_build_object(
    'id', b.id, 'title', b.title, 'body', b.body, 'context', b.context, 'status', b.status,
    'reportedBy', pr.username, 'userId', b.user_id, 'createdAt', b.created_at
  ) order by b.created_at desc), '[]'::jsonb) end
  from public.bug_reports b
  left join public.profiles pr on pr.id = b.user_id
  where p_status is null or b.status = p_status;
$fn$;
grant execute on function public.admin_list_bug_reports(text) to authenticated;

create or replace function public.admin_set_bug_status(p_id uuid, p_status text)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;
  if p_status not in ('open','reviewing','resolved','wontfix') then raise exception 'bad status'; end if;
  update public.bug_reports set status = p_status where id = p_id;
end $fn$;
grant execute on function public.admin_set_bug_status(uuid, text) to authenticated;
