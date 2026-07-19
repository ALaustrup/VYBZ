-- ===========================================================================
-- VYBZ — Collab room chat (Phase D leftover): per-project message thread
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.project_messages (
  id uuid primary key default gen_random_uuid(),
  project_id uuid not null references public.projects(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 2000),
  created_at timestamptz not null default now()
);

create index if not exists project_messages_project_created_idx
  on public.project_messages (project_id, created_at desc);

alter table public.project_messages enable row level security;
-- Access only via security-definer RPCs gated by is_project_member.

create or replace function public.list_project_messages(p_project uuid, p_limit int default 80)
returns table(id uuid, sender_id uuid, username text, body text, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select m.id, m.sender_id, pr.username, m.body, m.created_at
  from public.project_messages m
  join public.profiles pr on pr.id = m.sender_id
  where m.project_id = p_project
    and public.is_project_member(p_project, auth.uid())
  order by m.created_at asc
  limit greatest(1, least(200, p_limit));
$fn$;

create or replace function public.send_project_message(p_project uuid, p_body text)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  mid uuid;
  cleaned text := trim(p_body);
begin
  if uid is null then raise exception 'unauthorized'; end if;
  if not public.is_project_member(p_project, uid) then raise exception 'forbidden'; end if;
  if cleaned is null or cleaned = '' or char_length(cleaned) > 2000 then
    raise exception 'invalid_body';
  end if;
  insert into public.project_messages (project_id, sender_id, body)
  values (p_project, uid, cleaned)
  returning id into mid;
  return mid;
end;
$fn$;

grant execute on function public.list_project_messages(uuid, int) to authenticated;
grant execute on function public.send_project_message(uuid, text) to authenticated;

do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime' and tablename = 'project_messages'
  ) then
    alter publication supabase_realtime add table public.project_messages;
  end if;
exception when others then
  -- publication may already include the table
  null;
end $$;
