-- ===========================================================================
-- VYBZ — Commissions board (Phase O3): paid work requests, reusing the
-- opportunity board (collab_posts). The demand side opened by Role Class (O1/O2)
-- — brands, bookers, patrons — can now post PAID commissions ("need a logo
-- animation", "scoring a short film", "commission a track"); creators browse
-- and apply with the existing collab_applications flow.
--
-- Additive & reversible (§9): two columns on collab_posts. `kind` separates
-- collab (role-seeking) from commission (paid work); `budget` is a short,
-- human-readable range (e.g. "$300 fixed", "$50/hr", "$500–$1,000"). Money
-- movement (escrow / Stripe Connect) is Phase O3b, gated on Stripe keys.
-- ===========================================================================

set search_path = public, extensions;

alter table public.collab_posts
  add column if not exists kind   text not null default 'collab',
  add column if not exists budget text;

do $$ begin
  if not exists (select 1 from pg_constraint where conname = 'collab_posts_kind_chk') then
    alter table public.collab_posts
      add constraint collab_posts_kind_chk check (kind in ('collab','commission'));
  end if;
end $$;

create index if not exists collab_posts_kind_idx on public.collab_posts(kind) where status = 'open';
