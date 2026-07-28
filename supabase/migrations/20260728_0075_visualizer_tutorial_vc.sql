-- One-shot 10 Vc for completing the VDock visualizer tutorial (bypasses daily social earn cap).
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
  skip_daily_cap boolean := false;
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
    when 'visualizer_tutorial' then 10.00
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

  if p_event in ('intent_mix', 'profile_complete', 'signup_grant', 'visualizer_tutorial') then
    key := 'earn:' || uid::text || ':' || p_event || ':' || coalesce(p_ref_id, 'once');
    skip_daily_cap := (p_event = 'visualizer_tutorial');
  end if;

  if exists (select 1 from public.vc_tx_ledger where idempotency_key = key) then
    return 0;
  end if;

  if not skip_daily_cap then
    select coalesce(sum(amount), 0) into earned_today
    from public.vc_tx_ledger
    where to_id = uid and kind = 'social_earn' and created_at::date = current_date;

    if earned_today >= cap then return 0; end if;
    if earned_today + amt > cap then amt := greatest(0, cap - earned_today); end if;
    if amt <= 0 then return 0; end if;
  end if;

  perform public._vc_apply(
    null, uid, amt, 'social_earn', p_ref_type, p_ref_id,
    'Earn · ' || p_event, key,
    jsonb_build_object('event', p_event)
  );
  return amt;
end;
$fn$;

grant execute on function public.vc_award(text, text, text, text) to authenticated;
