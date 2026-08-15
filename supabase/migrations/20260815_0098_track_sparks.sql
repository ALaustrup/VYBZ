-- Sparks — artist-authored prompts answered during playback.
--
-- The artist marks moments they are unsure about and picks a curated answer set
-- for each. A listener sees the prompt just after that moment and taps one
-- option. The artist gets counts they can act on.
--
-- Two tables:
--   track_sparks     the prompts, owned by whoever owns the drop
--   spark_responses  one row per (spark, listener) — inserted when the prompt is
--                    shown, updated when it is answered
--
-- Recording the showing separately is what makes "no response" a measurement
-- rather than an inference. A listener who let it burst is recorded as exactly
-- that; we never guess whether they were bored or absorbed.
--
-- No economy here. Airtime charging arrives once real supply and demand can be
-- observed; inventing the constants now is exactly the dishonesty this product
-- exists to oppose.

set search_path = public, extensions;

create table if not exists public.track_sparks (
  id uuid primary key default gen_random_uuid(),
  drop_id uuid not null references public.drops(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  position_sec numeric not null check (position_sec >= 1),
  option_set_id text not null,
  question text not null check (char_length(trim(question)) between 3 and 120),
  -- [{emoji,label,polarity}] x3, validated in place_track_spark.
  options jsonb not null,
  created_at timestamptz not null default now()
);

create index if not exists track_sparks_drop_idx
  on public.track_sparks (drop_id, position_sec);

create table if not exists public.spark_responses (
  spark_id uuid not null references public.track_sparks(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  -- Null means shown and allowed to burst. That is data, not absence of data.
  option_index smallint check (option_index between 0 and 2),
  shown_at timestamptz not null default now(),
  answered_at timestamptz,
  primary key (spark_id, user_id)
);

create index if not exists spark_responses_spark_idx
  on public.spark_responses (spark_id);

alter table public.track_sparks enable row level security;
alter table public.spark_responses enable row level security;

-- Prompts are readable by anyone who can already see the drop; the existing
-- audience rule is the single source of truth for that.
drop policy if exists "track_sparks readable with drop" on public.track_sparks;
create policy "track_sparks readable with drop" on public.track_sparks
  for select using (
    exists (
      select 1 from public.drops d
      where d.id = drop_id
        and public.can_view_drop(d.author_id, d.audience, d.id)
    )
  );

-- Only the owner writes prompts, and only through the RPC's validation.
drop policy if exists "track_sparks owner writes" on public.track_sparks;
create policy "track_sparks owner writes" on public.track_sparks
  for all using (owner_id = auth.uid()) with check (owner_id = auth.uid());

-- A listener sees only their own responses. Aggregates come from the report RPC,
-- so no one can read another person's individual answer.
drop policy if exists "spark_responses own" on public.spark_responses;
create policy "spark_responses own" on public.spark_responses
  for all using (user_id = auth.uid()) with check (user_id = auth.uid());

grant select on public.track_sparks to authenticated, anon;
grant select, insert, update on public.spark_responses to authenticated;

-- ── Place ──────────────────────────────────────────────────────────────────
create or replace function public.place_track_spark(
  p_drop uuid,
  p_position_sec numeric,
  p_option_set_id text,
  p_question text,
  p_options jsonb
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $fn$
declare
  uid uuid := auth.uid();
  owner uuid;
  existing int;
  too_close int;
  polarities text[];
  new_id uuid;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'reason', 'not_signed_in');
  end if;

  select author_id into owner from public.drops where id = p_drop;
  if owner is null then
    return jsonb_build_object('ok', false, 'reason', 'drop_not_found');
  end if;
  if owner <> uid then
    return jsonb_build_object('ok', false, 'reason', 'not_owner');
  end if;

  if p_position_sec is null or p_position_sec < 1 then
    return jsonb_build_object('ok', false, 'reason', 'out_of_range');
  end if;

  if jsonb_typeof(p_options) <> 'array' or jsonb_array_length(p_options) <> 3 then
    return jsonb_build_object('ok', false, 'reason', 'options_not_spanning');
  end if;

  select array_agg(distinct o->>'polarity') into polarities
    from jsonb_array_elements(p_options) o;

  -- Mirrors spansPolarity in sparkEngine.ts: a set that cannot return bad news
  -- is a compliment machine.
  if not ('positive' = any(polarities) and 'neutral' = any(polarities) and 'critical' = any(polarities)) then
    return jsonb_build_object('ok', false, 'reason', 'options_not_spanning');
  end if;

  select count(*) into existing from public.track_sparks where drop_id = p_drop;
  if existing >= 5 then
    return jsonb_build_object('ok', false, 'reason', 'too_many');
  end if;

  select count(*) into too_close
    from public.track_sparks
   where drop_id = p_drop
     and abs(position_sec - p_position_sec) < 20;
  if too_close > 0 then
    return jsonb_build_object('ok', false, 'reason', 'too_close');
  end if;

  insert into public.track_sparks (drop_id, owner_id, position_sec, option_set_id, question, options)
  values (p_drop, uid, p_position_sec, p_option_set_id, p_question, p_options)
  returning id into new_id;

  return jsonb_build_object('ok', true, 'id', new_id);
end
$fn$;

grant execute on function public.place_track_spark(uuid, numeric, text, text, jsonb) to authenticated;

-- ── Record showing / answering ─────────────────────────────────────────────
create or replace function public.mark_spark_shown(p_spark uuid)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null then return false; end if;
  insert into public.spark_responses (spark_id, user_id)
  values (p_spark, uid)
  on conflict (spark_id, user_id) do nothing;
  return true;
end
$fn$;

grant execute on function public.mark_spark_shown(uuid) to authenticated;

create or replace function public.answer_spark(p_spark uuid, p_option smallint)
returns boolean
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null or p_option is null or p_option < 0 or p_option > 2 then
    return false;
  end if;

  insert into public.spark_responses (spark_id, user_id, option_index, answered_at)
  values (p_spark, uid, p_option, now())
  on conflict (spark_id, user_id) do update
    -- First answer stands; a second tap must not overwrite a recorded reaction.
    set option_index = coalesce(public.spark_responses.option_index, excluded.option_index),
        answered_at  = coalesce(public.spark_responses.answered_at, excluded.answered_at);
  return true;
end
$fn$;

grant execute on function public.answer_spark(uuid, smallint) to authenticated;

-- ── Report (owner only) ────────────────────────────────────────────────────
-- Aggregates only. An owner learns what happened, never who did it.
create or replace function public.spark_report(p_drop uuid)
returns jsonb
language sql
stable
security definer
set search_path = public
as $fn$
  select coalesce((
    select jsonb_agg(row_to_json(x)::jsonb order by x."positionSec")
    from (
      select
        s.id                as "id",
        s.position_sec      as "positionSec",
        s.question          as "question",
        s.options           as "options",
        count(r.*) filter (where r.option_index = 0) as "count0",
        count(r.*) filter (where r.option_index = 1) as "count1",
        count(r.*) filter (where r.option_index = 2) as "count2",
        count(r.*) filter (where r.option_index is null) as "noResponse",
        count(r.*)          as "shown"
      from public.track_sparks s
      left join public.spark_responses r on r.spark_id = s.id
      where s.drop_id = p_drop
        and exists (select 1 from public.drops d where d.id = p_drop and d.author_id = auth.uid())
      group by s.id, s.position_sec, s.question, s.options
    ) x
  ), '[]'::jsonb);
$fn$;

grant execute on function public.spark_report(uuid) to authenticated;

comment on table public.track_sparks is
  'Artist-authored prompts shown just after a chosen moment during playback.';
comment on table public.spark_responses is
  'One row per (spark, listener). option_index null = shown and unanswered, which is measured, not inferred.';
