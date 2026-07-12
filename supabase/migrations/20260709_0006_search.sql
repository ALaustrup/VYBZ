-- VYBZ Phase A — creator search / discovery (definer: reads all profiles, emits
-- only public fields + role/genre labels).
set search_path = public, extensions;

create or replace function public.search_creators(
  p_query text default null, p_role text default null, p_genre text default null, p_limit int default 40
)
returns table(user_id uuid, username text, location text, offers text[], seeks text[], genres text[])
language sql security definer set search_path = public stable as $fn$
  select p.id, p.username, p.location,
    coalesce(array(select r.label from public.creator_roles cr join public.roles r on r.id = cr.role_id
                   where cr.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select r.label from public.creator_seeks cs join public.roles r on r.id = cs.role_id
                   where cs.user_id = p.id order by r.family, r.sort), '{}'),
    coalesce(array(select jsonb_array_elements_text(p.profile->'genres')), '{}')
  from public.profiles p
  where coalesce(p.banned, false) = false and p.username is not null and p.id <> auth.uid()
    and (p_query is null or p_query = '' or p.username ilike '%' || p_query || '%')
    and (p_role is null or exists (select 1 from public.creator_roles cr where cr.user_id = p.id and cr.role_id = p_role)
                        or exists (select 1 from public.creator_seeks cs where cs.user_id = p.id and cs.role_id = p_role))
    and (p_genre is null or (p.profile->'genres') ? p_genre)
  order by p.last_active_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.search_creators(text, text, text, int) to authenticated;
