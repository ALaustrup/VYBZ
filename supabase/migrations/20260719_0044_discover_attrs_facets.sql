-- ===========================================================================
-- VYBZ — Discover attrs facets (Phase C2): software / styles / engines
-- Filters profile_modules.attrs string-array keys.
-- ===========================================================================

set search_path = public, extensions;

drop function if exists public.search_creators(text, text, text, text, text, text, int, text, boolean, text, int);

create or replace function public.search_creators(
  p_query      text default null,
  p_role       text default null,
  p_genre      text default null,
  p_daw        text default null,
  p_plugin     text default null,
  p_key        text default null,
  p_bpm        int  default null,
  p_location   text default null,
  p_remote     boolean default null,
  p_profession text default null,
  p_software   text default null,
  p_styles     text default null,
  p_engines    text default null,
  p_limit      int  default 40
)
returns table(
  user_id uuid, username text, location text,
  offers text[], seeks text[], genres text[], profession text
)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.username, p.location,
    coalesce(array(select r.label from public.creator_roles cr join public.roles r on r.id = cr.role_id
                   where cr.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select r.label from public.creator_seeks cs join public.roles r on r.id = cs.role_id
                   where cs.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select jsonb_array_elements_text(p.profile->'genres')), '{}'),
    nullif(p.profile->>'profession', '')
  from public.profiles p
  where coalesce(p.banned, false) = false and p.username is not null and p.id <> auth.uid()
    and (p_query is null or p_query = '' or p.username ilike '%' || p_query || '%')
    and (p_role is null or p_role = ''
         or exists (select 1 from public.creator_roles cr where cr.user_id = p.id and cr.role_id = p_role)
         or exists (select 1 from public.creator_seeks cs where cs.user_id = p.id and cs.role_id = p_role))
    and (p_genre  is null or p_genre  = '' or (p.profile->'genres')  ? p_genre)
    and (p_daw    is null or p_daw    = '' or (p.profile->'daws')    ? p_daw)
    and (p_plugin is null or p_plugin = '' or (p.profile->'plugins') ? p_plugin)
    and (p_key    is null or p_key    = '' or (p.profile->'keys')    ? p_key)
    and (p_bpm is null or (
          nullif(p.profile->>'tempoMin','')::numeric is not null
          and nullif(p.profile->>'tempoMax','')::numeric is not null
          and nullif(p.profile->>'tempoMin','')::numeric <= p_bpm
          and nullif(p.profile->>'tempoMax','')::numeric >= p_bpm))
    and (p_location is null or p_location = '' or p.location ilike '%' || p_location || '%')
    and (p_remote is null or coalesce((p.profile->>'remoteOk')::boolean, false) = p_remote)
    and (p_profession is null or p_profession = ''
         or p.profile->>'profession' = p_profession
         or (p.profile->'professions') ? p_profession)
    and (p_software is null or p_software = ''
         or exists (
           select 1 from public.profile_modules pm
           where pm.user_id = p.id and pm.archived_at is null
             and (
               (jsonb_typeof(pm.attrs->'software') = 'array' and (pm.attrs->'software') ? p_software)
               or exists (
                 select 1 from jsonb_array_elements(pm.attrs->'software') e
                 where e->>'name' = p_software
               )
             )
         ))
    and (p_styles is null or p_styles = ''
         or exists (
           select 1 from public.profile_modules pm
           where pm.user_id = p.id and pm.archived_at is null
             and jsonb_typeof(pm.attrs->'styles') = 'array'
             and (pm.attrs->'styles') ? p_styles
         ))
    and (p_engines is null or p_engines = ''
         or exists (
           select 1 from public.profile_modules pm
           where pm.user_id = p.id and pm.archived_at is null
             and (
               (jsonb_typeof(pm.attrs->'engines') = 'array' and (pm.attrs->'engines') ? p_engines)
               or exists (
                 select 1 from jsonb_array_elements(pm.attrs->'engines') e
                 where e->>'name' = p_engines
               )
             )
         ))
  order by p.last_active_at desc nulls last
  limit greatest(1, least(100, p_limit));
$fn$;

grant execute on function public.search_creators(text, text, text, text, text, text, int, text, boolean, text, text, text, text, int) to authenticated;
