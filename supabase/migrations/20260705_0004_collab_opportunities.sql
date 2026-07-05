-- ===========================================================================
-- VYBZ Phase 2 (cont.) — opportunity-based matching (§7.4).
--
-- Makes "Band seeking guitarist" a first-class object. A creator posts a
-- collab_post with role_needed; every creator who OFFERS that role sees it in
-- my_opportunities(), ranked by genre/DAW overlap + locality + resonance.
-- Authors rank applicants with post_applicants(). Complements profile↔profile
-- collab_matches (§7.3) with explicit, intent-declared openings.
-- ===========================================================================

create table if not exists public.collab_posts (
  id          uuid primary key default gen_random_uuid(),
  author_id   uuid not null references public.profiles(id) on delete cascade,
  role_needed text not null references public.roles(id),
  title       text not null,
  body        text,
  genres      text[] not null default '{}',
  daws        text[] not null default '{}',
  remote_ok   boolean not null default true,
  location    text,
  commitment  text check (commitment in ('one-off','ongoing','session','band-member')),
  status      text not null default 'open' check (status in ('open','filled','closed')),
  created_at  timestamptz not null default now()
);
create index if not exists collab_posts_role_idx   on public.collab_posts(role_needed) where status = 'open';
create index if not exists collab_posts_author_idx  on public.collab_posts(author_id);

alter table public.collab_posts enable row level security;
do $$
begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collab_posts' and policyname='collab_posts read') then
    create policy "collab_posts read" on public.collab_posts for select using (true);
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collab_posts' and policyname='collab_posts write') then
    create policy "collab_posts write" on public.collab_posts for all
      using (author_id = auth.uid()) with check (author_id = auth.uid());
  end if;
end $$;

-- Applications (an audition clip attaches in Phase 5 via asset_id → assets).
create table if not exists public.collab_applications (
  post_id      uuid not null references public.collab_posts(id) on delete cascade,
  applicant_id uuid not null references public.profiles(id) on delete cascade,
  message      text,
  asset_id     uuid,                       -- FK to assets added in Phase 5
  created_at   timestamptz not null default now(),
  primary key (post_id, applicant_id)
);
create index if not exists collab_apps_post_idx on public.collab_applications(post_id);

alter table public.collab_applications enable row level security;
do $$
begin
  -- Applicants manage their own applications; authors can read them.
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collab_applications' and policyname='apps read') then
    create policy "apps read" on public.collab_applications for select
      using (applicant_id = auth.uid()
             or exists (select 1 from public.collab_posts p
                        where p.id = post_id and p.author_id = auth.uid()));
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collab_applications' and policyname='apps insert') then
    create policy "apps insert" on public.collab_applications for insert
      with check (applicant_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='collab_applications' and policyname='apps delete') then
    create policy "apps delete" on public.collab_applications for delete
      using (applicant_id = auth.uid());
  end if;
end $$;

-- ── my_opportunities: open posts whose role_needed ∈ my offered roles ────────
-- SECURITY DEFINER so it can read my private facets to rank fit, but emits only
-- public post fields + aggregate overlap. Ranked best-fit first.
create or replace function public.my_opportunities(p_limit int default 40)
returns table(
  id uuid,
  author_id uuid,
  author_alias text,
  author_username text,
  role_needed text,
  role_label text,
  title text,
  body text,
  genres text[],
  daws text[],
  remote_ok boolean,
  location text,
  commitment text,
  created_at timestamptz,
  shared_genres text[],
  shared_daws text[],
  applied boolean,
  fit numeric
)
language sql security definer set search_path = public stable as $fn$
  with me as (
    select coalesce(array(select jsonb_array_elements_text(profile->'genres')), '{}') as genres,
           coalesce(array(select jsonb_array_elements_text(profile->'daws')),   '{}') as daws,
           coalesce((profile->>'remoteOk')::boolean, false) as remote_ok,
           location
    from public.profiles where id = auth.uid()
  ),
  me_vec as (select embedding from public.profile_embeddings where user_id = auth.uid()),
  my_offers as (select role_id from public.creator_roles where user_id = auth.uid())
  select
    cp.id, cp.author_id, pr.alias, pr.username,
    cp.role_needed, r.label,
    cp.title, cp.body, cp.genres, cp.daws, cp.remote_ok, cp.location, cp.commitment, cp.created_at,
    array(select g from unnest(cp.genres) g intersect select unnest(me.genres)) as shared_genres,
    array(select d from unnest(cp.daws)   d intersect select unnest(me.daws))   as shared_daws,
    exists(select 1 from public.collab_applications a
           where a.post_id = cp.id and a.applicant_id = auth.uid()) as applied,
    round((least(1.0, (
        coalesce(array_length(array(select g from unnest(cp.genres) g intersect select unnest(me.genres)),1),0) * 1.4
      + coalesce(array_length(array(select d from unnest(cp.daws)   d intersect select unnest(me.daws)),1),0)   * 1.2
      + case when cp.remote_ok or me.remote_ok
              or (cp.location is not null and cp.location = me.location) then 0.8 else 0 end
      + coalesce((
          select greatest(0, 1 - (pe.embedding <=> (select embedding from me_vec)))
          from public.profile_embeddings pe
          where pe.user_id = cp.author_id and exists (select 1 from me_vec)
        ), 0) * 3.0
      + 2.0                               -- base: the role matches (always true here)
    ) / 8.0))::numeric, 3) as fit
  from public.collab_posts cp
  join public.profiles pr on pr.id = cp.author_id
  join public.roles r on r.id = cp.role_needed
  cross join me
  where cp.status = 'open'
    and cp.author_id <> auth.uid()
    and cp.role_needed in (select role_id from my_offers)
    and coalesce(pr.banned, false) = false
  order by fit desc, cp.created_at desc
  limit greatest(1, least(100, p_limit));
$fn$;
grant execute on function public.my_opportunities(int) to authenticated;

-- ── post_applicants: ranked candidates for a post I authored ─────────────────
create or replace function public.post_applicants(p_post uuid)
returns table(
  applicant_id uuid,
  alias text,
  username text,
  message text,
  created_at timestamptz,
  skill int,
  shared_genres text[],
  shared_daws text[],
  fit numeric
)
language sql security definer set search_path = public stable as $fn$
  with post as (
    select * from public.collab_posts where id = p_post and author_id = auth.uid()
  ),
  author_vec as (
    select embedding from public.profile_embeddings
    where user_id = (select author_id from post)
  )
  select
    a.applicant_id, pr.alias, pr.username, a.message, a.created_at,
    coalesce(cr.skill, 3)::int as skill,
    array(select g from unnest((select genres from post)) g
          intersect select jsonb_array_elements_text(pr.profile->'genres')) as shared_genres,
    array(select d from unnest((select daws from post)) d
          intersect select jsonb_array_elements_text(pr.profile->'daws'))   as shared_daws,
    round((least(1.0, (
        coalesce(cr.skill, 3) * 0.4
      + coalesce(array_length(array(select g from unnest((select genres from post)) g
                 intersect select jsonb_array_elements_text(pr.profile->'genres')),1),0) * 1.4
      + coalesce(array_length(array(select d from unnest((select daws from post)) d
                 intersect select jsonb_array_elements_text(pr.profile->'daws')),1),0) * 1.2
      + coalesce((
          select greatest(0, 1 - (pe.embedding <=> (select embedding from author_vec)))
          from public.profile_embeddings pe
          where pe.user_id = a.applicant_id and exists (select 1 from author_vec)
        ), 0) * 3.0
    ) / 8.0))::numeric, 3) as fit
  from public.collab_applications a
  join post on post.id = a.post_id
  join public.profiles pr on pr.id = a.applicant_id
  left join public.creator_roles cr
    on cr.user_id = a.applicant_id and cr.role_id = (select role_needed from post)
  where coalesce(pr.banned, false) = false
  order by fit desc, a.created_at asc;
$fn$;
grant execute on function public.post_applicants(uuid) to authenticated;
