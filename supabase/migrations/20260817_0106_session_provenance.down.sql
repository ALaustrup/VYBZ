-- Reverse 0106. Restores the pre-human_session ledger CHECK. Does not drop older provenance_ledger rows.

set search_path = public, extensions;

drop function if exists public.seal_provenance_session(uuid);
drop function if exists public.append_provenance_event(uuid, text, jsonb, uuid);
drop function if exists public.open_provenance_session(uuid);
drop function if exists public._provenance_append(uuid, text, jsonb, uuid);

drop table if exists public.provenance_events;
drop table if exists public.provenance_sessions;

alter table public.provenance_ledger drop constraint if exists provenance_ledger_event_type_check;
alter table public.provenance_ledger
  add constraint provenance_ledger_event_type_check
  check (event_type in ('mint', 'download', 'license', 'transfer', 'watermark', 'c2pa'));
