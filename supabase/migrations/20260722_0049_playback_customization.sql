-- ===========================================================================
-- VYBZ Phase 1 — track-linked playback customization (Orb + outline FX vision).
-- jsonb on drops (and assets for library-only plays). Keeps drops.fx in sync
-- as a denormalized shortcut of playback_customization.reactiveStyle.
-- ===========================================================================

set search_path = public, extensions;

alter table public.drops
  add column if not exists playback_customization jsonb not null default '{}'::jsonb;

alter table public.assets
  add column if not exists playback_customization jsonb not null default '{}'::jsonb;

-- Backfill: promote existing fx into the jsonb envelope when empty.
update public.drops
set playback_customization = jsonb_build_object('reactiveStyle', coalesce(fx, 'glow'))
where coalesce(playback_customization, '{}'::jsonb) = '{}'::jsonb
  and fx is not null;

-- discovery_feed: include playback_customization for listeners
drop function if exists public.discovery_feed(int, int);
create function public.discovery_feed(p_limit int default 40, p_seed int default 0)
returns table(
  id uuid, author_id uuid, title text, body text, seed int,
  feels int, wilds int, created_at timestamptz, asset_id uuid,
  plays int, popularity numeric, visibility numeric,
  fx text, audience text, playback_customization jsonb
)
language sql security definer set search_path = public stable as $fn$
  with base as (
    select d.id, d.author_id, d.title, d.body, d.seed, d.feels, d.wilds, d.created_at, d.asset_id, d.plays,
      d.fx, d.audience, d.playback_customization,
      (d.feels + d.wilds + coalesce(a.rating_count, 0)) as drop_engage,
      extract(epoch from (now() - d.created_at)) / 86400.0 as age_days
    from public.drops d
    join public.assets a on a.id = d.asset_id
    join public.profiles p on p.id = d.author_id
    where coalesce(p.banned, false) = false
      and coalesce(d.audience, 'public') = 'public'
  ),
  artist as (
    select d.author_id, sum(d.plays) as a_plays, sum(d.feels + d.wilds) as a_react, count(*) as a_drops
    from public.drops d where coalesce(d.audience, 'public') = 'public' group by d.author_id
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
    round(greatest(0, vscore - (rn - 1) * 0.12)::numeric, 3) as visibility,
    fx, audience, playback_customization
  from vis
  order by greatest(0, vscore - (rn - 1) * 0.12) desc, created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.discovery_feed(int, int) to anon, authenticated;
