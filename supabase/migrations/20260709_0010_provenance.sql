-- ===========================================================================
-- VYBZ §8.7 — provenance & tamper-evident ledger (the accepted, no-blockchain
-- design). A hash-chained, append-only audit ledger records every meaningful
-- event (asset mint, full-quality download, license grant); each row's hash
-- includes the previous row's hash, so any tampering breaks the chain and is
-- detectable via verify_ledger(). Assets also carry a cryptographic hash
-- (sha256) + a lightweight acoustic signature (fingerprint) captured at upload —
-- the "first seen on VYBZ" provenance record that helps copyright owners and
-- agencies in theft/misuse disputes. (Forensic per-recipient watermarking, C2PA
-- credentials, and optional public Merkle-root anchoring are the next steps.)
-- ===========================================================================

set search_path = public, extensions;
create extension if not exists pgcrypto with schema extensions;

create table if not exists public.provenance_ledger (
  seq        bigint generated always as identity primary key,
  event_type text not null check (event_type in ('mint','download','license','transfer')),
  asset_id   uuid references public.assets(id) on delete set null,
  actor_id   uuid references public.profiles(id) on delete set null,
  payload    jsonb not null default '{}'::jsonb,
  prev_hash  text not null,
  row_hash   text not null,
  created_at timestamptz not null default now()
);
create index if not exists provenance_asset_idx on public.provenance_ledger(asset_id);
alter table public.provenance_ledger enable row level security;
-- Deny-all to clients: individual rows can reveal who downloaded what. Access is
-- exclusively via the definer RPCs below (verify_ledger / asset_provenance),
-- which emit only integrity results + aggregates.

-- Append a hash-chained entry. row_hash = sha256(event|asset|actor|payload|prev).
create or replace function public.ledger_append(p_event text, p_asset uuid, p_actor uuid, p_payload jsonb)
returns void language plpgsql security definer set search_path = public, extensions as $fn$
declare prev text; body text; rh text;
begin
  select row_hash into prev from public.provenance_ledger order by seq desc limit 1;
  prev := coalesce(prev, repeat('0', 64));
  body := p_event || '|' || coalesce(p_asset::text, '') || '|' || coalesce(p_actor::text, '')
          || '|' || coalesce(p_payload::text, '{}') || '|' || prev;
  rh := encode(digest(body, 'sha256'), 'hex');
  insert into public.provenance_ledger (event_type, asset_id, actor_id, payload, prev_hash, row_hash)
  values (p_event, p_asset, p_actor, coalesce(p_payload, '{}'::jsonb), prev, rh);
end $fn$;

-- Record a 'mint' provenance event whenever an asset is created.
create or replace function public.on_asset_mint()
returns trigger language plpgsql security definer set search_path = public, extensions as $fn$
begin
  perform public.ledger_append('mint', new.id, new.owner_id, jsonb_build_object(
    'kind', new.kind, 'title', new.title, 'format', new.format,
    'sha256', new.sha256, 'fingerprint', new.fingerprint, 'license', new.license));
  return null;
end $fn$;
drop trigger if exists asset_mint_ledger on public.assets;
create trigger asset_mint_ledger after insert on public.assets
  for each row execute function public.on_asset_mint();

-- Download gate (§8) — now also appends a 'download' provenance event.
create or replace function public.request_asset_download(p_asset uuid)
returns text language plpgsql security definer set search_path = public, extensions as $fn$
declare uid uuid := auth.uid(); a public.assets%rowtype;
begin
  if uid is null then return null; end if;
  select * into a from public.assets where id = p_asset;
  if a.id is null or not a.downloadable then return null; end if;
  if a.kind in ('project','preset') and a.owner_id <> uid then return null; end if;
  insert into public.asset_downloads (asset_id, user_id, license) values (a.id, uid, a.license)
  on conflict (asset_id, user_id) do update set created_at = now(), license = excluded.license;
  perform public.ledger_append('download', a.id, uid, jsonb_build_object('license', a.license));
  return a.url;
end $fn$;
grant execute on function public.request_asset_download(uuid) to authenticated;

-- Recompute the whole chain and report integrity (safe: only counts + a break
-- point, never row contents).
create or replace function public.verify_ledger()
returns table(ok boolean, entries bigint, break_at bigint)
language plpgsql security definer set search_path = public, extensions as $fn$
declare r record; prev text := repeat('0', 64); body text; rh text; brk bigint := null; cnt bigint := 0;
begin
  for r in select * from public.provenance_ledger order by seq asc loop
    cnt := cnt + 1;
    body := r.event_type || '|' || coalesce(r.asset_id::text, '') || '|' || coalesce(r.actor_id::text, '')
            || '|' || coalesce(r.payload::text, '{}') || '|' || prev;
    rh := encode(digest(body, 'sha256'), 'hex');
    if rh <> r.row_hash or r.prev_hash <> prev then brk := r.seq; exit; end if;
    prev := r.row_hash;
  end loop;
  return query select (brk is null), cnt, brk;
end $fn$;
grant execute on function public.verify_ledger() to authenticated;

-- Public provenance summary for an asset (first-seen timestamp + download count).
create or replace function public.asset_provenance(p_asset uuid)
returns table(first_seen timestamptz, sha256 text, downloads bigint)
language sql security definer set search_path = public as $fn$
  select
    (select min(created_at) from public.provenance_ledger where asset_id = p_asset and event_type = 'mint'),
    (select a.sha256 from public.assets a where a.id = p_asset),
    (select count(*) from public.provenance_ledger where asset_id = p_asset and event_type = 'download');
$fn$;
grant execute on function public.asset_provenance(uuid) to anon, authenticated;
