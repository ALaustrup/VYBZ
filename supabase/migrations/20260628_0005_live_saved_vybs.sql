-- Saved Vyb'd live streams ----------------------------------------------------
-- The community carousel (live_carousel) already excludes every stream the
-- viewer has reacted to (Vyb or Fail) and ranks the rest by a Vyb/Fail score,
-- so Failed streams stay out of the feed and Vyb'd streams surface higher for
-- everyone. What was missing: a personal, quick-access list of the streams a
-- user Vyb'd that are *still live*, so they can re-enter any of them on demand.
--
-- This is a read-only projection over the existing live_reactions / live_streams
-- tables — no new state, fully consistent with the carousel's eligibility rules
-- (age layer is implied by reaction history; NSFW + banned are re-checked here).

create or replace function public.live_my_vybs(p_limit int default 30)
returns table(
  stream_id uuid,
  user_id uuid,
  username text,
  title text,
  nsfw boolean,
  provider text,
  playback_id text,
  started_at timestamptz,
  vybs int,
  fails int
)
language sql
stable
security definer
set search_path to 'public'
as $$
  select
    s.id, s.user_id, p.username, s.title, s.nsfw, s.provider, s.playback_id,
    s.started_at, s.vybs, s.fails
  from public.live_reactions r
  join public.live_streams s on s.id = r.stream_id
  join public.profiles p on p.id = s.user_id
  where r.user_id = auth.uid()
    and r.reaction = 'vyb'
    and s.ended_at is null
    and coalesce(p.banned, false) = false
    and (
      s.nsfw = false
      or coalesce((select nsfw_opt_in from public.profiles where id = auth.uid()), false) = true
    )
  order by r.created_at desc
  limit greatest(1, least(100, p_limit));
$$;

grant execute on function public.live_my_vybs(int) to authenticated;
