-- ===========================================================================
-- VYBZ — Featured drop (Phase 3 uploads/Library dashboard)
--
-- Lets a creator pick which of their drops headlines their profile (instead of
-- "most recent"). Edit/delete of a creator's own drops already flows through RLS
-- (drops update/delete `author_id = auth.uid()`); this adds the one piece that
-- needs a guarded write: a definer RPC that verifies the drop is the caller's
-- own before featuring it.
-- ===========================================================================

set search_path = public, extensions;

alter table public.profiles
  add column if not exists featured_drop_id uuid references public.drops(id) on delete set null;

create or replace function public.set_featured_drop(p_drop uuid)
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_drop is null then
    update public.profiles set featured_drop_id = null where id = uid;
    return;
  end if;
  if not exists (select 1 from public.drops where id = p_drop and author_id = uid) then
    raise exception 'not your drop';
  end if;
  update public.profiles set featured_drop_id = p_drop where id = uid;
end $fn$;
grant execute on function public.set_featured_drop(uuid) to authenticated;
