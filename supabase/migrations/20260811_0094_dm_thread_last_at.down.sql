-- Reverse 20260811_0094_dm_thread_last_at.
-- Backfilled last_at values are left in place: they are measured from real
-- messages and reverting them would restore incorrect ordering.

drop trigger if exists dm_messages_touch_thread on public.dm_messages;
drop function if exists public.touch_dm_thread_last_at();
drop index if exists public.dm_threads_last_at_idx;
