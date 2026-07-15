-- ===========================================================================
-- VYBZ — cosmetic store (Lane B). Purely aesthetic items unlocked with credits
-- (mod_points earned by moderators; Stripe top-ups arrive with Lane A). NOTHING
-- functional is ever gated — cosmetics only change how a profile looks.
--
-- accent → a two-stop gradient applied to a creator's avatar + name.
-- flair  → a small badge (icon + label + colour) shown by the username.
-- ===========================================================================

set search_path = public, extensions;

alter table public.profiles add column if not exists equipped_cosmetics jsonb not null default '{}'::jsonb;

-- ── Catalog ─────────────────────────────────────────────────────────────────
create table if not exists public.cosmetics (
  id       text primary key,
  name     text not null,
  category text not null check (category in ('accent','flair')),
  price    int not null default 0,
  data     jsonb not null default '{}'::jsonb,
  sort     int not null default 0,
  active   boolean not null default true
);
alter table public.cosmetics enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='cosmetics' and policyname='cosmetics read') then
    create policy "cosmetics read" on public.cosmetics for select using (active = true or public.is_platform_admin());
  end if;
end $$;

insert into public.cosmetics (id, name, category, price, data, sort) values
  ('accent_aurora', 'Aurora',        'accent',  8, '{"c0":"#7cf5d8","c1":"#a87cf8"}', 1),
  ('accent_ember',  'Ember',         'accent',  8, '{"c0":"#ff8a5b","c1":"#ff3d7f"}', 2),
  ('accent_ocean',  'Ocean',         'accent',  8, '{"c0":"#4cc9f0","c1":"#4361ee"}', 3),
  ('accent_gold',   'Midnight Gold', 'accent', 12, '{"c0":"#f9d976","c1":"#c9a227"}', 4),
  ('accent_mono',   'Mono',          'accent',  5, '{"c0":"#e5e7eb","c1":"#9ca3af"}', 5),
  ('flair_founding','Founding Creator','flair',15, '{"label":"Founding Creator","icon":"◆","color":"#a87cf8"}', 10),
  ('flair_curator', 'Curator',       'flair',  10, '{"label":"Curator","icon":"✦","color":"#7cf5d8"}', 11),
  ('flair_nightowl','Night Owl',     'flair',   8, '{"label":"Night Owl","icon":"☾","color":"#4cc9f0"}', 12),
  ('flair_guardian','Guardian',      'flair',  20, '{"label":"Guardian","icon":"❖","color":"#ff8a5b"}', 13)
on conflict (id) do update
  set name = excluded.name, category = excluded.category, price = excluded.price, data = excluded.data, sort = excluded.sort;

-- ── Ownership ───────────────────────────────────────────────────────────────
create table if not exists public.user_cosmetics (
  user_id      uuid not null references public.profiles(id) on delete cascade,
  cosmetic_id  text not null references public.cosmetics(id) on delete cascade,
  acquired_via text not null default 'credits',
  created_at   timestamptz not null default now(),
  primary key (user_id, cosmetic_id)
);
alter table public.user_cosmetics enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='user_cosmetics' and policyname='user_cosmetics own') then
    create policy "user_cosmetics own" on public.user_cosmetics for select using (user_id = auth.uid());
  end if;
end $$;

-- ── Store RPCs ──────────────────────────────────────────────────────────────
create or replace function public.list_cosmetics()
returns jsonb language sql stable security definer set search_path = public as $fn$
  select jsonb_build_object(
    'credits',  coalesce((select mod_points from public.profiles where id = auth.uid()), 0),
    'equipped', coalesce((select equipped_cosmetics from public.profiles where id = auth.uid()), '{}'::jsonb),
    'owned',    coalesce((select jsonb_agg(cosmetic_id) from public.user_cosmetics where user_id = auth.uid()), '[]'::jsonb),
    'catalog',  coalesce((select jsonb_agg(jsonb_build_object('id', id, 'name', name, 'category', category, 'price', price, 'data', data) order by sort)
                          from public.cosmetics where active = true), '[]'::jsonb)
  );
$fn$;
grant execute on function public.list_cosmetics() to authenticated;

create or replace function public.purchase_cosmetic(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); c public.cosmetics%rowtype; bal int;
begin
  if uid is null then raise exception 'auth required'; end if;
  select * into c from public.cosmetics where id = p_id and active = true;
  if not found then raise exception 'cosmetic not found'; end if;
  if exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = p_id) then
    return jsonb_build_object('owned', true, 'credits', (select mod_points from public.profiles where id = uid));
  end if;
  select mod_points into bal from public.profiles where id = uid;
  if coalesce(bal, 0) < c.price then raise exception 'not enough credits'; end if;
  update public.profiles set mod_points = mod_points - c.price where id = uid;
  insert into public.user_cosmetics (user_id, cosmetic_id, acquired_via) values (uid, p_id, 'credits');
  return jsonb_build_object('owned', true, 'credits', (select mod_points from public.profiles where id = uid));
end $fn$;
grant execute on function public.purchase_cosmetic(text) to authenticated;

create or replace function public.equip_cosmetic(p_id text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); cat text;
begin
  if uid is null then raise exception 'auth required'; end if;
  if not exists (select 1 from public.user_cosmetics where user_id = uid and cosmetic_id = p_id) then
    raise exception 'not owned';
  end if;
  select category into cat from public.cosmetics where id = p_id;
  update public.profiles
    set equipped_cosmetics = coalesce(equipped_cosmetics, '{}'::jsonb) || jsonb_build_object(cat, p_id)
    where id = uid;
  return (select equipped_cosmetics from public.profiles where id = uid);
end $fn$;
grant execute on function public.equip_cosmetic(text) to authenticated;

create or replace function public.unequip_cosmetic(p_category text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then raise exception 'auth required'; end if;
  update public.profiles set equipped_cosmetics = coalesce(equipped_cosmetics, '{}'::jsonb) - p_category where id = auth.uid();
  return (select equipped_cosmetics from public.profiles where id = auth.uid());
end $fn$;
grant execute on function public.unequip_cosmetic(text) to authenticated;

-- ── Expose a viewed profile's equipped cosmetics (client resolves via catalog) ─
drop function if exists public.public_profile(uuid);
create or replace function public.public_profile(p_id uuid)
returns table(id uuid, username text, display_name text, avatar_url text, bio text, location text, music_url text, profile jsonb, equipped_cosmetics jsonb, created_at timestamptz)
language sql stable security definer set search_path to 'public' as $function$
  select p.id, p.username, p.display_name, p.avatar_url, p.bio, p.location, p.music_url,
    ( select coalesce(jsonb_object_agg(k, v), '{}'::jsonb)
      from jsonb_each(coalesce(p.profile, '{}'::jsonb)) as e(k, v)
      where k <> '_hidden'
        and not (coalesce(p.profile->'_hidden', '[]'::jsonb) ? k) ) as profile,
    coalesce(p.equipped_cosmetics, '{}'::jsonb) as equipped_cosmetics,
    p.created_at
  from public.profiles p
  where p.id = p_id and coalesce(p.banned, false) = false;
$function$;
grant execute on function public.public_profile(uuid) to authenticated;
