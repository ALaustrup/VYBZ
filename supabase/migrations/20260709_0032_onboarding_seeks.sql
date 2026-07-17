-- ===========================================================================
-- VYBZ — Onboarding "who are you looking for?" explicit seeks (P0 #3)
--
-- The biggest cold-start gap: new creators only got *implicit* seeks (inferred
-- from role_affinities). This captures the roles a creator is explicitly looking
-- for during onboarding and feeds them straight into creator_seeks — so
-- collab_matches surfaces exactly-wanted collaborators from day one.
--
-- Durable design: explicit seeks live on `profiles.profile.seekRoles` (a jsonb
-- array of role ids). sync_creator_graph now unions them with module wants_roles
-- when rebuilding creator_seeks, so they survive module edits/re-syncs. The
-- manual roles editor (set_creator_roles) still fully overrides when used.
-- ===========================================================================

set search_path = public, extensions;

-- ── sync_creator_graph v2 — creator_seeks = module wants_roles ∪ explicit seeks ─
create or replace function public.sync_creator_graph(p_uid uuid)
returns void language plpgsql security definer set search_path = public as $fn$
begin
  delete from public.creator_roles where user_id = p_uid;
  insert into public.creator_roles (user_id, role_id, skill)
    select p_uid, role_id, coalesce(skill, 3)::smallint
    from public.profile_modules
    where user_id = p_uid and archived_at is null
    on conflict (user_id, role_id) do update set skill = excluded.skill;

  delete from public.creator_seeks where user_id = p_uid;
  insert into public.creator_seeks (user_id, role_id, priority)
    select distinct p_uid, src.role_id, 1
    from (
      -- Implicit seeks: role-affinity wants attached to the creator's modules.
      select w.role_id
        from public.profile_modules m
        cross join lateral jsonb_array_elements_text(coalesce(m.attrs->'wants_roles','[]'::jsonb)) as w(role_id)
        where m.user_id = p_uid and m.archived_at is null
      union
      -- Explicit seeks: "who are you looking for?" captured at onboarding.
      select s.role_id
        from public.profiles p
        cross join lateral jsonb_array_elements_text(coalesce(p.profile->'seekRoles','[]'::jsonb)) as s(role_id)
        where p.id = p_uid
    ) src
    where exists (select 1 from public.roles r where r.id = src.role_id)
    on conflict (user_id, role_id) do nothing;
end $fn$;

-- ── apply_role_intent_onboarding v2 — also persist + apply explicit seeks ─────
drop function if exists public.apply_role_intent_onboarding(text, text, text[]);
create or replace function public.apply_role_intent_onboarding(
  p_role_id text,
  p_role_label text,
  p_intents text[],
  p_seek_roles text[] default '{}'
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_cat text;
  v_seeking text[];
  v_wants jsonb := '[]'::jsonb;
  v_seek_ids jsonb := '[]'::jsonb;
  v_label text := nullif(trim(coalesce(p_role_label, '')), '');
  v_role text := nullif(trim(coalesce(p_role_id, '')), '');
begin
  if uid is null then raise exception 'auth required'; end if;

  v_seeking := public._intents_to_seeking(p_intents);

  -- Validate explicit sought roles against the controlled vocabulary.
  select coalesce(jsonb_agg(distinct sr), '[]'::jsonb) into v_seek_ids
    from unnest(coalesce(p_seek_roles, '{}'::text[])) sr
    where exists (select 1 from public.roles r where r.id = sr);

  -- Persist role + intents + explicit seeks on the profile jsonb.
  update public.profiles
     set profile = coalesce(profile, '{}'::jsonb)
                   || jsonb_build_object(
                        'role', v_role,
                        'roleLabel', coalesce(v_label, v_role),
                        'intents', to_jsonb(coalesce(p_intents, '{}'::text[])),
                        'seekRoles', v_seek_ids
                      ),
         last_active_at = now()
   where id = uid;

  -- No catalog role yet (pending custom) — explicit seeks still flow via the
  -- profile source in sync_creator_graph, so score even without a module.
  if v_role is null or not exists (select 1 from public.roles where id = v_role) then
    perform public.sync_creator_graph(uid);
    return null;
  end if;

  select category into v_cat from public.roles where id = v_role;

  select coalesce(jsonb_agg(to_role order by weight desc), '[]'::jsonb)
    into v_wants
    from (
      select to_role, weight
        from public.role_affinities
       where from_role = v_role
       order by weight desc
       limit 6
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
      attrs = coalesce(attrs, '{}'::jsonb)
              || jsonb_build_object('wants_roles', v_wants, 'onboarding', true),
      archived_at = null,
      updated_at = now()
    where id = v_id;
  end if;

  perform public.sync_creator_graph(uid);
  return v_id;
end $fn$;
grant execute on function public.apply_role_intent_onboarding(text, text, text[], text[]) to authenticated;
