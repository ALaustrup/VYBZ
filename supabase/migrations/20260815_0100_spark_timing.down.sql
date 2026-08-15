-- Restore the 20-second spark spacing.
--
-- Only do this alongside reverting SPARK_WINDOW_SEC in sparkEngine.ts. With an
-- 18-second window and 20-second spacing, one prompt's window opens while the
-- previous one is still live.

set search_path = public, extensions;

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
