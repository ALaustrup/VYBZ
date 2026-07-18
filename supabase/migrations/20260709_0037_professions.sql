-- ===========================================================================
-- VYBZ — Professions (Phase A): first-class creative verticals.
--
-- Activates the dormant category axis (migration 0016) as the platform's four
-- top-level PROFESSIONS. A creator picks one PRIMARY profession + optional
-- SECONDARIES at onboarding; this drives their tailored feed, tools, discovery
-- and identity. Additive: stored on profiles.profile (`profession` + the
-- `professions` array), validated against the categories vocabulary.
--
--   music       → Music Producers
--   film_video  → Video Creators
--   visual_art  → Visual Artists
--   game_dev    → Game Designers
-- ===========================================================================

set search_path = public, extensions;

update public.categories set label = 'Music Producers' where id = 'music';
update public.categories set label = 'Video Creators'  where id = 'film_video';
update public.categories set label = 'Visual Artists'  where id = 'visual_art';
update public.categories set label = 'Game Designers'  where id = 'game_dev';

-- apply_role_intent_onboarding v3 — also persist primary profession + secondaries
drop function if exists public.apply_role_intent_onboarding(text, text, text[], text[]);
create or replace function public.apply_role_intent_onboarding(
  p_role_id text,
  p_role_label text,
  p_intents text[],
  p_seek_roles text[] default '{}',
  p_profession text default null,
  p_secondaries text[] default '{}'
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
begin
  if uid is null then raise exception 'auth required'; end if;

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
                        'professions', v_profs
                      ),
         last_active_at = now()
   where id = uid;

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
grant execute on function public.apply_role_intent_onboarding(text, text, text[], text[], text, text[]) to authenticated;
