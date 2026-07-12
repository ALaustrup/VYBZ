-- ===========================================================================
-- VYBZ Phase A — notifications. A durable, RLS-scoped activity feed populated by
-- triggers on the events that matter: a new connection request, a new applicant
-- to your opportunity, and a new direct message.
-- ===========================================================================

set search_path = public, extensions;

create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,  -- recipient
  kind text not null check (kind in ('connection','application','message','match')),
  actor_id uuid references public.profiles(id) on delete set null,
  title text not null,
  body text,
  ref_id uuid,                    -- thread id / post id / actor, per kind
  read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications(user_id, created_at desc);

alter table public.notifications enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications read own') then
    create policy "notifications read own" on public.notifications for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='notifications' and policyname='notifications update own') then
    create policy "notifications update own" on public.notifications for update using (user_id = auth.uid()) with check (user_id = auth.uid());
  end if;
end $$;
grant select, update on public.notifications to authenticated;

-- Helper: a creator's public display name for notification copy.
create or replace function public.uname(p_id uuid)
returns text language sql stable security definer set search_path = public as $fn$
  select coalesce(username, 'A creator') from public.profiles where id = p_id;
$fn$;

-- New connection request → notify the addressee.
create or replace function public.notify_connection()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id)
    values (new.addressee_id, 'connection', new.requester_id,
            public.uname(new.requester_id) || ' wants to connect', null, new.requester_id);
  end if;
  return null;
end $fn$;
drop trigger if exists notify_connection_trg on public.connections;
create trigger notify_connection_trg after insert on public.connections
  for each row execute function public.notify_connection();

-- New application → notify the opportunity author.
create or replace function public.notify_application()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare author uuid; ptitle text;
begin
  select author_id, title into author, ptitle from public.collab_posts where id = new.post_id;
  if author is not null and author <> new.applicant_id then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id)
    values (author, 'application', new.applicant_id,
            public.uname(new.applicant_id) || ' applied to your post', ptitle, new.post_id);
  end if;
  return null;
end $fn$;
drop trigger if exists notify_application_trg on public.collab_applications;
create trigger notify_application_trg after insert on public.collab_applications
  for each row execute function public.notify_application();

-- New DM → notify the other participant.
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare a uuid; b uuid; recipient uuid;
begin
  select user_a, user_b into a, b from public.dm_threads where id = new.thread_id;
  recipient := case when new.sender_id = a then b else a end;
  if recipient is not null then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id)
    values (recipient, 'message', new.sender_id,
            public.uname(new.sender_id) || ' sent you a message', left(new.body, 80), new.thread_id);
  end if;
  return null;
end $fn$;
drop trigger if exists notify_message_trg on public.dm_messages;
create trigger notify_message_trg after insert on public.dm_messages
  for each row execute function public.notify_message();

-- Mark all of the caller's notifications read.
create or replace function public.mark_notifications_read()
returns void language sql security definer set search_path = public as $fn$
  update public.notifications set read = true where user_id = auth.uid() and read = false;
$fn$;
grant execute on function public.mark_notifications_read() to authenticated;
