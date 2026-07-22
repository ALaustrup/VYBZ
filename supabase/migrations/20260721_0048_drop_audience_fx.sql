-- ===========================================================================
-- VYBZ — drop audience (public / followers / private) + per-drop FX + invites.
-- Hardens discovery_feed and list_visible_drops so non-public drops never leak.
-- ===========================================================================

set search_path = public, extensions;

alter table public.drops add column if not exists fx text not null default 'glow'
  check (fx in ('off','glow','aurora','pulse','bars','ripple'));
alter table public.drops add column if not exists audience text not null default 'public'
  check (audience in ('public','followers','private'));

-- Drop private invitees (uploader + these users can see the drop).
create table if not exists public.drop_invites (
  drop_id uuid not null references public.drops(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (drop_id, invitee_id)
);
alter table public.drop_invites enable row level security;
drop policy if exists "drop_invites read" on public.drop_invites;
create policy "drop_invites read" on public.drop_invites for select using (
  invitee_id = auth.uid()
  or exists (select 1 from public.drops d where d.id = drop_id and d.author_id = auth.uid())
);
drop policy if exists "drop_invites write own" on public.drop_invites;
create policy "drop_invites write own" on public.drop_invites for all using (
  exists (select 1 from public.drops d where d.id = drop_id and d.author_id = auth.uid())
) with check (
  exists (select 1 from public.drops d where d.id = drop_id and d.author_id = auth.uid())
);
grant select, insert, update, delete on public.drop_invites to authenticated;

-- Optional: project post private audience + invites
alter table public.project_posts drop constraint if exists project_posts_audience_check;
alter table public.project_posts add constraint project_posts_audience_check
  check (audience in ('public','followers','private'));

create table if not exists public.post_invites (
  post_id uuid not null references public.project_posts(id) on delete cascade,
  invitee_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (post_id, invitee_id)
);
alter table public.post_invites enable row level security;
drop policy if exists "post_invites read" on public.post_invites;
create policy "post_invites read" on public.post_invites for select using (
  invitee_id = auth.uid()
  or exists (
    select 1 from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id
    where pp.id = post_id and pr.user_id = auth.uid()
  )
);
drop policy if exists "post_invites write own" on public.post_invites;
create policy "post_invites write own" on public.post_invites for all using (
  exists (
    select 1 from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id
    where pp.id = post_id and pr.user_id = auth.uid()
  )
) with check (
  exists (
    select 1 from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id
    where pp.id = post_id and pr.user_id = auth.uid()
  )
);
grant select, insert, update, delete on public.post_invites to authenticated;

-- Visibility helper for drops
create or replace function public.can_view_drop(p_author uuid, p_audience text, p_drop uuid)
returns boolean language sql stable security definer set search_path = public as $fn$
  select
    coalesce(p_audience, 'public') = 'public'
    or p_author = auth.uid()
    or (
      coalesce(p_audience, 'public') = 'followers'
      and auth.uid() is not null
      and exists (
        select 1 from public.connections c
        where c.status = 'accepted'
          and ((c.requester_id = p_author and c.addressee_id = auth.uid())
            or (c.addressee_id = p_author and c.requester_id = auth.uid()))
      )
    )
    or (
      coalesce(p_audience, 'public') = 'private'
      and auth.uid() is not null
      and exists (
        select 1 from public.drop_invites i
        where i.drop_id = p_drop and i.invitee_id = auth.uid()
      )
    );
$fn$;

-- RLS: replace open read with visibility-aware select
drop policy if exists "drops read" on public.drops;
create policy "drops read" on public.drops for select using (
  public.can_view_drop(author_id, audience, id)
);

-- Visible drops list for the feed
create or replace function public.list_visible_drops(p_limit int default 40)
returns setof public.drops
language sql stable security definer set search_path = public as $fn$
  select d.*
  from public.drops d
  join public.profiles p on p.id = d.author_id
  where coalesce(p.banned, false) = false
    and public.can_view_drop(d.author_id, d.audience, d.id)
  order by d.created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.list_visible_drops(int) to anon, authenticated;

-- discovery_feed: only public drops (followers/private never in discovery)
create or replace function public.discovery_feed(p_limit int default 40, p_seed int default 0)
returns table(
  id uuid, author_id uuid, title text, body text, seed int,
  feels int, wilds int, created_at timestamptz, asset_id uuid,
  plays int, popularity numeric, visibility numeric,
  fx text, audience text
)
language sql security definer set search_path = public stable as $fn$
  with base as (
    select d.id, d.author_id, d.title, d.body, d.seed, d.feels, d.wilds, d.created_at, d.asset_id, d.plays,
      d.fx, d.audience,
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
    fx, audience
  from vis
  order by greatest(0, vscore - (rn - 1) * 0.12) desc, created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.discovery_feed(int, int) to anon, authenticated;
