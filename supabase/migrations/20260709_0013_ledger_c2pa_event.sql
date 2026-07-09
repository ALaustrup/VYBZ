-- VYBZ §8.7 — allow 'c2pa' (Content Credentials signed) events in the ledger.
set search_path = public, extensions;
alter table public.provenance_ledger drop constraint if exists provenance_ledger_event_type_check;
alter table public.provenance_ledger add constraint provenance_ledger_event_type_check
  check (event_type in ('mint','download','license','transfer','watermark','c2pa'));
