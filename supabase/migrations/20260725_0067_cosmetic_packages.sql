-- Phase 4 — Profile Enhancement Packages as primary monetization.
-- Cosmetics stay visual-only (L4). Analytics + fairness guardrails for admins.

-- Expand category check
alter table public.cosmetics drop constraint if exists cosmetics_category_check;
alter table public.cosmetics add constraint cosmetics_category_check
  check (category in ('accent', 'flair', 'frame', 'backdrop'));

-- New SKUs (visual only)
insert into public.cosmetics (id, name, category, price, data, sort) values
  ('accent_coral',   'Coral Pulse',     'accent', 10, '{"c0":"#FF6B4A","c1":"#FF5D8F"}', 6),
  ('accent_signal',  'Signal Lime',     'accent', 10, '{"c0":"#00C2FF","c1":"#A3E635"}', 7),
  ('flair_spark',    'Spark',           'flair',  12, '{"label":"Spark","icon":"✦","color":"#7cf5d8"}', 14),
  ('flair_vibes',    'Good Vibes',      'flair',  12, '{"label":"Good Vibes","icon":"♡","color":"#ff8a5b"}', 15),
  ('flair_seasonal', 'Seasonal',        'flair',  18, '{"label":"Seasonal","icon":"❀","color":"#f9d976"}', 16),
  ('frame_thin',     'Thin Ring',       'frame',   8, '{"ring":"#a87cf8","ringW":2}', 20),
  ('frame_gold',     'Gold Ring',       'frame',  15, '{"ring":"#c9a227","ringW":3}', 21),
  ('frame_pulse',    'Pulse Ring',      'frame',  18, '{"ring":"#7cf5d8","ringW":3}', 22),
  ('backdrop_ember', 'Ember Backdrop',  'backdrop', 25, '{"bg":"ember"}', 30),
  ('backdrop_tide',  'Tide Backdrop',   'backdrop', 25, '{"bg":"tide"}', 31),
  ('backdrop_ink',   'Mist Backdrop',   'backdrop', 25, '{"bg":"ink"}', 32),
  ('backdrop_rose',  'Coral Backdrop',  'backdrop', 25, '{"bg":"rose"}', 33)
on conflict (id) do update
  set name = excluded.name, category = excluded.category, price = excluded.price,
      data = excluded.data, sort = excluded.sort, active = true;

-- Packages (bundles of cosmetic ids)
create table if not exists public.cosmetic_packages (
  id text primary key,
  name text not null,
  tagline text not null default '',
  price_credits int not null check (price_credits >= 0),
  item_ids text[] not null,
  featured boolean not null default false,
  active boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);
alter table public.cosmetic_packages enable row level security;
drop policy if exists cosmetic_packages_read on public.cosmetic_packages;
create policy cosmetic_packages_read on public.cosmetic_packages for select
  using (active = true or public.is_platform_admin());
grant select on public.cosmetic_packages to authenticated;

insert into public.cosmetic_packages (id, name, tagline, price_credits, item_ids, featured, sort) values
  ('pack_starter_flair', 'Starter Flair', 'Accent + flair to make your profile yours',
    18, array['accent_aurora','flair_spark'], true, 1),
  ('pack_founder', 'Founder Pack', 'Founding flair, gold ring, midnight gold accent',
    40, array['accent_gold','flair_founding','frame_gold'], true, 2),
  ('pack_seasonal', 'Seasonal Glow', 'Seasonal flair + coral accent + thin ring',
    32, array['accent_coral','flair_seasonal','frame_thin'], true, 3),
  ('pack_backdrop_ember', 'Ember Scene', 'Warm backdrop + ember accent — looks only',
    38, array['backdrop_ember','accent_ember'], false, 4)
on conflict (id) do update
  set name = excluded.name, tagline = excluded.tagline, price_credits = excluded.price_credits,
      item_ids = excluded.item_ids, featured = excluded.featured, sort = excluded.sort, active = true;

-- Purchase ledger (analytics)
create table if not exists public.cosmetic_purchase_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check (kind in ('item', 'package')),
  sku text not null,
  credits int not null,
  created_at timestamptz not null default now()
);
create index if not exists cosmetic_purchase_events_user_idx
  on public.cosmetic_purchase_events (user_id, created_at desc);
alter table public.cosmetic_purchase_events enable row level security;
drop policy if exists cosmetic_purchase_events_own on public.cosmetic_purchase_events;
create policy cosmetic_purchase_events_own on public.cosmetic_purchase_events for select
  using (user_id = auth.uid() or public.is_platform_admin());
grant select on public.cosmetic_purchase_events to authenticated;

-- Wrap purchase_cosmetic with event logging
create or replace function public.purchase_cosmetic(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare uid uuid := auth.uid(); c public.cosmetics%rowtype; bal int;
begin
  if uid is null then raise exception 'auth required'; end if;
  select * into c from public.cosmetics where id = p_id and active = true;
  if not found then raise exception 'not found'; end if;
  if exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = p_id) then
    return jsonb_build_object('owned', true, 'credits', (select mod_points from public.profiles where id = uid));
  end if;
  select mod_points into bal from public.profiles where id = uid for update;
  if coalesce(bal, 0) < c.price then raise exception 'not enough credits'; end if;
  update public.profiles set mod_points = bal - c.price where id = uid;
  insert into public.user_cosmetics (user_id, cosmetic_id, acquired_via) values (uid, p_id, 'credits');
  insert into public.cosmetic_purchase_events (user_id, kind, sku, credits)
  values (uid, 'item', p_id, c.price);
  return jsonb_build_object('owned', true, 'credits', bal - c.price);
end;
$$;
grant execute on function public.purchase_cosmetic(text) to authenticated;

create or replace function public.purchase_cosmetic_package(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  pkg public.cosmetic_packages%rowtype;
  bal int;
  cid text;
  newly int := 0;
begin
  if uid is null then raise exception 'auth required'; end if;
  select * into pkg from public.cosmetic_packages where id = p_id and active = true;
  if not found then raise exception 'package not found'; end if;
  select mod_points into bal from public.profiles where id = uid for update;
  if coalesce(bal, 0) < pkg.price_credits then raise exception 'not enough credits'; end if;

  foreach cid in array pkg.item_ids loop
    if not exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = cid)
       and exists (select 1 from public.cosmetics where id = cid and active) then
      insert into public.user_cosmetics (user_id, cosmetic_id, acquired_via)
      values (uid, cid, 'package');
      newly := newly + 1;
    end if;
  end loop;

  if newly = 0 then
    return jsonb_build_object(
      'owned', true,
      'credits', bal,
      'newItems', 0,
      'message', 'You already own everything in this pack'
    );
  end if;

  update public.profiles set mod_points = bal - pkg.price_credits where id = uid;
  insert into public.cosmetic_purchase_events (user_id, kind, sku, credits)
  values (uid, 'package', p_id, pkg.price_credits);

  return jsonb_build_object(
    'owned', true,
    'credits', bal - pkg.price_credits,
    'newItems', newly,
    'ownedIds', coalesce((select jsonb_agg(cosmetic_id) from public.user_cosmetics where user_id = uid), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.purchase_cosmetic_package(text) to authenticated;

-- list_cosmetics includes packages
create or replace function public.list_cosmetics()
returns jsonb language plpgsql stable security definer set search_path = public as $$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  return jsonb_build_object(
    'credits', coalesce((select mod_points from public.profiles where id = auth.uid()), 0),
    'equipped', coalesce((select equipped_cosmetics from public.profiles where id = auth.uid()), '{}'::jsonb),
    'owned', coalesce((select jsonb_agg(cosmetic_id) from public.user_cosmetics where user_id = auth.uid()), '[]'::jsonb),
    'catalog', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'category', category, 'price', price, 'data', data
      ) order by sort)
      from public.cosmetics where active = true
    ), '[]'::jsonb),
    'packages', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', id, 'name', name, 'tagline', tagline, 'price', price_credits,
        'itemIds', item_ids, 'featured', featured
      ) order by sort)
      from public.cosmetic_packages where active = true
    ), '[]'::jsonb)
  );
end;
$$;
grant execute on function public.list_cosmetics() to authenticated;

-- Admin: conversion stats (7d)
create or replace function public.admin_cosmetic_stats()
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  topups jsonb;
  purchases jsonb;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;

  select jsonb_build_object(
    'paidCount', count(*) filter (where status = 'paid' and created_at > now() - interval '7 days'),
    'revenueCents', coalesce(sum(amount_cents) filter (where status = 'paid' and created_at > now() - interval '7 days'), 0),
    'creditsIssued', coalesce(sum(credits) filter (where status = 'paid' and created_at > now() - interval '7 days'), 0)
  ) into topups
  from public.credit_topups;

  select jsonb_build_object(
    'purchases7d', count(*) filter (where created_at > now() - interval '7 days'),
    'uniqueBuyers7d', count(distinct user_id) filter (where created_at > now() - interval '7 days'),
    'packagePurchases7d', count(*) filter (where kind = 'package' and created_at > now() - interval '7 days'),
    'itemPurchases7d', count(*) filter (where kind = 'item' and created_at > now() - interval '7 days'),
    'creditsSpent7d', coalesce(sum(credits) filter (where created_at > now() - interval '7 days'), 0),
    'ownersTotal', (select count(distinct user_id) from public.user_cosmetics)
  ) into purchases
  from public.cosmetic_purchase_events;

  return jsonb_build_object(
    'topups', coalesce(topups, '{}'::jsonb),
    'purchases', coalesce(purchases, '{}'::jsonb),
    'doctrine', 'Cosmetics never affect match fit (L4)'
  );
end;
$$;
grant execute on function public.admin_cosmetic_stats() to authenticated;

-- Admin: free vs cosmetic-owner fairness (spark likes as proxy; fit must not favor owners)
create or replace function public.admin_match_fairness_guardrail(p_days int default 14)
returns jsonb language plpgsql stable security definer set search_path = public as $$
declare
  since timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 14), 90)));
  free_n int;
  owner_n int;
  free_likes int;
  owner_likes int;
  free_mutual int;
  owner_mutual int;
  free_rate numeric;
  owner_rate numeric;
  delta numeric;
  excluded_ok boolean;
begin
  if not public.is_platform_admin() then raise exception 'admin only'; end if;

  select count(*) into free_n from public.profiles p
  where coalesce(p.banned, false) = false
    and not exists (select 1 from public.user_cosmetics uc where uc.user_id = p.id);

  select count(distinct user_id) into owner_n from public.user_cosmetics;

  select count(*) into free_likes from public.spark_likes sl
  where sl.created_at >= since and sl.outcome = 'like'
    and not exists (select 1 from public.user_cosmetics uc where uc.user_id = sl.actor_id);

  select count(*) into owner_likes from public.spark_likes sl
  where sl.created_at >= since and sl.outcome = 'like'
    and exists (select 1 from public.user_cosmetics uc where uc.user_id = sl.actor_id);

  select count(*) into free_mutual from public.spark_likes a
  join public.spark_likes b
    on b.actor_id = a.target_id and b.target_id = a.actor_id and b.deck = a.deck and b.outcome = 'like'
  where a.outcome = 'like' and a.created_at >= since and a.actor_id < a.target_id
    and not exists (select 1 from public.user_cosmetics uc where uc.user_id = a.actor_id)
    and not exists (select 1 from public.user_cosmetics uc where uc.user_id = a.target_id);

  select count(*) into owner_mutual from public.spark_likes a
  join public.spark_likes b
    on b.actor_id = a.target_id and b.target_id = a.actor_id and b.deck = a.deck and b.outcome = 'like'
  where a.outcome = 'like' and a.created_at >= since and a.actor_id < a.target_id
    and (
      exists (select 1 from public.user_cosmetics uc where uc.user_id = a.actor_id)
      or exists (select 1 from public.user_cosmetics uc where uc.user_id = a.target_id)
    );

  free_rate := case when free_likes > 0 then free_mutual::numeric / free_likes else null end;
  owner_rate := case when owner_likes > 0 then owner_mutual::numeric / owner_likes else null end;
  delta := case when free_rate is null or owner_rate is null then null else owner_rate - free_rate end;

  select coalesce(bool_and(coalesce((ss.dimensions->>'cosmeticsExcluded')::boolean, false)), true)
  into excluded_ok
  from public.social_scores ss
  limit 500;

  return jsonb_build_object(
    'days', p_days,
    'freeUsers', free_n,
    'cosmeticOwners', owner_n,
    'likesFree', free_likes,
    'likesOwners', owner_likes,
    'mutualPairsFree', free_mutual,
    'mutualPairsOwnerTouch', owner_mutual,
    'mutualPerLikeFree', free_rate,
    'mutualPerLikeOwners', owner_rate,
    'deltaMutualRate', delta,
    'alert', coalesce(abs(delta) > 0.05, false),
    'cosmeticsExcludedInScores', coalesce(excluded_ok, true),
    'note', 'Guardrail uses spark outcomes; fit RPCs must ignore cosmetics/payment'
  );
end;
$$;
grant execute on function public.admin_match_fairness_guardrail(int) to authenticated;
