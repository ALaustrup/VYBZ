-- ===========================================================================
-- VYBZ Phase F — categorized collab chat. Taxonomy-bound community rooms (one per
-- role / genre / DAW), realtime group messages, and live presence (client-side).
-- Rooms are a public catalog; any signed-in creator can read + post. Presence is
-- handled over Realtime channels (no DB) and can later feed matchmaking.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.rooms (
  id uuid primary key default gen_random_uuid(),
  kind text not null check (kind in ('role','genre','daw')),
  ref_id text not null,
  title text not null,
  sort int not null default 0,
  created_at timestamptz not null default now(),
  unique (kind, ref_id)
);
alter table public.rooms enable row level security;
create policy "rooms readable" on public.rooms for select using (auth.uid() is not null);
grant select on public.rooms to authenticated;

create table if not exists public.room_messages (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.rooms(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  created_at timestamptz not null default now()
);
create index if not exists room_messages_room_idx on public.room_messages(room_id, created_at);
alter table public.room_messages enable row level security;
create policy "room messages read" on public.room_messages for select using (auth.uid() is not null);
create policy "room messages send" on public.room_messages for insert
  with check (sender_id = auth.uid() and length(btrim(body)) between 1 and 2000);
grant select, insert on public.room_messages to authenticated;

-- Seed a room per taxonomy entry (roles, genres, DAWs).
insert into public.rooms (kind, ref_id, title, sort)
  select 'role', id, label, sort from public.roles
  union all select 'genre', id, label, sort from public.genres
  union all select 'daw', id, label, sort from public.daws
on conflict (kind, ref_id) do nothing;

-- Catalog with activity, for the rooms list (newest-active first per kind in UI).
create or replace function public.list_rooms()
returns table(id uuid, kind text, ref_id text, title text, messages int, last_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select r.id, r.kind, r.ref_id, r.title,
    (select count(*)::int from public.room_messages m where m.room_id = r.id) as messages,
    (select max(m.created_at) from public.room_messages m where m.room_id = r.id) as last_at
  from public.rooms r
  order by r.kind, r.sort, r.title;
$fn$;
grant execute on function public.list_rooms() to authenticated;

-- Ensure room messages stream over Realtime (postgres_changes), like DMs.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    begin
      alter publication supabase_realtime add table public.room_messages;
    exception when duplicate_object then null;
    end;
  end if;
end $$;
