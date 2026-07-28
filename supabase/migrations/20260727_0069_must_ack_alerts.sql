-- Phase: must-ack alerts + stale connection expiry (3 days) + video message payload.

-- Video / voice DMs carry must_ack so Living Home won't soft-dismiss them.
create or replace function public.notify_message()
returns trigger language plpgsql security definer set search_path = public as $fn$
declare a uuid; b uuid; recipient uuid; preview text; must_ack boolean; title text;
begin
  if coalesce(new.deleted_for_all, false) then return null; end if;
  select user_a, user_b into a, b from public.dm_threads where id = new.thread_id;
  recipient := case when new.sender_id = a then b else a end;
  if recipient is null then return null; end if;
  if public.is_blocked_either(recipient, new.sender_id) then return null; end if;
  must_ack := new.kind in ('video', 'voice');
  preview := left(coalesce(
    nullif(btrim(coalesce(new.body, '')), ''),
    case new.kind when 'voice' then 'Voice message' when 'video' then 'Video message' else 'New message' end
  ), 80);
  title := case new.kind
    when 'video' then public.uname(new.sender_id) || ' left you a video message.'
    when 'voice' then public.uname(new.sender_id) || ' left you a voice message.'
    else public.uname(new.sender_id) || ' sent you a direct message.'
  end;
  insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
  values (
    recipient, 'message', new.sender_id,
    title, preview, new.thread_id,
    jsonb_build_object(
      'action', 'open_dm',
      'threadId', new.thread_id,
      'messageId', new.id,
      'mediaKind', new.kind,
      'mustAck', must_ack
    )
  );
  return null;
end $fn$;

-- Soft-read skips must-ack items (connection requests + video/voice DMs).
create or replace function public.mark_notifications_read()
returns void language plpgsql security definer set search_path = public as $fn$
begin
  if auth.uid() is null then return; end if;
  update public.notifications
  set read = true
  where user_id = auth.uid()
    and read = false
    and coalesce((payload->>'mustAck')::boolean, false) = false
    and not (
      kind = 'connection'
      and title ilike '%wants to connect%'
    );
end $fn$;

-- Expire pending connection requests older than 3 days; nudge the sender.
create or replace function public.expire_stale_connection_requests()
returns integer language plpgsql security definer set search_path = public as $fn$
declare
  r record;
  n int := 0;
  peer_name text;
begin
  for r in
    select c.requester_id, c.addressee_id, c.created_at
    from public.connections c
    where c.status = 'pending'
      and c.created_at < now() - interval '3 days'
  loop
    peer_name := public.uname(r.addressee_id);
    delete from public.connections
    where requester_id = r.requester_id and addressee_id = r.addressee_id;

    -- Clear the addressee's lingering request notification
    delete from public.notifications
    where user_id = r.addressee_id
      and kind = 'connection'
      and actor_id = r.requester_id
      and title ilike '%wants to connect%';

    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
    values (
      r.requester_id,
      'connection',
      r.addressee_id,
      'Your connect request to @' || coalesce(peer_name, 'them') || ' expired',
      'No worries — send another with a quick hello. Hey, I sent a friend request — if you accept we can both enjoy the VYBZ together!',
      r.addressee_id,
      jsonb_build_object(
        'action', 'reconnect',
        'peerId', r.addressee_id,
        'mustAck', true,
        'nudgeBody', 'Hey, I sent a friend request — if you accept we can both enjoy the VYBZ together!'
      )
    );
    n := n + 1;
  end loop;
  return n;
end $fn$;

grant execute on function public.expire_stale_connection_requests() to authenticated;

-- Tag incoming connection notifications as must-ack.
create or replace function public.notify_connection()
returns trigger language plpgsql security definer set search_path = public as $fn$
begin
  if new.status = 'pending' then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id, payload)
    values (
      new.addressee_id, 'connection', new.requester_id,
      public.uname(new.requester_id) || ' wants to connect',
      null, new.requester_id,
      jsonb_build_object('mustAck', true, 'action', 'respond_connection')
    );
  end if;
  return null;
end $fn$;
