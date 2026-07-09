-- ===========================================================================
-- VYBZ — Anti-popularity discovery feed. The platform's core philosophy: REAL
-- discovery over rewarding popularity. The more attention an artist has already
-- received (plays/reach, followers, engagement, reputation), the LOWER they rank;
-- the less they've received, the HIGHER they surface. Under-exposed creators are
-- actively pushed to the top; overexposed creators sink toward the bottom.
--
-- Design notes:
--   • "Plays" = DISTINCT listeners (reach), not raw play counts. Raw counts are
--     griefable (mass-replaying a rival would BURY them under anti-popularity);
--     distinct listeners cap each attacker at +1 and better model real attention.
--   • Metrics are log-compressed (attention is heavy-tailed) and normalized 0..1.
--   • A small freshness term keeps it alive; a deterministic per-(drop,seed) jitter
--     ROTATES the spotlight fairly among the many equally-unknown artists so
--     exposure is shared, not fixed.
--   • Per-artist diversity penalty interleaves different creators near the top.
-- ===========================================================================

set search_path = public, extensions;

-- Distinct-listener reach.
alter table public.drops add column if not exists plays int not null default 0;

create table if not exists public.drop_plays (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);
alter table public.drop_plays enable row level security;  -- writes only via record_play (definer)

-- Count a listener once per drop (self-plays don't inflate reach).
create or replace function public.record_play(p_drop uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null or p_drop is null then return; end if;
  if exists (select 1 from public.drops d where d.id = p_drop and d.author_id = uid) then return; end if;
  insert into public.drop_plays (drop_id, user_id) values (p_drop, uid) on conflict do nothing;
  if found then update public.drops set plays = plays + 1 where id = p_drop; end if;
end $fn$;
grant execute on function public.record_play(uuid) to authenticated;

-- The anti-popularity ranker. Returns drops ordered by visibility (highest first).
create or replace function public.discovery_feed(p_limit int default 40, p_seed int default 0)
returns table(
  id uuid, author_id uuid, title text, body text, seed int,
  feels int, wilds int, created_at timestamptz, asset_id uuid,
  plays int, popularity numeric, visibility numeric
)
language sql security definer set search_path = public stable as $fn$
  with base as (
    select d.id, d.author_id, d.title, d.body, d.seed, d.feels, d.wilds, d.created_at, d.asset_id, d.plays,
      (d.feels + d.wilds + coalesce(a.rating_count, 0)) as drop_engage,
      extract(epoch from (now() - d.created_at)) / 86400.0 as age_days
    from public.drops d
    join public.assets a on a.id = d.asset_id                 -- sound-first discovery
    join public.profiles p on p.id = d.author_id
    where coalesce(p.banned, false) = false
  ),
  artist as (
    select d.author_id, sum(d.plays) as a_plays, sum(d.feels + d.wilds) as a_react, count(*) as a_drops
    from public.drops d group by d.author_id
  ),
  art as (
    select ar.author_id, ar.a_plays, ar.a_react,
      coalesce(cs.connections, 0) as followers,
      coalesce(cs.ratings, 0) as a_ratings,
      public.creator_reputation(ar.author_id) as reputation
    from artist ar left join public.creator_stats cs on cs.user_id = ar.author_id
  ),
  mx as (
    select
      greatest(1.0, max(ln(1 + a_plays))) as m_plays,
      greatest(1.0, max(ln(1 + followers))) as m_follow,
      greatest(1.0, max(ln(1 + a_react + a_ratings))) as m_engage,
      greatest(1.0, (select max(ln(1 + drop_engage + plays)) from base)) as m_drop
    from art
  ),
  scored as (
    select b.*,
      ( 0.30 * (ln(1 + art.a_plays) / mx.m_plays)
      + 0.25 * (ln(1 + art.followers) / mx.m_follow)
      + 0.20 * (ln(1 + art.a_react + art.a_ratings) / mx.m_engage)
      + 0.10 * art.reputation
      + 0.15 * (ln(1 + b.drop_engage + b.plays) / mx.m_drop) ) as pop,
      exp(- b.age_days / 14.0) as freshness,
      ((('x' || substr(md5(b.id::text || '|' || p_seed::text), 1, 8))::bit(32)::bigint & 2147483647) / 2147483647.0) as jitter
    from base b join art on art.author_id = b.author_id cross join mx
  ),
  vis as (
    select s.*,
      (0.70 * (1 - least(1.0, s.pop)) + 0.10 * s.freshness + 0.20 * s.jitter) as vscore,
      row_number() over (
        partition by s.author_id
        order by (0.70 * (1 - least(1.0, s.pop)) + 0.10 * s.freshness + 0.20 * s.jitter) desc
      ) as rn
    from scored s
  )
  select id, author_id, title, body, seed, feels, wilds, created_at, asset_id, plays,
    round(pop::numeric, 3) as popularity,
    round(greatest(0, vscore - (rn - 1) * 0.12)::numeric, 3) as visibility
  from vis
  order by greatest(0, vscore - (rn - 1) * 0.12) desc, created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.discovery_feed(int, int) to anon, authenticated;
