-- ===========================================================================
-- Hardening: pin search_path on all application functions.
--
-- SECURITY DEFINER (and even plain) functions without a fixed search_path are
-- vulnerable to search_path injection. This pins `search_path = public` on every
-- function we own in the public schema, WITHOUT rewriting their bodies (a pure
-- ALTER, so behaviour is unchanged). Extension-owned functions (pgvector's
-- vector/halfvec/sparsevec families) are deliberately skipped — they belong to
-- the extension and are maintained by it.
--
-- Also tightens the public `media-public` bucket so anonymous clients can no
-- longer enumerate/list it via the storage API. Public CDN URLs (getPublicUrl)
-- bypass RLS, so avatars/banners still render for everyone.
-- ===========================================================================

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prokind = 'f'
      and not exists (
        select 1 from unnest(coalesce(p.proconfig, '{}')) c where c like 'search_path=%'
      )
      and not exists (
        select 1 from pg_depend d where d.objid = p.oid and d.deptype = 'e'
      )
  loop
    execute format('alter function %s set search_path = public', r.sig);
  end loop;
end $$;

drop policy if exists "media-public read" on storage.objects;
create policy "media-public read"
  on storage.objects for select to authenticated
  using (bucket_id = 'media-public');
