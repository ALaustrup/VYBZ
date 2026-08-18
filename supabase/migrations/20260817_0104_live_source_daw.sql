-- Live sessions may originate from a DAW master-bus plug-in.
-- Additive: widens source / input_mode CHECKs; backfills rows that stored
-- DAW ingest only as monetization.ingest because the old CHECK rejected 'daw'.

set search_path = public, extensions;

alter table public.live_sessions drop constraint if exists live_sessions_source_check;
alter table public.live_sessions
  add constraint live_sessions_source_check
  check (source in ('camera', 'display', 'both', 'daw'));

alter table public.live_sessions drop constraint if exists live_sessions_input_mode_check;
alter table public.live_sessions
  add constraint live_sessions_input_mode_check
  check (input_mode is null or input_mode in ('camera', 'display', 'both', 'daw'));

update public.live_sessions
  set source = 'daw',
      input_mode = 'daw'
where coalesce(monetization->>'ingest', '') = 'daw'
  and source <> 'daw';

comment on column public.live_sessions.source is
  'Capture path: camera, display, both, or daw (VYBZ Broadcast master-bus plug-in).';
