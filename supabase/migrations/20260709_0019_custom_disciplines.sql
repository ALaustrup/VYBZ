-- ===========================================================================
-- VYBZ — custom discipline requests + canonicalization (P6).
--
-- Lets creators ask for a discipline that isn't in the catalog yet. We keep the
-- matchmaking graph high-signal by CANONICALIZING free text against the existing
-- catalog via trigram similarity: a confident match maps straight to a real
-- discipline (so the module is usable immediately), otherwise the request is
-- stored as `pending` for lightweight curation into the taxonomy later.
-- ===========================================================================

set search_path = public, extensions;

create extension if not exists pg_trgm;

create table if not exists public.custom_discipline_requests (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  raw_label    text not null,
  mapped_role  text references public.roles(id),
  status       text not null default 'pending' check (status in ('pending','auto_mapped','promoted','rejected')),
  created_at   timestamptz not null default now()
);
create index if not exists custom_disc_status_idx on public.custom_discipline_requests(status);
alter table public.custom_discipline_requests enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='custom_discipline_requests' and policyname='custom disc own') then
    create policy "custom disc own" on public.custom_discipline_requests for select using (user_id = auth.uid());
  end if;
end $$;

-- Trigram index on discipline labels for fast fuzzy lookup.
create index if not exists roles_label_trgm on public.roles using gin (label gin_trgm_ops);

-- ── Fuzzy suggestions for the picker's search box ───────────────────────────
create or replace function public.suggest_disciplines(p_query text)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(x order by x->>'similarity' desc), '[]'::jsonb) from (
    select jsonb_build_object('id', r.id, 'label', r.label, 'category', r.category,
      'similarity', round(similarity(lower(r.label), lower(p_query))::numeric, 3)) as x
    from public.roles r
    where similarity(lower(r.label), lower(p_query)) > 0.15
    order by similarity(lower(r.label), lower(p_query)) desc
    limit 6
  ) s;
$fn$;
grant execute on function public.suggest_disciplines(text) to anon, authenticated;

-- ── Record a custom-discipline request; auto-map when confident ─────────────
create or replace function public.request_custom_discipline(p_label text)
returns jsonb language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v_label text := btrim(p_label);
  v_role text;
  v_sim numeric;
  v_status text;
begin
  if uid is null then raise exception 'auth required'; end if;
  if length(v_label) < 2 then raise exception 'label too short'; end if;

  select r.id, similarity(lower(r.label), lower(v_label))::numeric
    into v_role, v_sim
  from public.roles r
  order by similarity(lower(r.label), lower(v_label)) desc
  limit 1;

  if v_sim >= 0.45 then
    v_status := 'auto_mapped';
  else
    v_role := null; v_status := 'pending';
  end if;

  insert into public.custom_discipline_requests (user_id, raw_label, mapped_role, status)
  values (uid, v_label, v_role, v_status);

  return jsonb_build_object(
    'status', v_status,
    'mappedRoleId', v_role,
    'mappedLabel', (select label from public.roles where id = v_role));
end $fn$;
grant execute on function public.request_custom_discipline(text) to authenticated;
