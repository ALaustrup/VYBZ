-- ===========================================================================
-- VYBZ — Phase J affiliates + Pro soft entitlement; Phase H swarm manifest RPC
-- ===========================================================================

set search_path = public, extensions;

-- ── Affiliate gear links (display-only; never touch match scores) ────────────
create table if not exists public.affiliate_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  label text not null check (char_length(trim(label)) between 1 and 80),
  url text not null check (char_length(trim(url)) between 8 and 2000),
  merchant text check (merchant is null or char_length(merchant) <= 80),
  disclosed boolean not null default true,
  sort int not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists affiliate_links_user_idx on public.affiliate_links (user_id, sort);

alter table public.affiliate_links enable row level security;

drop policy if exists "affiliate read public" on public.affiliate_links;
create policy "affiliate read public" on public.affiliate_links
  for select using (true);

drop policy if exists "affiliate owner write" on public.affiliate_links;
create policy "affiliate owner write" on public.affiliate_links
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

grant select on public.affiliate_links to anon, authenticated;
grant insert, update, delete on public.affiliate_links to authenticated;

-- Pro soft entitlement lives in profiles.profile jsonb keys:
--   "pro": true | "proUntil": ISO timestamp
-- No schema column required; admin/Payment Link can set via profile update later.

-- ── Swarm: permission-gated manifest for P2P chunk transfer ─────────────────
create or replace function public.swarm_asset_manifest(p_asset uuid)
returns table(
  asset_id uuid,
  chunk_size int,
  chunk_hashes text[],
  cipher_algo text,
  content_key_envelope jsonb,
  byte_size bigint
)
language plpgsql security definer set search_path = public stable as $fn$
declare
  uid uuid := auth.uid();
  a public.assets%rowtype;
begin
  if uid is null then return; end if;
  select * into a from public.assets where id = p_asset;
  if a.id is null or not a.downloadable then return; end if;
  if a.kind in ('project','preset') and a.owner_id <> uid then return; end if;
  if a.chunk_hashes is null or cardinality(a.chunk_hashes) = 0 then return; end if;

  return query
  select a.id, a.chunk_size, a.chunk_hashes, a.cipher_algo, a.content_key_envelope,
         coalesce(a.size_bytes, 0)::bigint;
end;
$fn$;

grant execute on function public.swarm_asset_manifest(uuid) to authenticated;
