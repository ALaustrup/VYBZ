-- ===========================================================================
-- VYBZ — Closing the Loop (Phase 1–3 schema)
--
-- 1) apply_role_intent_onboarding — maps Role+Intent onboarding into
--    profile_modules + creator_seeks (via sync_creator_graph) so collab_matches
--    v5 can score new creators immediately.
-- 2) respond_connection — accept/decline pending handshakes (reputation graph).
-- 3) match_feedback — telemetry for LTR / Spark + connection outcomes.
-- ===========================================================================

set search_path = public, extensions;

-- ── Match feedback (Spark pass/connect + connection accept/decline) ─────────
create table if not exists public.match_feedback (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid not null references public.profiles(id) on delete cascade,
  peer_id    uuid not null references public.profiles(id) on delete cascade,
  outcome    text not null check (outcome in ('accepted','declined','pass','connect')),
  source     text not null default 'spark'
             check (source in ('spark','connection','connect_page')),
  created_at timestamptz not null default now()
);
create index if not exists match_feedback_user_idx on public.match_feedback(user_id, created_at desc);
create index if not exists match_feedback_peer_idx on public.match_feedback(peer_id);
alter table public.match_feedback enable row level security;
do $$ begin
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='match_feedback' and policyname='match_feedback read own') then
    create policy "match_feedback read own" on public.match_feedback
      for select using (user_id = auth.uid());
  end if;
  if not exists (select 1 from pg_policies where schemaname='public' and tablename='match_feedback' and policyname='match_feedback insert own') then
    create policy "match_feedback insert own" on public.match_feedback
      for insert with check (user_id = auth.uid());
  end if;
end $$;
grant select, insert on public.match_feedback to authenticated;

create or replace function public.log_match_feedback(p_peer uuid, p_outcome text, p_source text default 'spark')
returns void language plpgsql security definer set search_path = public as $fn$
declare uid uuid := auth.uid();
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_peer is null or p_peer = uid then return; end if;
  if p_outcome not in ('accepted','declined','pass','connect') then
    raise exception 'invalid outcome';
  end if;
  if p_source not in ('spark','connection','connect_page') then
    p_source := 'spark';
  end if;
  insert into public.match_feedback (user_id, peer_id, outcome, source)
  values (uid, p_peer, p_outcome, p_source);
end $fn$;
grant execute on function public.log_match_feedback(uuid, text, text) to authenticated;

-- ── Connection handshake ────────────────────────────────────────────────────
create or replace function public.respond_connection(p_requester uuid, p_accept boolean)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  updated int;
begin
  if uid is null then raise exception 'auth required'; end if;
  if p_requester is null or p_requester = uid then return false; end if;

  update public.connections
     set status = case when p_accept then 'accepted' else 'declined' end
   where requester_id = p_requester
     and addressee_id = uid
     and status = 'pending';
  get diagnostics updated = row_count;
  if updated = 0 then return false; end if;

  insert into public.match_feedback (user_id, peer_id, outcome, source)
  values (uid, p_requester, case when p_accept then 'accepted' else 'declined' end, 'connection');

  if p_accept then
    insert into public.notifications (user_id, kind, actor_id, title, body, ref_id)
    values (p_requester, 'connection', uid,
            public.uname(uid) || ' accepted your connection', null, uid);
  end if;
  return true;
end $fn$;
grant execute on function public.respond_connection(uuid, boolean) to authenticated;

-- Map free-text onboarding intents → module seeking[] tags used by collab_matches.
create or replace function public._intents_to_seeking(p_intents text[])
returns text[] language plpgsql immutable as $fn$
declare
  out text[] := '{}';
  i text;
  lower_i text;
begin
  if p_intents is null then return array['collab']::text[]; end if;
  foreach i in array p_intents loop
    lower_i := lower(coalesce(i, ''));
    if lower_i ~ '(money|hire|paid|work|signed|job)' then
      out := array_append(out, 'paid');
    elsif lower_i ~ '(mentor|learn|teach)' then
      out := array_append(out, 'mentorship');
    elsif lower_i ~ '(cofound|startup|company|label)' then
      out := array_append(out, 'cofounding');
    elsif lower_i ~ '(explor|showcase|just)' then
      out := array_append(out, 'spark');
    else
      out := array_append(out, 'collab');
    end if;
  end loop;
  if cardinality(out) = 0 then out := array['collab']::text[]; end if;
  -- dedupe
  select coalesce(array_agg(distinct x), array['collab']::text[]) into out from unnest(out) x;
  return out;
end $fn$;

-- ── Onboarding → matchmaking graph ──────────────────────────────────────────
-- Called from RoleIntentOnboarding. Creates/updates a profile_module for the
-- chosen role, fills attrs.wants_roles from role_affinities (implicit seeks),
-- stores role/intents on profiles.profile, and syncs creator_roles/seeks.
create or replace function public.apply_role_intent_onboarding(
  p_role_id text,
  p_role_label text,
  p_intents text[]
)
returns uuid language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  v_id uuid;
  v_cat text;
  v_seeking text[];
  v_wants jsonb := '[]'::jsonb;
  v_label text := nullif(trim(coalesce(p_role_label, '')), '');
  v_role text := nullif(trim(coalesce(p_role_id, '')), '');
begin
  if uid is null then raise exception 'auth required'; end if;

  v_seeking := public._intents_to_seeking(p_intents);

  -- Persist role + intents on the profile jsonb (UX source of truth).
  update public.profiles
     set profile = coalesce(profile, '{}'::jsonb)
                   || jsonb_build_object(
                        'role', v_role,
                        'roleLabel', coalesce(v_label, v_role),
                        'intents', to_jsonb(coalesce(p_intents, '{}'::text[]))
                      ),
         last_active_at = now()
   where id = uid;

  -- No catalog role yet (pending custom) — intents alone are enough for feed/embed.
  if v_role is null or not exists (select 1 from public.roles where id = v_role) then
    return null;
  end if;

  select category into v_cat from public.roles where id = v_role;

  -- Implicit seeks: strongest complementary roles from the affinity graph.
  select coalesce(jsonb_agg(to_role order by weight desc), '[]'::jsonb)
    into v_wants
    from (
      select to_role, weight
        from public.role_affinities
       where from_role = v_role
       order by weight desc
       limit 6
    ) a;

  select id into v_id from public.profile_modules
   where user_id = uid and role_id = v_role and archived_at is null;

  if v_id is null then
    insert into public.profile_modules
      (user_id, role_id, category, headline, seeking, skill, attrs, sort)
    values (
      uid, v_role, v_cat,
      coalesce(v_label, (select label from public.roles where id = v_role)),
      v_seeking, 3,
      jsonb_build_object('wants_roles', v_wants, 'onboarding', true),
      coalesce((select max(sort) + 1 from public.profile_modules where user_id = uid and archived_at is null), 0)
    )
    returning id into v_id;
  else
    update public.profile_modules set
      headline = coalesce(v_label, headline),
      seeking = v_seeking,
      skill = coalesce(skill, 3),
      attrs = coalesce(attrs, '{}'::jsonb)
              || jsonb_build_object('wants_roles', v_wants, 'onboarding', true),
      archived_at = null,
      updated_at = now()
    where id = v_id;
  end if;

  perform public.sync_creator_graph(uid);
  return v_id;
end $fn$;
grant execute on function public.apply_role_intent_onboarding(text, text, text[]) to authenticated;

-- Backfill: creators who already have profile.role but no active module.
insert into public.profile_modules (user_id, role_id, category, headline, seeking, skill, attrs, sort)
select
  p.id,
  p.profile->>'role',
  rr.category,
  coalesce(nullif(p.profile->>'roleLabel',''), rr.label),
  public._intents_to_seeking(coalesce(
    (select array_agg(x) from jsonb_array_elements_text(coalesce(p.profile->'intents','[]'::jsonb)) x),
    '{}'::text[]
  )),
  3,
  jsonb_build_object(
    'wants_roles', coalesce((
      select jsonb_agg(sub.to_role order by sub.weight desc)
        from (
          select ra.to_role, ra.weight
            from public.role_affinities ra
           where ra.from_role = p.profile->>'role'
           order by ra.weight desc
           limit 6
        ) sub
    ), '[]'::jsonb),
    'onboarding', true
  ),
  0
from public.profiles p
join public.roles rr on rr.id = p.profile->>'role'
where nullif(p.profile->>'role','') is not null
  and not exists (
    select 1 from public.profile_modules m
     where m.user_id = p.id and m.role_id = p.profile->>'role' and m.archived_at is null
  );

-- Rebuild match graphs for anyone we just modularized.
do $$
declare r record;
begin
  for r in
    select distinct m.user_id
      from public.profile_modules m
     where m.attrs->>'onboarding' = 'true'
       and m.archived_at is null
  loop
    perform public.sync_creator_graph(r.user_id);
  end loop;
end $$;

-- Feed posts include author avatars for identity-rich cards.
create or replace function public.feed_posts(p_scope text default 'all', p_limit int default 40)
returns jsonb language sql stable security definer set search_path = public as $fn$
  select coalesce(jsonb_agg(q.obj order by q.created_at desc), '[]'::jsonb)
  from (
    select jsonb_build_object(
      'id', pp.id, 'kind', pp.kind, 'title', pp.title, 'body', pp.body,
      'mediaUrl', pp.media_url, 'linkUrl', pp.link_url, 'createdAt', pp.created_at,
      'projectId', pr.id, 'projectName', pr.name, 'projectKind', pr.kind, 'accent', pr.accent,
      'authorId', pr.user_id, 'authorUsername', prof.username,
      'authorAvatarUrl', prof.avatar_url,
      'likes', (select count(*) from public.project_post_likes k where k.post_id = pp.id),
      'liked', exists (select 1 from public.project_post_likes k where k.post_id = pp.id and k.user_id = auth.uid())
    ) as obj, pp.created_at
    from public.project_posts pp
    join public.profile_projects pr on pr.id = pp.project_id and pr.archived_at is null
    join public.profiles prof on prof.id = pr.user_id
    where coalesce(prof.banned, false) = false
      and case
        when p_scope = 'following' then exists (select 1 from public.project_follows f where f.project_id = pr.id and f.user_id = auth.uid())
        when p_scope = 'music'   then pp.kind = 'audio' or pr.kind = 'music'
        when p_scope = 'art'     then pp.kind = 'image' or pr.kind = 'art'
        when p_scope = 'video'   then pp.kind = 'video' or pr.kind = 'video'
        when p_scope = 'writing' then pr.kind = 'writing' or pp.kind = 'text'
        else true
      end
    order by pp.created_at desc
    limit greatest(1, least(100, p_limit))
  ) q;
$fn$;
grant execute on function public.feed_posts(text, int) to anon, authenticated;
