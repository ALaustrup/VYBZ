-- ===========================================================================
-- Down: Sample Pack Storefront (0080)
-- Reverses 20260728_0080_storefront_packs.sql. Policy names match the UP file.
-- Storage buckets: drop objects in Dashboard first, then delete buckets manually
-- if required (CLI cannot always DROP buckets with residual objects).
-- ===========================================================================

set search_path = public, extensions;

-- Storage policies (storefront buckets)
drop policy if exists "storefront-zips owner delete" on storage.objects;
drop policy if exists "storefront-zips owner update" on storage.objects;
drop policy if exists "storefront-zips owner write" on storage.objects;
drop policy if exists "storefront-zips owner read" on storage.objects;
drop policy if exists "storefront-previews owner delete" on storage.objects;
drop policy if exists "storefront-previews owner update" on storage.objects;
drop policy if exists "storefront-previews owner write" on storage.objects;
drop policy if exists "storefront-previews public read" on storage.objects;

-- RPCs / view
drop function if exists public.storefront_my_pack(uuid);
drop function if exists public.storefront_pack_by_slug(text);
drop view if exists public.storefront_packs_public;

-- Table policies (exact names from UP)
drop policy if exists "storefront_orders producer read" on public.storefront_orders;
drop policy if exists "storefront_packs public read published" on public.storefront_packs;
drop policy if exists "storefront_packs owner all" on public.storefront_packs;

drop table if exists public.storefront_orders cascade;
drop table if exists public.storefront_packs cascade;

-- Optional: remove empty buckets (fails if objects remain — clear via Dashboard).
-- delete from storage.buckets where id in ('storefront-previews', 'storefront-zips');
