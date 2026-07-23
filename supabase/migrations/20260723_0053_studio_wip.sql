-- Studio WIP hub: surface split-agreement state on my_projects so the landing
-- can prioritize collabs that need the caller (agree split / await others).

drop function if exists public.my_projects();

create or replace function public.my_projects()
returns table(
  id uuid,
  title text,
  status text,
  owner_id uuid,
  is_owner boolean,
  members int,
  versions int,
  created_at timestamptz,
  my_agreed boolean,
  pending_agrees int
)
language sql security definer set search_path = public stable as $fn$
  select
    p.id,
    p.title,
    p.status,
    p.owner_id,
    (p.owner_id = auth.uid()) as is_owner,
    (select count(*)::int from public.project_collaborators c where c.project_id = p.id) as members,
    (select count(*)::int from public.project_versions v where v.project_id = p.id) as versions,
    p.created_at,
    coalesce((
      select s.agreed from public.split_sheets s
      where s.project_id = p.id and s.user_id = auth.uid()
    ), false) as my_agreed,
    (
      select count(*)::int from public.split_sheets s
      join public.project_collaborators c
        on c.project_id = s.project_id and c.user_id = s.user_id
      where s.project_id = p.id and coalesce(s.agreed, false) = false
    ) as pending_agrees
  from public.projects p
  where p.owner_id = auth.uid()
     or exists (
       select 1 from public.project_collaborators c
       where c.project_id = p.id and c.user_id = auth.uid()
     )
  order by
    case when p.status in ('released', 'archived') then 1 else 0 end,
    p.created_at desc;
$fn$;

grant execute on function public.my_projects() to authenticated;
