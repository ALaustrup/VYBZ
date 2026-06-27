-- Matchmaking v2 — multi-signal affinity.
--
-- v1 ranked purely by shared Vybs (co-positive). v2 blends the signals that
-- actually predict compatibility:
--   • co-Vyb  (both loved it)            → strong positive
--   • co-Fail (both rejected it)         → shared taste/values, also positive
--   • disagreement (one Vyb, one Fail)   → penalty
-- Score is normalized by the caller's own activity so it reads as a 0–1 "taste
-- match". Friends and the caller are excluded; only verified (non-anonymous),
-- non-banned members surface. The co-reaction join is inherently two-way, so
-- matches are mutual by construction. Returns the component counts so the client
-- can explain *why* you matched ("12 shared Vybs · 3 shared Fails").

create or replace function public.user_matches(p_limit int default 12)
returns table(
  user_id uuid,
  username text,
  alias text,
  shared int,            -- co-Vyb (both 'feel')
  shared_dislikes int,   -- co-Fail (both 'wild')
  disagreements int,     -- opposite reactions
  affinity numeric       -- 0..1 blended taste match
)
language sql security definer set search_path = public stable as $fn$
  with mine as (
    select confession_id, reaction
    from public.reactions
    where user_id = auth.uid()
  ),
  my_total as (select greatest(count(*), 1)::numeric as c from mine),
  pair as (
    select
      r.user_id,
      count(*) filter (where m.reaction = 'feel' and r.reaction = 'feel') as agree_pos,
      count(*) filter (where m.reaction = 'wild' and r.reaction = 'wild') as agree_neg,
      count(*) filter (where m.reaction <> r.reaction)                    as disagree
    from public.reactions r
    join mine m on m.confession_id = r.confession_id
    where r.user_id <> auth.uid()
    group by r.user_id
  ),
  scored as (
    select
      p.*,
      -- co-Vyb full weight, co-Fail strong, disagreement penalized.
      (p.agree_pos * 1.0 + p.agree_neg * 0.8 - p.disagree * 0.6) as raw
    from pair p
  )
  select
    s.user_id,
    pr.username,
    pr.alias,
    s.agree_pos::int,
    s.agree_neg::int,
    s.disagree::int,
    round(least(1.0, greatest(0, s.raw) / (select c from my_total)), 3) as affinity
  from scored s
  join public.profiles pr on pr.id = s.user_id
  where coalesce(pr.banned, false) = false
    and coalesce(pr.anonymous, false) = false
    and (s.agree_pos > 0 or s.agree_neg > 0)
    and not exists (
      select 1 from public.friendships f
      where f.status = 'friends'
        and ((f.requester_id = auth.uid() and f.addressee_id = s.user_id)
          or (f.addressee_id = auth.uid() and f.requester_id = s.user_id))
    )
  order by s.raw desc, s.agree_pos desc
  limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.user_matches(int) to authenticated;

-- Voting metrics (unchanged contract; counts matches via v2).
create or replace function public.my_vote_stats()
returns table(feels_given int, wilds_given int, matches int)
language sql security definer set search_path = public stable as $fn$
  select
    (select count(*) filter (where reaction='feel') from public.reactions where user_id = auth.uid())::int,
    (select count(*) filter (where reaction='wild') from public.reactions where user_id = auth.uid())::int,
    (select count(*) from public.user_matches(50))::int;
$fn$;
grant execute on function public.my_vote_stats() to authenticated;
