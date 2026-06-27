-- Push delivery wiring. Every in-app notification (already created by the
-- existing notify_on_reaction / notify_on_comment triggers) is fanned out to the
-- user's devices via the push-send Edge Function, using pg_net.
--
-- SAFETY: the whole delivery path is wrapped in an exception guard, so a missing
-- config, a pg_net hiccup, or a schema mismatch can NEVER break the underlying
-- notification insert (reactions/comments keep working regardless).
--
-- Before relying on this, set two rows in app_secrets:
--   insert into public.app_secrets(key,value) values
--     ('push_send_url',  'https://<ref>.functions.supabase.co/push-send'),
--     ('push_send_secret','<same value as the function PUSH_SEND_SECRET>')
--   on conflict (key) do update set value = excluded.value;

create extension if not exists pg_net with schema extensions;

create or replace function public.push_on_notification() returns trigger
language plpgsql security definer set search_path = public, extensions as $fn$
declare
  fn_url text;
  fn_secret text;
  cat text;
begin
  select value into fn_url from public.app_secrets where key = 'push_send_url';
  select value into fn_secret from public.app_secrets where key = 'push_send_secret';
  if fn_url is null or fn_secret is null then
    return NEW; -- push not configured yet; in-app notification still recorded
  end if;

  begin
    cat := case NEW.kind when 'message' then 'match' else 'vyb' end;
    perform net.http_post(
      url := fn_url,
      headers := jsonb_build_object(
        'Content-Type', 'application/json',
        'x-push-secret', fn_secret
      ),
      body := jsonb_build_object(
        'users', jsonb_build_array(NEW.user_id),
        'category', cat,
        'notification', jsonb_build_object(
          'title', coalesce(NEW.title, 'MYVYB'),
          'body', coalesce(NEW.body, ''),
          'url', '/notifications',
          'tag', coalesce(NEW.kind, 'myvyb')
        )
      )
    );
  exception when others then
    null; -- never let push delivery break the notification write
  end;

  return NEW;
end $fn$;

drop trigger if exists trg_push_on_notification on public.notifications;
create trigger trg_push_on_notification after insert on public.notifications
for each row execute function public.push_on_notification();
