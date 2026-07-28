-- For You drops + live tip goals + collaborative VYBZ lists

-- ── Personalized drop radio (taste + cold-start discovery) ───────────────────
create or replace function public.for_you_drops(p_limit int default 24)
returns jsonb
language plpgsql
security definer
set search_path = public
volatile
as $fn$
declare
  uid uuid := auth.uid();
  lim int := least(greatest(coalesce(p_limit, 24), 1), 60);
begin
  if uid is null then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      with my_genres as (
        select coalesce(
          (select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p.profile->'genres', '[]'::jsonb)) x),
          '{}'::text[]
        ) as g
        from public.profiles p where p.id = uid
      ),
      my_played as (
        select drop_id from public.drop_plays where user_id = uid
      ),
      scored as (
        select
          d.*,
          (
            case when exists (
              select 1 from public.profiles ap, my_genres mg
              where ap.id = d.author_id
                and exists (
                  select 1
                  from jsonb_array_elements_text(coalesce(ap.profile->'genres', '[]'::jsonb)) gx
                  where lower(gx) = any (mg.g)
                )
            ) then 0.55 else 0.15 end
            + case when d.id in (select drop_id from my_played) then -0.35 else 0.25 end
            + least(0.25, 1.0 / (1.0 + extract(epoch from (now() - d.created_at)) / 86400.0))
            + (random() * 0.12)
          )::numeric as score
        from public.drops d
        where d.author_id <> uid
          and d.asset_id is not null
          and coalesce(d.audience, 'public') = 'public'
      )
      select * from scored
      order by score desc, created_at desc
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$fn$;
grant execute on function public.for_you_drops(int) to authenticated;

-- ── Live tip goals (uses live_sessions.monetization jsonb) ───────────────────
-- monetization shape: { "tip_goal": number, "tip_raised": number, "tip_count": number }

create or replace function public.live_set_tip_goal(p_session uuid, p_goal numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  host uuid;
  g numeric(18,4);
  m jsonb;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  g := greatest(1, least(coalesce(p_goal, 0), 100000))::numeric(18,4);
  select host_id, monetization into host, m from public.live_sessions where id = p_session;
  if host is null then return jsonb_build_object('ok', false, 'error', 'not_found'); end if;
  if host <> uid then return jsonb_build_object('ok', false, 'error', 'forbidden'); end if;
  m := coalesce(m, '{}'::jsonb)
    || jsonb_build_object('tip_goal', g, 'tip_raised', coalesce((m->>'tip_raised')::numeric, 0), 'tip_count', coalesce((m->>'tip_count')::int, 0));
  update public.live_sessions set monetization = m where id = p_session;
  return jsonb_build_object('ok', true, 'monetization', m);
end;
$fn$;
grant execute on function public.live_set_tip_goal(uuid, numeric) to authenticated;

create or replace function public.live_tip(p_session uuid, p_amount numeric, p_memo text default null)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  host uuid;
  uname text;
  amt numeric(18,4);
  tx uuid;
  m jsonb;
  raised numeric(18,4);
  cnt int;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  amt := round(coalesce(p_amount, 0)::numeric, 4);
  if amt < 0.01 then return jsonb_build_object('ok', false, 'error', 'min'); end if;

  select s.host_id, s.monetization, p.username
    into host, m, uname
  from public.live_sessions s
  join public.profiles p on p.id = s.host_id
  where s.id = p_session and s.status = 'live';

  if host is null then return jsonb_build_object('ok', false, 'error', 'not_live'); end if;
  if host = uid then return jsonb_build_object('ok', false, 'error', 'self'); end if;
  if uname is null or length(trim(uname)) = 0 then
    return jsonb_build_object('ok', false, 'error', 'host_username');
  end if;

  begin
    tx := public.vc_transfer_username(
      uname,
      amt,
      coalesce(nullif(trim(p_memo), ''), 'Live tip')
    );
  exception when others then
    return jsonb_build_object('ok', false, 'error', SQLERRM);
  end;

  raised := coalesce((m->>'tip_raised')::numeric, 0) + amt;
  cnt := coalesce((m->>'tip_count')::int, 0) + 1;
  m := coalesce(m, '{}'::jsonb) || jsonb_build_object(
    'tip_raised', raised,
    'tip_count', cnt,
    'tip_goal', coalesce((m->>'tip_goal')::numeric, 50)
  );
  update public.live_sessions set monetization = m where id = p_session;

  return jsonb_build_object('ok', true, 'id', tx, 'monetization', m);
end;
$fn$;
grant execute on function public.live_tip(uuid, numeric, text) to authenticated;

-- ── Collaborative VYBZ lists (drop-based playlists) ─────────────────────────
create table if not exists public.vybz_lists (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  title text not null check (char_length(trim(title)) between 1 and 80),
  description text check (description is null or char_length(description) <= 280),
  is_public boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists vybz_lists_owner_idx on public.vybz_lists (owner_id, updated_at desc);
alter table public.vybz_lists enable row level security;

drop policy if exists "vybz_lists insert" on public.vybz_lists;
create policy "vybz_lists insert" on public.vybz_lists
  for insert with check (owner_id = auth.uid());
drop policy if exists "vybz_lists update" on public.vybz_lists;
create policy "vybz_lists update" on public.vybz_lists
  for update using (owner_id = auth.uid());
drop policy if exists "vybz_lists delete" on public.vybz_lists;
create policy "vybz_lists delete" on public.vybz_lists
  for delete using (owner_id = auth.uid());
grant select, insert, update, delete on public.vybz_lists to authenticated;

create table if not exists public.vybz_list_members (
  list_id uuid not null references public.vybz_lists(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'editor' check (role in ('editor', 'viewer')),
  created_at timestamptz not null default now(),
  primary key (list_id, user_id)
);
alter table public.vybz_list_members enable row level security;
drop policy if exists "vybz_list_members read" on public.vybz_list_members;
create policy "vybz_list_members read" on public.vybz_list_members for select using (
  user_id = auth.uid()
  or exists (select 1 from public.vybz_lists l where l.id = list_id and l.owner_id = auth.uid())
);
drop policy if exists "vybz_list_members write owner" on public.vybz_list_members;
create policy "vybz_list_members write owner" on public.vybz_list_members for all using (
  exists (select 1 from public.vybz_lists l where l.id = list_id and l.owner_id = auth.uid())
) with check (
  exists (select 1 from public.vybz_lists l where l.id = list_id and l.owner_id = auth.uid())
);
grant select, insert, update, delete on public.vybz_list_members to authenticated;

create table if not exists public.vybz_list_tracks (
  list_id uuid not null references public.vybz_lists(id) on delete cascade,
  drop_id uuid not null references public.drops(id) on delete cascade,
  position int not null default 0,
  added_by uuid not null references public.profiles(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (list_id, drop_id)
);
create index if not exists vybz_list_tracks_pos on public.vybz_list_tracks (list_id, position);
alter table public.vybz_list_tracks enable row level security;
drop policy if exists "vybz_list_tracks read" on public.vybz_list_tracks;
create policy "vybz_list_tracks read" on public.vybz_list_tracks for select using (
  exists (
    select 1 from public.vybz_lists l
    where l.id = list_id and (
      l.is_public or l.owner_id = auth.uid()
      or exists (select 1 from public.vybz_list_members m where m.list_id = l.id and m.user_id = auth.uid())
    )
  )
);
drop policy if exists "vybz_list_tracks write" on public.vybz_list_tracks;
create policy "vybz_list_tracks write" on public.vybz_list_tracks for all using (
  exists (
    select 1 from public.vybz_lists l
    where l.id = list_id and (
      l.owner_id = auth.uid()
      or exists (
        select 1 from public.vybz_list_members m
        where m.list_id = l.id and m.user_id = auth.uid() and m.role = 'editor'
      )
    )
  )
) with check (
  added_by = auth.uid() and exists (
    select 1 from public.vybz_lists l
    where l.id = list_id and (
      l.owner_id = auth.uid()
      or exists (
        select 1 from public.vybz_list_members m
        where m.list_id = l.id and m.user_id = auth.uid() and m.role = 'editor'
      )
    )
  )
);
grant select, insert, update, delete on public.vybz_list_tracks to authenticated;

-- Fix RLS on vybz_lists that references members (create policy after members table)
drop policy if exists "vybz_lists read" on public.vybz_lists;
create policy "vybz_lists read" on public.vybz_lists for select using (
  is_public or owner_id = auth.uid()
  or exists (
    select 1 from public.vybz_list_members m
    where m.list_id = vybz_lists.id and m.user_id = auth.uid()
  )
);

create or replace function public.vybz_list_create(p_title text, p_description text default null)
returns uuid
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  lid uuid;
  t text := trim(both from coalesce(p_title, ''));
begin
  if uid is null then raise exception 'auth required'; end if;
  if char_length(t) < 1 then raise exception 'title required'; end if;
  insert into public.vybz_lists (owner_id, title, description)
  values (uid, left(t, 80), nullif(trim(both from coalesce(p_description, '')), ''))
  returning id into lid;
  insert into public.vybz_list_members (list_id, user_id, role) values (lid, uid, 'editor')
  on conflict do nothing;
  return lid;
end;
$fn$;
grant execute on function public.vybz_list_create(text, text) to authenticated;

create or replace function public.vybz_list_add_track(p_list uuid, p_drop uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  pos int;
begin
  if uid is null then return false; end if;
  if not exists (
    select 1 from public.vybz_lists l
    where l.id = p_list and (
      l.owner_id = uid
      or exists (select 1 from public.vybz_list_members m where m.list_id = l.id and m.user_id = uid and m.role = 'editor')
    )
  ) then return false; end if;
  if not exists (select 1 from public.drops where id = p_drop) then return false; end if;
  select coalesce(max(position), -1) + 1 into pos from public.vybz_list_tracks where list_id = p_list;
  insert into public.vybz_list_tracks (list_id, drop_id, position, added_by)
  values (p_list, p_drop, pos, uid)
  on conflict (list_id, drop_id) do nothing;
  update public.vybz_lists set updated_at = now() where id = p_list;
  return true;
end;
$fn$;
grant execute on function public.vybz_list_add_track(uuid, uuid) to authenticated;

create or replace function public.vybz_list_mine(p_limit int default 40)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select l.id, l.title, l.description, l.is_public, l.created_at, l.updated_at, l.owner_id,
      (select count(*)::int from public.vybz_list_tracks x where x.list_id = l.id) as track_count
    from public.vybz_lists l
    where l.owner_id = auth.uid()
       or exists (select 1 from public.vybz_list_members m where m.list_id = l.id and m.user_id = auth.uid())
    order by l.updated_at desc
    limit least(greatest(coalesce(p_limit, 40), 1), 80)
  ) t;
$fn$;
grant execute on function public.vybz_list_mine(int) to authenticated;

create or replace function public.vybz_list_drop_ids(p_list uuid)
returns uuid[]
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(array_agg(drop_id order by position), '{}'::uuid[])
  from public.vybz_list_tracks
  where list_id = p_list
    and exists (
      select 1 from public.vybz_lists l
      where l.id = p_list and (
        l.is_public or l.owner_id = auth.uid()
        or exists (select 1 from public.vybz_list_members m where m.list_id = l.id and m.user_id = auth.uid())
      )
    );
$fn$;
grant execute on function public.vybz_list_drop_ids(uuid) to authenticated;
