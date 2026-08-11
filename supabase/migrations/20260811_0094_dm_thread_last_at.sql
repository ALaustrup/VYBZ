-- DM inbox ordering fix.
--
-- `list_inbox_threads` orders by `dm_threads.last_at`, but `dm_threads` has RLS
-- enabled with a SELECT-only policy, so the client's update of `last_at` on send
-- matches zero rows. `last_at` therefore never advances past thread creation and
-- the inbox never reorders when a new message arrives.
--
-- Maintain it server-side instead of trusting the client: a definer-rights trigger
-- on dm_messages insert. This also removes the need to ever grant participants
-- UPDATE on the thread row.

create or replace function public.touch_dm_thread_last_at()
returns trigger
language plpgsql
security definer
set search_path to 'public'
as $$
begin
  update public.dm_threads
     set last_at = greatest(coalesce(last_at, new.created_at), new.created_at)
   where id = new.thread_id;
  return new;
end;
$$;

drop trigger if exists dm_messages_touch_thread on public.dm_messages;
create trigger dm_messages_touch_thread
  after insert on public.dm_messages
  for each row execute function public.touch_dm_thread_last_at();

-- Backfill: existing threads are ordered by creation, not by real activity.
update public.dm_threads t
   set last_at = m.max_created
  from (
    select thread_id, max(created_at) as max_created
      from public.dm_messages
     group by thread_id
  ) m
 where m.thread_id = t.id
   and (t.last_at is null or t.last_at < m.max_created);

-- Inbox reads order by last_at desc for the current user's threads.
create index if not exists dm_threads_last_at_idx on public.dm_threads (last_at desc);
