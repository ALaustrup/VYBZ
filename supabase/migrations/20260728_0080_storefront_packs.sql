-- ===========================================================================
-- Sample Pack Storefront Generator — namespaced storefront_* tables + buckets.
-- Isolated micro-product; reuses creator_payouts Express Connect for payouts.
-- Orders / zip fulfillment are Edge (service role) only.
-- ===========================================================================

set search_path = public, extensions;

-- ── Packs ───────────────────────────────────────────────────────────────────

create table if not exists public.storefront_packs (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references public.profiles(id) on delete cascade,
  title         text not null default '',
  slug          text not null,
  description   text not null default '',
  features      text[] not null default '{}',
  genre         text not null default '',
  price_cents   int not null default 999 check (price_cents >= 100 and price_cents <= 500000),
  currency      text not null default 'usd',
  preview_path  text,
  zip_path      text,
  cover_path    text,
  status        text not null default 'draft' check (status in ('draft', 'published')),
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  unique (user_id, slug)
);

create index if not exists storefront_packs_user_idx on public.storefront_packs (user_id, created_at desc);
create index if not exists storefront_packs_slug_idx on public.storefront_packs (slug) where status = 'published';

alter table public.storefront_packs enable row level security;

drop policy if exists "storefront_packs owner all" on public.storefront_packs;
create policy "storefront_packs owner all"
  on public.storefront_packs
  for all
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- Public / signed-in fans can read published packs; zip_path revoked from anon below.
drop policy if exists "storefront_packs public read published" on public.storefront_packs;
create policy "storefront_packs public read published"
  on public.storefront_packs
  for select
  to anon, authenticated
  using (status = 'published' or user_id = auth.uid());

grant select (
  id, user_id, title, slug, description, features, genre,
  price_cents, currency, preview_path, cover_path, status, created_at, updated_at
) on public.storefront_packs to anon;

-- Authenticated: same public columns + write zip_path/cover/preview; zip_path not selectable
-- via PostgREST (owners use storefront_my_pack RPC).
grant select (
  id, user_id, title, slug, description, features, genre,
  price_cents, currency, preview_path, cover_path, status, created_at, updated_at
) on public.storefront_packs to authenticated;

grant insert (
  id, user_id, title, slug, description, features, genre,
  price_cents, currency, preview_path, zip_path, cover_path, status, created_at, updated_at
) on public.storefront_packs to authenticated;

grant update (
  title, slug, description, features, genre,
  price_cents, currency, preview_path, zip_path, cover_path, status, updated_at
) on public.storefront_packs to authenticated;

grant delete on public.storefront_packs to authenticated;

-- Public storefront view — never exposes zip_path (defense in depth).
create or replace view public.storefront_packs_public
with (security_invoker = true)
as
select
  id, user_id, title, slug, description, features, genre,
  price_cents, currency, preview_path, cover_path, created_at, updated_at
from public.storefront_packs
where status = 'published';

grant select on public.storefront_packs_public to anon, authenticated;

-- Published pack lookup by slug (safe columns only; works for anon).
create or replace function public.storefront_pack_by_slug(p_slug text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  r public.storefront_packs%rowtype;
begin
  select * into r
  from public.storefront_packs
  where slug = p_slug and status = 'published'
  limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'title', r.title,
    'slug', r.slug,
    'description', r.description,
    'features', to_jsonb(r.features),
    'genre', r.genre,
    'price_cents', r.price_cents,
    'currency', r.currency,
    'preview_path', r.preview_path,
    'cover_path', r.cover_path,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  );
end;
$fn$;
grant execute on function public.storefront_pack_by_slug(text) to anon, authenticated;

-- Owner pack fetch including zip_path (not granted on table SELECT).
create or replace function public.storefront_my_pack(p_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $fn$
declare
  r public.storefront_packs%rowtype;
begin
  if auth.uid() is null then
    return null;
  end if;
  select * into r
  from public.storefront_packs
  where id = p_id and user_id = auth.uid()
  limit 1;
  if not found then
    return null;
  end if;
  return jsonb_build_object(
    'id', r.id,
    'user_id', r.user_id,
    'title', r.title,
    'slug', r.slug,
    'description', r.description,
    'features', to_jsonb(r.features),
    'genre', r.genre,
    'price_cents', r.price_cents,
    'currency', r.currency,
    'preview_path', r.preview_path,
    'zip_path', r.zip_path,
    'cover_path', r.cover_path,
    'status', r.status,
    'created_at', r.created_at,
    'updated_at', r.updated_at
  );
end;
$fn$;
grant execute on function public.storefront_my_pack(uuid) to authenticated;

-- ── Orders ──────────────────────────────────────────────────────────────────

create table if not exists public.storefront_orders (
  id                     uuid primary key default gen_random_uuid(),
  pack_id                uuid not null references public.storefront_packs(id) on delete restrict,
  buyer_email            text not null,
  buyer_user_id          uuid references public.profiles(id) on delete set null,
  amount_cents           int not null check (amount_cents > 0),
  application_fee_cents  int not null default 0 check (application_fee_cents >= 0),
  stripe_session_id      text unique,
  stripe_payment_intent  text,
  status                 text not null default 'pending' check (status in ('pending', 'paid', 'failed')),
  fulfilled_at           timestamptz,
  created_at             timestamptz not null default now()
);

create index if not exists storefront_orders_pack_idx on public.storefront_orders (pack_id, created_at desc);
create index if not exists storefront_orders_status_idx on public.storefront_orders (status);

alter table public.storefront_orders enable row level security;

-- Producers read orders for their packs; all writes via service role (Edge).
drop policy if exists "storefront_orders producer read" on public.storefront_orders;
create policy "storefront_orders producer read"
  on public.storefront_orders
  for select
  to authenticated
  using (
    exists (
      select 1 from public.storefront_packs p
      where p.id = pack_id and p.user_id = auth.uid()
    )
  );

grant select on public.storefront_orders to authenticated;

-- ── Storage buckets ─────────────────────────────────────────────────────────

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'storefront-previews',
  'storefront-previews',
  true,
  52428800,
  array[
    'audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/wave',
    'audio/mp4', 'audio/aac', 'audio/ogg',
    'image/png', 'image/jpeg', 'image/webp', 'image/svg+xml'
  ]
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'storefront-zips',
  'storefront-zips',
  false,
  524288000,
  array['application/zip', 'application/x-zip-compressed', 'application/octet-stream']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Previews: public read; owners write under {uid}/…
drop policy if exists "storefront-previews public read" on storage.objects;
create policy "storefront-previews public read"
  on storage.objects for select to public
  using (bucket_id = 'storefront-previews');

drop policy if exists "storefront-previews owner write" on storage.objects;
create policy "storefront-previews owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storefront-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storefront-previews owner update" on storage.objects;
create policy "storefront-previews owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'storefront-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storefront-previews owner delete" on storage.objects;
create policy "storefront-previews owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storefront-previews'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- Zips: private; owners manage own folder; signed URLs via service role for buyers.
drop policy if exists "storefront-zips owner read" on storage.objects;
create policy "storefront-zips owner read"
  on storage.objects for select to authenticated
  using (
    bucket_id = 'storefront-zips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storefront-zips owner write" on storage.objects;
create policy "storefront-zips owner write"
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'storefront-zips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storefront-zips owner update" on storage.objects;
create policy "storefront-zips owner update"
  on storage.objects for update to authenticated
  using (
    bucket_id = 'storefront-zips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists "storefront-zips owner delete" on storage.objects;
create policy "storefront-zips owner delete"
  on storage.objects for delete to authenticated
  using (
    bucket_id = 'storefront-zips'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
