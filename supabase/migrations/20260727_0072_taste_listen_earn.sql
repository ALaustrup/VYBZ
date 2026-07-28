-- Music-taste matchmaking + listen/feedback earn + drop feedback notes
-- Project: VYBZ taste dashboard pivot

-- Optional written feedback on a drop (pairs with track_ratings)
create table if not exists public.drop_feedback (
  drop_id uuid not null references public.drops(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  note text not null check (char_length(trim(note)) between 8 and 280),
  created_at timestamptz not null default now(),
  primary key (drop_id, user_id)
);
alter table public.drop_feedback enable row level security;
drop policy if exists "drop_feedback read own" on public.drop_feedback;
create policy "drop_feedback read own" on public.drop_feedback
  for select using (user_id = auth.uid());
drop policy if exists "drop_feedback insert own" on public.drop_feedback;
create policy "drop_feedback insert own" on public.drop_feedback
  for insert with check (user_id = auth.uid());
drop policy if exists "drop_feedback update own" on public.drop_feedback;
create policy "drop_feedback update own" on public.drop_feedback
  for update using (user_id = auth.uid()) with check (user_id = auth.uid());
grant select, insert, update on public.drop_feedback to authenticated;

-- Submit written feedback (spam/length gated) and return note for earn hook
create or replace function public.submit_drop_feedback(p_drop uuid, p_note text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  cleaned text;
  author uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  cleaned := trim(both from coalesce(p_note, ''));
  if char_length(cleaned) < 8 then
    return jsonb_build_object('ok', false, 'error', 'too_short');
  end if;
  if char_length(cleaned) > 280 then
    cleaned := left(cleaned, 280);
  end if;
  -- Reject low-effort spam (same char repeated / no letters)
  if cleaned ~ '^(.)\1{7,}$' or cleaned !~ '[A-Za-z]' then
    return jsonb_build_object('ok', false, 'error', 'spam');
  end if;

  select author_id into author from public.drops where id = p_drop;
  if author is null then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if author = uid then
    return jsonb_build_object('ok', false, 'error', 'self');
  end if;

  insert into public.drop_feedback (drop_id, user_id, note)
  values (p_drop, uid, cleaned)
  on conflict (drop_id, user_id) do update
    set note = excluded.note, created_at = now();

  return jsonb_build_object('ok', true, 'drop_id', p_drop);
end;
$fn$;
grant execute on function public.submit_drop_feedback(uuid, text) to authenticated;

-- Patch rate_track: block self-rate (earn still client/RPC via vc_award)
create or replace function public.rate_track(p_drop uuid, p_rating int)
returns void
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  aid uuid;
  author uuid;
begin
  if uid is null then return; end if;
  select asset_id, author_id into aid, author from public.drops where id = p_drop;
  if aid is null then return; end if;
  if author = uid then return; end if;
  insert into public.track_ratings (asset_id, user_id, rating)
  values (aid, uid, least(5, greatest(1, p_rating))::smallint)
  on conflict (asset_id, user_id) do update
    set rating = excluded.rating, created_at = now();
end;
$fn$;

-- Social earn: listen + feedback amounts, anti-self listen, unique daily keys
create or replace function public.vc_award(
  p_event text,
  p_ref_type text default null,
  p_ref_id text default null,
  p_idempotency text default null
)
returns numeric
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  amt numeric(18,4) := 0;
  cap numeric(18,4) := 5;
  earned_today numeric(18,4);
  key text;
  drop_author uuid;
begin
  if uid is null then return 0; end if;

  amt := case p_event
    when 'daily_login' then 0.05
    when 'connection_accept' then 0.35
    when 'spark_match' then 0.40
    when 'dm_send' then 0.03
    when 'room_message' then 0.02
    when 'cam_call' then 0.50
    when 'video_message' then 0.50
    when 'listen_together' then 0.10
    when 'drop_react' then 0.05
    when 'track_feedback' then 0.25
    when 'track_feedback_note' then 0.15
    when 'go_live' then 1.00
    when 'intent_mix' then 0.50
    when 'profile_complete' then 0.50
    else 0
  end;

  if amt <= 0 then return 0; end if;

  -- Anti-self for listen / feedback on drops
  if p_event in ('listen_together', 'track_feedback', 'track_feedback_note', 'drop_react')
     and p_ref_type = 'drop' and p_ref_id is not null then
    begin
      select author_id into drop_author
      from public.drops
      where id = p_ref_id::uuid;
    exception when others then
      drop_author := null;
    end;
    if drop_author is not null and drop_author = uid then
      return 0;
    end if;
  end if;

  key := coalesce(
    nullif(trim(p_idempotency), ''),
    'earn:' || uid::text || ':' || p_event || ':' || coalesce(p_ref_type, '') || ':' || coalesce(p_ref_id, '') || ':' || current_date::text
  );

  if p_event in ('intent_mix', 'profile_complete', 'signup_grant') then
    key := 'earn:' || uid::text || ':' || p_event || ':' || coalesce(p_ref_id, 'once');
  end if;

  if exists (select 1 from public.vc_tx_ledger where idempotency_key = key) then
    return 0;
  end if;

  select coalesce(sum(amount), 0) into earned_today
  from public.vc_tx_ledger
  where to_id = uid and kind = 'social_earn' and created_at::date = current_date;

  if earned_today >= cap then return 0; end if;
  if earned_today + amt > cap then amt := greatest(0, cap - earned_today); end if;
  if amt <= 0 then return 0; end if;

  perform public._vc_apply(
    null, uid, amt, 'social_earn', p_ref_type, p_ref_id,
    'Earn · ' || p_event, key,
    jsonb_build_object('event', p_event)
  );
  return amt;
end;
$fn$;

-- Music-taste matches from shared plays, ratings proximity, genre overlap
create or replace function public.taste_matches(p_limit int default 30)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $fn$
declare
  uid uuid := auth.uid();
  lim int := least(greatest(coalesce(p_limit, 30), 1), 60);
begin
  if uid is null then return '[]'::jsonb; end if;

  return coalesce((
    select jsonb_agg(row_to_json(t)::jsonb)
    from (
      with my_plays as (
        select drop_id from public.drop_plays where user_id = uid
      ),
      my_assets as (
        select tr.asset_id, tr.rating
        from public.track_ratings tr
        where tr.user_id = uid
      ),
      my_genres as (
        select coalesce(
          (select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p.profile->'genres', '[]'::jsonb)) x),
          '{}'::text[]
        ) as g
        from public.profiles p where p.id = uid
      ),
      play_overlap as (
        select dp.user_id, count(*)::int as shared_plays
        from public.drop_plays dp
        join my_plays mp on mp.drop_id = dp.drop_id
        where dp.user_id <> uid
        group by dp.user_id
      ),
      rating_overlap as (
        select tr.user_id,
          count(*)::int as shared_ratings,
          avg(abs(tr.rating - ma.rating))::numeric as rating_delta
        from public.track_ratings tr
        join my_assets ma on ma.asset_id = tr.asset_id
        where tr.user_id <> uid
        group by tr.user_id
      ),
      scored as (
        select
          p.id as user_id,
          p.username,
          p.display_name,
          p.avatar_url,
          coalesce(po.shared_plays, 0) as shared_plays,
          coalesce(ro.shared_ratings, 0) as shared_ratings,
          (
            select coalesce(array_agg(g), '{}'::text[])
            from (
              select unnest(coalesce(
                (select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p.profile->'genres', '[]'::jsonb)) x),
                '{}'::text[]
              )) as g
              intersect
              select unnest((select g from my_genres))
            ) s
          ) as shared_genres,
          (
            least(1.0, coalesce(po.shared_plays, 0)::numeric / 8.0) * 0.45
            + least(1.0, coalesce(ro.shared_ratings, 0)::numeric / 5.0) * 0.35
            * (1.0 - least(1.0, coalesce(ro.rating_delta, 2)::numeric / 4.0))
            + least(1.0, (
                select count(*)::numeric
                from (
                  select unnest(coalesce(
                    (select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p.profile->'genres', '[]'::jsonb)) x),
                    '{}'::text[]
                  )) as g
                  intersect
                  select unnest((select g from my_genres))
                ) sg
              ) / 4.0) * 0.20
          )::numeric as fit
        from public.profiles p
        left join play_overlap po on po.user_id = p.id
        left join rating_overlap ro on ro.user_id = p.id
        where p.id <> uid
          and coalesce(p.banned, false) = false
          and (
            coalesce(po.shared_plays, 0) > 0
            or coalesce(ro.shared_ratings, 0) > 0
            or exists (
              select 1
              from (
                select unnest(coalesce(
                  (select array_agg(lower(x)) from jsonb_array_elements_text(coalesce(p.profile->'genres', '[]'::jsonb)) x),
                  '{}'::text[]
                )) as g
                intersect
                select unnest((select g from my_genres))
              ) sg
            )
          )
          and not exists (
            select 1 from public.connections c
            where c.status = 'accepted'
              and ((c.requester_id = uid and c.addressee_id = p.id)
                or (c.addressee_id = uid and c.requester_id = p.id))
          )
      )
      select
        user_id, username, display_name, avatar_url,
        round(fit::numeric, 4) as fit,
        shared_plays,
        shared_genres
      from scored
      where fit > 0.05
      order by fit desc, shared_plays desc
      limit lim
    ) t
  ), '[]'::jsonb);
end;
$fn$;
grant execute on function public.taste_matches(int) to authenticated;
