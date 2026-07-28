-- Timestamped waveform comments (SoundCloud-style)
create table if not exists public.drop_wave_comments (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  body text not null check (char_length(trim(body)) between 1 and 280),
  time_sec numeric(10,2) not null check (time_sec >= 0),
  created_at timestamptz not null default now()
);
create index if not exists drop_wave_comments_drop_time on public.drop_wave_comments (drop_id, time_sec);
alter table public.drop_wave_comments enable row level security;

drop policy if exists "wave comments read" on public.drop_wave_comments;
create policy "wave comments read" on public.drop_wave_comments for select using (true);
drop policy if exists "wave comments insert own" on public.drop_wave_comments;
create policy "wave comments insert own" on public.drop_wave_comments
  for insert with check (user_id = auth.uid());
drop policy if exists "wave comments delete own" on public.drop_wave_comments;
create policy "wave comments delete own" on public.drop_wave_comments
  for delete using (user_id = auth.uid());
grant select, insert, delete on public.drop_wave_comments to authenticated;
grant select on public.drop_wave_comments to anon;

create or replace function public.list_wave_comments(p_drop uuid, p_limit int default 80)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb), '[]'::jsonb)
  from (
    select c.id, c.drop_id, c.user_id, c.body, c.time_sec, c.created_at,
           p.username, p.avatar_url
    from public.drop_wave_comments c
    join public.profiles p on p.id = c.user_id
    where c.drop_id = p_drop
    order by c.time_sec asc, c.created_at asc
    limit least(greatest(coalesce(p_limit, 80), 1), 200)
  ) t;
$fn$;
grant execute on function public.list_wave_comments(uuid, int) to authenticated, anon;

create or replace function public.add_wave_comment(p_drop uuid, p_body text, p_time numeric)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  cleaned text;
  rid uuid;
begin
  if uid is null then return jsonb_build_object('ok', false, 'error', 'auth'); end if;
  cleaned := trim(both from coalesce(p_body, ''));
  if char_length(cleaned) < 1 or char_length(cleaned) > 280 then
    return jsonb_build_object('ok', false, 'error', 'length');
  end if;
  if not exists (select 1 from public.drops where id = p_drop) then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  insert into public.drop_wave_comments (drop_id, user_id, body, time_sec)
  values (p_drop, uid, cleaned, greatest(0, coalesce(p_time, 0)))
  returning id into rid;
  return jsonb_build_object('ok', true, 'id', rid);
end;
$fn$;
grant execute on function public.add_wave_comment(uuid, text, numeric) to authenticated;
