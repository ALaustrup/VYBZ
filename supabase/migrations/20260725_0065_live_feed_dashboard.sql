-- Profile Dashboard + Live Feed Flow (LF-1..LF-3 spine)

-- ── DM columns first (notify_message depends on them) ───────────────────────
alter table public.dm_messages
  add column if not exists kind text not null default 'text',
  add column if not exists media_url text,
  add column if not exists deleted_for jsonb not null default '[]'::jsonb,
  add column if not exists deleted_for_all boolean not null default false;

do $$ begin
  alter table public.dm_messages drop constraint if exists dm_messages_kind_check;
  alter table public.dm_messages
    add constraint dm_messages_kind_check
    check (kind in ('text','voice','video','system'));
exception when others then null;
end $$;

alter table public.dm_messages alter column body drop not null;
alter table public.dm_messages alter column body set default '';

-- ── Notifications ───────────────────────────────────────────────────────────
alter table public.notifications drop constraint if exists notifications_kind_check;
alter table public.notifications
  add constraint notifications_kind_check
  check (kind in (
    'connection','application','message','match','staff',
    'reaction','vibe','follow','live','system'
  ));

alter table public.notifications
  add column if not exists payload jsonb not null default '{}'::jsonb;

-- ── Blocks ──────────────────────────────────────────────────────────────────
create table if not exists public.blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id),
  check (blocker_id <> blocked_id)
);
alter table public.blocks enable row level security;
drop policy if exists blocks_select_own on public.blocks;
create policy blocks_select_own on public.blocks for select using (blocker_id = auth.uid());
drop policy if exists blocks_insert_own on public.blocks;
create policy blocks_insert_own on public.blocks for insert with check (blocker_id = auth.uid());
drop policy if exists blocks_delete_own on public.blocks;
create policy blocks_delete_own on public.blocks for delete using (blocker_id = auth.uid());
grant select, insert, delete on public.blocks to authenticated;

create or replace function public.block_user(p_peer uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null or p_peer is null or p_peer = auth.uid() then
    raise exception 'bad peer';
  end if;
  insert into public.blocks (blocker_id, blocked_id)
  values (auth.uid(), p_peer) on conflict do nothing;
end;
$$;
grant execute on function public.block_user(uuid) to authenticated;

create or replace function public.unblock_user(p_peer uuid)
returns void language sql security definer set search_path = public as $$
  delete from public.blocks where blocker_id = auth.uid() and blocked_id = p_peer;
$$;
grant execute on function public.unblock_user(uuid) to authenticated;

create or replace function public.is_blocked_either(p_a uuid, p_b uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.blocks
    where (blocker_id = p_a and blocked_id = p_b)
       or (blocker_id = p_b and blocked_id = p_a)
  );
$$;

-- ── Thread reads ────────────────────────────────────────────────────────────
create table if not exists public.dm_thread_reads (
  thread_id uuid not null references public.dm_threads(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key (thread_id, user_id)
);
alter table public.dm_thread_reads enable row level security;
drop policy if exists dm_reads_own on public.dm_thread_reads;
create policy dm_reads_own on public.dm_thread_reads for all
  using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update, delete on public.dm_thread_reads to authenticated;

create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare a uuid; b uuid; recipient uuid; preview text;
begin
  if coalesce(new.deleted_for_all, false) then return null; end if;
  select user_a, user_b into a, b from public.dm_threads where id = new.thread_id;
  recipient := case when new.sender_id = a then b else a end;
  if recipient is null then return null; end if;
  if public.is_blocked_either(recipient, new.sender_id) then return null; end if;
  preview := left(coalesce(
    nullif(btrim(coalesce(new.body, '')), ''),
    case new.kind when 'voice' then 'Voice message' when 'video' then 'Video message' else 'New message' end
  ), 80);
  insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
  values (
    recipient, 'message', new.sender_id,
    public.uname(new.sender_id) || ' sent you a direct message.',
    preview, new.thread_id,
    jsonb_build_object('action', 'open_dm', 'threadId', new.thread_id, 'messageId', new.id)
  );
  return null;
end $fn$;

create or replace function public.notify_reaction()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare author uuid; dtitle text;
begin
  select author_id, coalesce(title, 'your drop') into author, dtitle from public.drops where id = new.drop_id;
  if author is not null and author <> new.user_id then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
    values (
      author, 'reaction', new.user_id,
      public.uname(new.user_id) || ' reacted to your drop',
      dtitle, new.drop_id,
      jsonb_build_object('action', 'open_drop', 'dropId', new.drop_id)
    );
  end if;
  return null;
end $fn$;
drop trigger if exists notify_reaction_trg on public.reactions;
create trigger notify_reaction_trg after insert on public.reactions
  for each row execute function public.notify_reaction();

create or replace function public.mark_thread_read(p_thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.dm_threads t
    where t.id = p_thread and (t.user_a = auth.uid() or t.user_b = auth.uid())
  ) then raise exception 'not a participant'; end if;
  insert into public.dm_thread_reads (thread_id, user_id, last_read_at)
  values (p_thread, auth.uid(), now())
  on conflict (thread_id, user_id) do update set last_read_at = now();
  update public.notifications
  set read = true
  where user_id = auth.uid() and kind = 'message' and ref_id = p_thread and read = false;
end;
$$;
grant execute on function public.mark_thread_read(uuid) to authenticated;

create or replace function public.delete_dm_message(p_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare m public.dm_messages%rowtype;
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  select * into m from public.dm_messages where id = p_id;
  if not found then return; end if;
  if not exists (
    select 1 from public.dm_threads t
    where t.id = m.thread_id and (t.user_a = auth.uid() or t.user_b = auth.uid())
  ) then raise exception 'not a participant'; end if;
  if m.sender_id = auth.uid() then
    update public.dm_messages
    set deleted_for_all = true,
        deleted_for = coalesce(deleted_for, '[]'::jsonb) || to_jsonb(auth.uid()::text)
    where id = p_id;
  else
    update public.dm_messages
    set deleted_for = case
      when deleted_for ? auth.uid()::text then deleted_for
      else coalesce(deleted_for, '[]'::jsonb) || to_jsonb(auth.uid()::text)
    end
    where id = p_id;
  end if;
end;
$$;
grant execute on function public.delete_dm_message(uuid) to authenticated;

create or replace function public.hide_dm_thread(p_thread uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'not authenticated'; end if;
  if not exists (
    select 1 from public.dm_threads t
    where t.id = p_thread and (t.user_a = auth.uid() or t.user_b = auth.uid())
  ) then raise exception 'not a participant'; end if;
  update public.dm_messages m
  set deleted_for = case
    when m.deleted_for ? auth.uid()::text then m.deleted_for
    else coalesce(m.deleted_for, '[]'::jsonb) || to_jsonb(auth.uid()::text)
  end
  where m.thread_id = p_thread;
  perform public.mark_thread_read(p_thread);
end;
$$;
grant execute on function public.hide_dm_thread(uuid) to authenticated;

create or replace function public.list_inbox_threads(p_limit int default 40)
returns table (
  thread_id uuid,
  peer_id uuid,
  peer_username text,
  peer_avatar text,
  last_at timestamptz,
  last_body text,
  unread boolean
)
language plpgsql stable security definer set search_path = public as $$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'not authenticated'; end if;
  return query
  select
    t.id,
    case when t.user_a = uid then t.user_b else t.user_a end,
    p.username,
    p.avatar_url,
    t.last_at,
    coalesce((
      select left(coalesce(nullif(btrim(coalesce(m.body,'')), ''), m.kind), 80)
      from public.dm_messages m
      where m.thread_id = t.id
        and coalesce(m.deleted_for_all, false) = false
        and not (m.deleted_for ? uid::text)
      order by m.created_at desc
      limit 1
    ), ''),
    exists (
      select 1 from public.dm_messages m
      left join public.dm_thread_reads r on r.thread_id = t.id and r.user_id = uid
      where m.thread_id = t.id
        and m.sender_id <> uid
        and coalesce(m.deleted_for_all, false) = false
        and not (m.deleted_for ? uid::text)
        and m.created_at > coalesce(r.last_read_at, 'epoch'::timestamptz)
    )
  from public.dm_threads t
  join public.profiles p on p.id = case when t.user_a = uid then t.user_b else t.user_a end
  where (t.user_a = uid or t.user_b = uid)
    and not public.is_blocked_either(uid, p.id)
  order by t.last_at desc
  limit greatest(1, least(coalesce(p_limit, 40), 100));
end;
$$;
grant execute on function public.list_inbox_threads(int) to authenticated;

create or replace function public.list_live_feed(p_limit int default 50)
returns setof public.notifications
language sql stable security definer set search_path = public as $$
  select n.*
  from public.notifications n
  where n.user_id = auth.uid()
    and (
      n.actor_id is null
      or not exists (
        select 1 from public.blocks b
        where b.blocker_id = auth.uid() and b.blocked_id = n.actor_id
      )
    )
  order by n.created_at desc
  limit greatest(1, least(coalesce(p_limit, 50), 100));
$$;
grant execute on function public.list_live_feed(int) to authenticated;

create or replace function public._report_author(p_kind text, p_id uuid)
returns uuid language sql stable security definer set search_path = public as $fn$
  select case p_kind
    when 'post'    then (select user_id from public.project_posts where id = p_id)
    when 'drop'    then (select author_id from public.drops where id = p_id)
    when 'message' then coalesce(
      (select sender_id from public.dm_messages where id = p_id),
      (select sender_id from public.room_messages where id = p_id)
    )
    when 'user'    then p_id
  end;
$fn$;
