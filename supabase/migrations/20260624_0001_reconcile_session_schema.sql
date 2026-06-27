-- Reconcile migration: captures the database objects that were applied to the
-- live project during the "fresh reset + overhaul" work but were never written
-- back into schema.sql (schema drift). Everything here is idempotent
-- (create-or-replace / if-not-exists) so it is safe to run on the live DB and
-- makes a fresh environment reproducible.
--
-- Apply with: supabase db push  (or paste into the SQL editor / Management API).

-- ── Username identity ──────────────────────────────────────────────────────
alter table public.profiles add column if not exists username text;
alter table public.profiles add column if not exists username_changed boolean not null default false;
create unique index if not exists profiles_username_lower_idx
  on public.profiles (lower(username)) where username is not null;

-- One-time username customization (guests + members).
create or replace function public.change_username(p_name text)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid(); norm text; taken int;
begin
  if uid is null then return false; end if;
  norm := btrim(regexp_replace(p_name, '\s+', ' ', 'g'));
  if norm = '' or char_length(norm) < 2 or char_length(norm) > 24 then return false; end if;
  if norm !~ '^[A-Za-z]+( [A-Za-z]+){0,2}$' then return false; end if;
  if (select coalesce(username_changed, false) from public.profiles where id = uid) then
    return false; -- one-time change already used
  end if;
  select count(*) into taken from public.profiles where lower(username) = lower(norm) and id <> uid;
  if taken > 0 then return false; end if;
  update public.profiles set username = norm, username_changed = true where id = uid;
  return true;
end $fn$;
grant execute on function public.change_username(text) to authenticated;

-- ── Owner auto-admin ───────────────────────────────────────────────────────
create or replace function public.grant_admin_for_owner() returns trigger
language plpgsql security definer set search_path = public, auth as $fn$
declare em text;
begin
  select lower(email) into em from auth.users where id = NEW.id;
  if em = 'andrewiguess@gmail.com' then
    NEW.is_admin := true;
  end if;
  return NEW;
end $fn$;
drop trigger if exists trg_grant_admin_owner on public.profiles;
create trigger trg_grant_admin_owner before insert or update on public.profiles
for each row execute function public.grant_admin_for_owner();

-- ── Admin: find any registered account (username-first) ────────────────────
drop function if exists public.admin_list_users(text, int);
create or replace function public.admin_list_users(p_query text default '', p_limit int default 30)
returns table(id uuid, alias text, username text, godmode boolean, banned boolean, anonymous boolean, gender text, age int, created_at timestamptz)
language sql security definer set search_path = public stable as $fn$
  select p.id, p.alias, p.username, coalesce(p.godmode,false), coalesce(p.banned,false),
         coalesce(p.anonymous,false), p.gender, p.age, p.created_at
  from public.profiles p
  where exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false))
    and (coalesce(p_query,'') = ''
         or p.username ilike '%'||p_query||'%'
         or p.alias ilike '%'||p_query||'%'
         or p.id::text = p_query)
  order by p.last_active_at desc nulls last
  limit greatest(1, least(200, p_limit));
$fn$;
grant execute on function public.admin_list_users(text, int) to authenticated;

-- ── Admin: guest→member conversion dashboard ───────────────────────────────
create or replace function public.admin_stats()
returns table(total int, members int, guests int)
language sql security definer set search_path = public stable as $fn$
  select
    count(*)::int,
    count(*) filter (where coalesce(anonymous,false) = false)::int,
    count(*) filter (where coalesce(anonymous,false) = true)::int
  from public.profiles
  where exists (select 1 from public.profiles me where me.id = auth.uid() and coalesce(me.is_admin,false));
$fn$;
grant execute on function public.admin_stats() to authenticated;

-- ── Random chat eligibility: require permanent age + sex ───────────────────
create or replace function public.roulette_enqueue()
returns table(session_id uuid, partner_id uuid, waiting boolean, eligible boolean)
language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  my_age int; my_gender text; my_layer text; anon boolean; is_banned boolean;
  partner uuid; new_sess uuid;
begin
  if uid is null then return query select null::uuid, null::uuid, false, false; return; end if;
  select age, gender, coalesce(anonymous,false), coalesce(banned,false)
    into my_age, my_gender, anon, is_banned from public.profiles where id = uid;
  if anon or is_banned or my_age is null or my_gender is null then
    return query select null::uuid, null::uuid, false, false; return;
  end if;
  my_layer := case when my_age < 18 then 'teen' else 'adult' end;

  delete from public.roulette_queue where user_id = uid;

  select q.user_id into partner
  from public.roulette_queue q
  join public.profiles p on p.id = q.user_id
  where q.user_id <> uid and q.age_layer = my_layer and coalesce(p.banned,false) = false
  order by q.enqueued_at asc
  limit 1;

  if partner is not null then
    delete from public.roulette_queue where user_id = partner;
    insert into public.roulette_sessions(a, b) values (uid, partner) returning id into new_sess;
    return query select new_sess, partner, false, true; return;
  end if;

  insert into public.roulette_queue(user_id, age_layer) values (uid, my_layer)
    on conflict (user_id) do update set age_layer = excluded.age_layer, enqueued_at = now();
  return query select null::uuid, null::uuid, true, true;
end $fn$;
grant execute on function public.roulette_enqueue() to authenticated;

-- ── Leaderboards / friends-plays expose username ───────────────────────────
drop function if exists public.game_leaderboard(text, int, boolean);
create or replace function public.game_leaderboard(p_game text, p_limit int default 20, p_local boolean default false)
returns table(
  user_id uuid, emoji_key text, username text, alias text, godmode boolean,
  best int, plays int, rank int, is_me boolean
)
language sql security definer set search_path = public as $fn$
  with ranked as (
    select gs.user_id, p.emoji_key, p.username, p.alias, coalesce(p.godmode,false) as godmode,
           gs.best, gs.plays,
           rank() over (order by gs.best desc, gs.updated_at asc) as rank
    from public.game_scores gs join public.profiles p on p.id = gs.user_id
    where gs.game = p_game and gs.best > 0
      and coalesce(p.banned,false) = false and coalesce(p.anonymous,false) = false
      and (not p_local or (p.location is not null
            and lower(p.location) = lower((select location from public.profiles where id = auth.uid()))))
  )
  select user_id, emoji_key, username, alias, godmode, best, plays, rank::int, (user_id = auth.uid()) as is_me
  from ranked order by rank limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.game_leaderboard(text, int, boolean) to anon, authenticated;

drop function if exists public.friends_recent_plays(int);
create or replace function public.friends_recent_plays(p_limit int default 8)
returns table(user_id uuid, emoji_key text, username text, alias text, game text, best int, plays int, updated_at timestamptz)
language sql security definer set search_path = public as $fn$
  with my_friends as (
    select case when requester_id = auth.uid() then addressee_id else requester_id end as fid
    from public.friendships
    where status = 'friends' and (requester_id = auth.uid() or addressee_id = auth.uid())
  )
  select gs.user_id, p.emoji_key, p.username, p.alias, gs.game, gs.best, gs.plays, gs.updated_at
  from public.game_scores gs
  join my_friends f on f.fid = gs.user_id
  join public.profiles p on p.id = gs.user_id
  where coalesce(p.banned, false) = false
  order by gs.updated_at desc limit greatest(1, least(50, p_limit));
$fn$;
grant execute on function public.friends_recent_plays(int) to authenticated;

-- ── AI generation removed: drop the column + de-reference it ───────────────
create or replace function public.admin_create_post(p_author uuid, p_body text, p_photo text, p_nsfw boolean, p_ai boolean, p_publish_at timestamptz, p_seed integer)
returns uuid language plpgsql security definer as $fn$
declare new_id uuid; al text;
begin
  if not public.is_admin(auth.uid()) then raise exception 'not admin'; end if;
  select emoji_key into al from public.profiles where id = p_author;
  insert into public.confessions(author_id, alias, body, photo_url, media_kind, nsfw, seed, publish_at)
    values (p_author, al, p_body, p_photo, 'image', coalesce(p_nsfw,false),
            coalesce(p_seed, floor(random()*1000000)::int), p_publish_at)
    returning id into new_id;
  insert into public.admin_actions(admin_id, action, target, detail)
    values (auth.uid(), 'create_post', new_id::text, jsonb_build_object('author', p_author, 'nsfw', p_nsfw, 'scheduled', p_publish_at is not null));
  return new_id;
end $fn$;
alter table public.confessions drop column if exists ai_visual;

-- ── Storage: private post bucket + public cosmetic/chat bucket ─────────────
insert into storage.buckets (id, name, public, file_size_limit)
values ('media-public', 'media-public', true, 52428800)
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;
update storage.buckets set public = false where id = 'confessions';
drop policy if exists "media-public insert" on storage.objects;
drop policy if exists "media-public read" on storage.objects;
create policy "media-public insert" on storage.objects for insert with check (bucket_id = 'media-public');
create policy "media-public read" on storage.objects for select using (bucket_id = 'media-public');
