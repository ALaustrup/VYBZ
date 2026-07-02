-- Live analytics + realtime viewer persistence -------------------------------
-- Adds the data layer for: (1) streamers seeing their live Vyb tally, (2) a
-- persisted high-water mark of concurrent viewers, and (3) a streamer-only
-- lifetime analytics summary that powers the exclusive profile section.

-- 1) Drop the legacy 2-arg live_start overload (superseded by the 3-arg version
--    with p_record). Removes the ambiguous-overload advisor warning + dead code.
drop function if exists public.live_start(text, boolean);

-- 2) Owner-only live tally — the streamer polls their own Vyb/Fail/viewer counts
--    while on air without exposing the row through RLS to anyone else.
create or replace function public.live_stream_tally(p_stream uuid)
returns table(vybs int, fails int, peak_viewers int)
language sql
stable
security definer
set search_path to 'public'
as $$
  select s.vybs, s.fails, coalesce(s.peak_viewers, 0)
  from public.live_streams s
  where s.id = p_stream and s.user_id = auth.uid();
$$;
grant execute on function public.live_stream_tally(uuid) to authenticated;

-- 3) Persist the peak concurrent-viewer count. The streamer reports the current
--    LiveKit room size periodically; we keep the monotonic maximum so analytics
--    reflect the true high-water mark even after viewers drop off.
create or replace function public.live_set_viewers(p_stream uuid, p_count int)
returns void
language sql
security definer
set search_path to 'public'
as $$
  update public.live_streams
     set peak_viewers = greatest(coalesce(peak_viewers, 0), greatest(0, p_count))
   where id = p_stream and user_id = auth.uid() and ended_at is null;
$$;
grant execute on function public.live_set_viewers(uuid, int) to authenticated;

-- 4) Streamer analytics — lifetime totals + the recent streams list for the
--    caller. Non-streamers get total_streams = 0, so the client renders the
--    exclusive profile section only when total_streams > 0.
create or replace function public.live_my_stream_stats()
returns json
language sql
stable
security definer
set search_path to 'public'
as $$
  with mine as (
    select * from public.live_streams where user_id = auth.uid()
  ), agg as (
    select
      count(*)::int as total_streams,
      coalesce(sum(vybs), 0)::int as total_vybs,
      coalesce(sum(fails), 0)::int as total_fails,
      coalesce(max(vybs), 0)::int as best_vybs,
      coalesce(max(peak_viewers), 0)::int as peak_viewers,
      coalesce(sum(extract(epoch from (coalesce(ended_at, now()) - started_at)))::int, 0) as total_seconds,
      max(started_at) as last_streamed_at
    from mine
  ), recent as (
    select coalesce(json_agg(row_to_json(r)), '[]'::json) as items
    from (
      select
        id, title, started_at, ended_at, vybs, fails,
        coalesce(peak_viewers, 0) as peak_viewers,
        greatest(0, extract(epoch from (coalesce(ended_at, now()) - started_at))::int) as seconds
      from mine
      order by started_at desc
      limit 12
    ) r
  )
  select json_build_object(
    'total_streams', a.total_streams,
    'total_vybs', a.total_vybs,
    'total_fails', a.total_fails,
    'best_vybs', a.best_vybs,
    'peak_viewers', a.peak_viewers,
    'total_seconds', a.total_seconds,
    'last_streamed_at', a.last_streamed_at,
    'recent', rc.items
  )
  from agg a, recent rc;
$$;
grant execute on function public.live_my_stream_stats() to authenticated;
