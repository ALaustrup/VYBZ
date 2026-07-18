-- ===========================================================================
-- VYBZ — Role Class (Phase O1): open the platform to creator-adjacent people.
--
-- Adds a second identity axis alongside PROFESSIONS: a `roleClass` on the
-- profile jsonb. `creator` is the default (today's users); the rest are
-- creator-ADJACENT identities who join VYBZ as real people with structured
-- intent — never a passive consumer tier:
--
--   creator    → makes creative work (default)
--   supporter  → Supporter / Patron (funds & follows creators)
--   booker     → Booker / Manager / A&R (books & represents talent)
--   curator    → Curator / Playlister (discovers & platforms work)
--   brand      → Brand / Marketing (commissions & partners)
--   educator   → Educator / Student (teaches & learns)
--
-- Additive & reversible (§9): stored on profiles.profile (`roleClass`), so it
-- flows through public_profile automatically. Adjacent accounts still declare
-- WHO they're looking for (p_seek_roles) — that feeds creator_seeks via
-- sync_creator_graph, widening matchmaking demand without a new engine.
-- Ranking weight for role-class is Phase O2.
-- ===========================================================================

set search_path = public, extensions;

-- Allowed role classes (creator = default; the rest are creator-adjacent).
create or replace function public._is_role_class(p text)
returns boolean language sql immutable set search_path = public as $fn$
  select p in ('creator','supporter','booker','curator','brand','educator');
$fn$;

-- apply_role_intent_onboarding v4 — also persist the chosen role_class.
-- Adjacent users pass p_role_id = null / p_profession = null; their intents +
-- seeks still flow into the matchmaking graph.
drop function if exists public.apply_role_intent_onboarding(text, text, text[], text[], text, text[]);
create or replace function public.apply_role_intent_onboarding(
  p_role_id text,
  p_role_label text,
  p_intents text[],
  p_seek_roles text[] default '{}',
  p_profession text default null,
  p_secondaries text[] default '{}',
  p_role_class text default 'creator'
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_cat text;
  v_seeking text[];
  v_wants jsonb := '[]'::jsonb;
  v_seek_ids jsonb := '[]'::jsonb;
  v_prof text := nullif(trim(coalesce(p_profession, '')), '');
  v_profs jsonb := '[]'::jsonb;
  v_label text := nullif(trim(coalesce(p_role_label, '')), '');
  v_role text := nullif(trim(coalesce(p_role_id, '')), '');
  v_class text := lower(nullif(trim(coalesce(p_role_class, '')), ''));
begin
  if uid is null then raise exception 'auth required'; end if;

  if v_class is null or not public._is_role_class(v_class) then v_class := 'creator'; end if;

  v_seeking := public._intents_to_seeking(p_intents);

  select coalesce(jsonb_agg(distinct sr), '[]'::jsonb) into v_seek_ids
    from unnest(coalesce(p_seek_roles, '{}'::text[])) sr
    where exists (select 1 from public.roles r where r.id = sr);

  -- Validate profession against the categories vocabulary.
  if v_prof is not null and not exists (select 1 from public.categories c where c.id = v_prof) then
    v_prof := null;
  end if;
  -- professions = primary + valid secondaries (deduped), primary first.
  select coalesce(jsonb_agg(distinct x) filter (where x is not null), '[]'::jsonb) into v_profs
    from (
      select v_prof as x
      union
      select s from unnest(coalesce(p_secondaries, '{}'::text[])) s
        where exists (select 1 from public.categories c where c.id = s)
    ) t;

  update public.profiles
     set profile = coalesce(profile, '{}'::jsonb)
                   || jsonb_build_object(
                        'role', v_role,
                        'roleLabel', coalesce(v_label, v_role),
                        'intents', to_jsonb(coalesce(p_intents, '{}'::text[])),
                        'seekRoles', v_seek_ids,
                        'profession', v_prof,
                        'professions', v_profs,
                        'roleClass', v_class
                      ),
         last_active_at = now()
   where id = uid;

  -- Adjacent accounts (and creators who skipped a role) still get their seeks
  -- synced into the matchmaking graph; they simply have no creative module.
  if v_role is null or not exists (select 1 from public.roles where id = v_role) then
    perform public.sync_creator_graph(uid);
    return null;
  end if;

  select category into v_cat from public.roles where id = v_role;

  select coalesce(jsonb_agg(to_role order by weight desc), '[]'::jsonb)
    into v_wants
    from (
      select to_role, weight from public.role_affinities
       where from_role = v_role order by weight desc limit 6
    ) a;

  select id into v_id from public.profile_modules
   where user_id = uid and role_id = v_role and archived_at is null;

  if v_id is null then
    insert into public.profile_modules
      (user_id, role_id, category, headline, seeking, skill, attrs, sort)
    values (
      uid, v_role, v_cat,
      coalesce(v_label, (select label from public.roles where id = v_role)),
      v_seeking, 3,
      jsonb_build_object('wants_roles', v_wants, 'onboarding', true),
      coalesce((select max(sort) + 1 from public.profile_modules where user_id = uid and archived_at is null), 0)
    )
    returning id into v_id;
  else
    update public.profile_modules set
      headline = coalesce(v_label, headline),
      seeking = v_seeking,
      skill = coalesce(skill, 3),
      attrs = coalesce(attrs, '{}'::jsonb) || jsonb_build_object('wants_roles', v_wants, 'onboarding', true),
      archived_at = null, updated_at = now()
    where id = v_id;
  end if;

  perform public.sync_creator_graph(uid);
  return v_id;
end $fn$;
grant execute on function public.apply_role_intent_onboarding(text, text, text[], text[], text, text[], text) to authenticated;

-- Change role class later (from Identity settings). Validated + owner-only.
create or replace function public.set_role_class(p_class text)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v text := lower(nullif(trim(coalesce(p_class, '')), ''));
begin
  if uid is null then raise exception 'auth required'; end if;
  if v is null or not public._is_role_class(v) then v := 'creator'; end if;
  update public.profiles
     set profile = coalesce(profile, '{}'::jsonb) || jsonb_build_object('roleClass', v),
         last_active_at = now()
   where id = uid;
  return v;
end $fn$;
grant execute on function public.set_role_class(text) to authenticated;
