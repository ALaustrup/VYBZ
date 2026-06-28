-- ===========================================================================
-- Never Alone — Ambient Presence (Phase 1).
--
-- A single, cheap signal the client can poll to answer "how alive is MYVYB for
-- ME right now?" so a user never opens to a dead, empty app. It returns the
-- caller's age-layer counts for: people online, open live streams, people in
-- the random-chat queue, and available Lifelines.
--
-- Presence is self-reinforcing: each poll also stamps the caller's
-- last_active_at, so simply having the app open keeps you in the "online" set.
-- Everything is age-layer isolated (teens never counted with adults) and NSFW
-- live streams only count for viewers who opted in.
-- ===========================================================================

-- Speeds up the rolling "active in the last N minutes" scan as the base grows.
create index if not exists profiles_last_active_idx
  on public.profiles (last_active_at);

create or replace function public.ambient_presence()
returns table(online int, live int, roulette int, lifelines int, layer text)
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  my_age int;
  my_layer text;
  wants_nsfw boolean;
begin
  if uid is null then
    return query select 0, 0, 0, 0, 'adult'::text;
    return;
  end if;

  select age, coalesce(nsfw_opt_in, false)
    into my_age, wants_nsfw
    from public.profiles where id = uid;

  my_layer := case when coalesce(my_age, 18) < 18 then 'teen' else 'adult' end;

  -- Heartbeat: polling presence is what marks you present.
  update public.profiles set last_active_at = now() where id = uid;

  return query
  select
    -- People around you (active in the last 5 minutes), same age layer.
    (select count(*)::int from public.profiles p
       where p.id <> uid
         and coalesce(p.anonymous, false) = false
         and coalesce(p.banned, false) = false
         and p.last_active_at > now() - interval '5 minutes'
         and (case when coalesce(p.age, 18) < 18 then 'teen' else 'adult' end) = my_layer),
    -- Open live streams you're allowed to see.
    (select count(*)::int from public.live_streams s
       where s.ended_at is null
         and s.age_layer = my_layer
         and (s.nsfw = false or wants_nsfw)
         and s.user_id <> uid),
    -- People waiting in the random-chat queue (same layer).
    (select count(*)::int from public.roulette_queue q
       where q.age_layer = my_layer
         and q.user_id <> uid),
    -- Lifelines on shift right now (same layer).
    (select count(*)::int from public.profiles p
       where coalesce(p.lifeline_available, false) = true
         and coalesce(p.banned, false) = false
         and p.id <> uid
         and (case when coalesce(p.age, 18) < 18 then 'teen' else 'adult' end) = my_layer),
    my_layer;
end $$;

grant execute on function public.ambient_presence() to authenticated;
