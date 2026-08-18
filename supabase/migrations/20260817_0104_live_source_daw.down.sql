-- Reverse 0104. Maps native daw rows back to display so the old CHECKs can return.

set search_path = public, extensions;

update public.live_sessions
  set source = 'display',
      input_mode = case when input_mode = 'daw' then 'display' else input_mode end,
      monetization = coalesce(monetization, '{}'::jsonb) || jsonb_build_object('ingest', 'daw')
where source = 'daw' or input_mode = 'daw';

alter table public.live_sessions drop constraint if exists live_sessions_source_check;
alter table public.live_sessions
  add constraint live_sessions_source_check
  check (source in ('camera', 'display', 'both'));

alter table public.live_sessions drop constraint if exists live_sessions_input_mode_check;
alter table public.live_sessions
  add constraint live_sessions_input_mode_check
  check (input_mode is null or input_mode in ('camera', 'display', 'both'));
