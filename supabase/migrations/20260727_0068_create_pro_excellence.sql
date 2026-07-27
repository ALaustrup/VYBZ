-- Phase 5 — Create & Pro excellence (exchange trust + opportunities inbox + create score).
-- Cosmetics never affect create ranking (L4). Soft Pro never hard-gates connection (L5).

set search_path = public, extensions;

-- ── Opportunity applications: poster can accept / reject ─────────────────────
alter table public.collab_applications
  add column if not exists status text not null default 'pending';

alter table public.collab_applications drop constraint if exists collab_applications_status_check;
alter table public.collab_applications
  add constraint collab_applications_status_check
  check (status in ('pending', 'accepted', 'rejected'));

drop policy if exists "apps update poster" on public.collab_applications;
create policy "apps update poster" on public.collab_applications for update
  using (
    exists (
      select 1 from public.collab_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.collab_posts p
      where p.id = post_id and p.author_id = auth.uid()
    )
  );

grant update on public.collab_applications to authenticated;

create or replace function public.respond_opportunity_application(
  p_post uuid,
  p_applicant uuid,
  p_accept boolean
) returns jsonb
language plpgsql security definer set search_path = public as $$
declare
  uid uuid := auth.uid();
  post public.collab_posts%rowtype;
  thread uuid;
begin
  if uid is null then raise exception 'not authenticated'; end if;
  select * into post from public.collab_posts where id = p_post;
  if post.id is null or post.author_id <> uid then
    raise exception 'not your post';
  end if;
  if not exists (
    select 1 from public.collab_applications a
    where a.post_id = p_post and a.applicant_id = p_applicant
  ) then
    raise exception 'application not found';
  end if;

  update public.collab_applications
    set status = case when p_accept then 'accepted' else 'rejected' end
    where post_id = p_post and applicant_id = p_applicant;

  if p_accept then
    thread := public.start_dm(p_applicant);
  end if;

  return jsonb_build_object(
    'status', case when p_accept then 'accepted' else 'rejected' end,
    'threadId', thread
  );
end;
$$;
grant execute on function public.respond_opportunity_application(uuid, uuid, boolean) to authenticated;

-- ── License-change events on the provenance ledger ───────────────────────────
create or replace function public.on_asset_license_change()
returns trigger
language plpgsql security definer set search_path = public, extensions as $$
begin
  if tg_op = 'UPDATE' and old.license is distinct from new.license then
    perform public.ledger_append(
      'license',
      new.id,
      coalesce(auth.uid(), new.owner_id),
      jsonb_build_object('from', old.license, 'to', new.license)
    );
  end if;
  return new;
end;
$$;

drop trigger if exists asset_license_ledger on public.assets;
create trigger asset_license_ledger
  after update of license on public.assets
  for each row execute function public.on_asset_license_change();

-- Richer public provenance summary (still no per-downloader PII).
drop function if exists public.asset_provenance(uuid);
create or replace function public.asset_provenance(p_asset uuid)
returns table (
  first_seen timestamptz,
  sha256 text,
  downloads bigint,
  watermarks bigint,
  license_events bigint
)
language sql security definer set search_path = public as $$
  select
    (select min(created_at) from public.provenance_ledger
      where asset_id = p_asset and event_type = 'mint'),
    (select a.sha256 from public.assets a where a.id = p_asset),
    (select count(*) from public.provenance_ledger
      where asset_id = p_asset and event_type = 'download'),
    (select count(*) from public.provenance_ledger
      where asset_id = p_asset and event_type = 'watermark'),
    (select count(*) from public.provenance_ledger
      where asset_id = p_asset and event_type = 'license');
$$;
grant execute on function public.asset_provenance(uuid) to anon, authenticated;

-- ── Social Score create axis: count Create actions (drops / ops / repos) ──────
create or replace function public.recompute_social_score(p_user_id uuid)
returns void
language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  v_interests text[];
  v_looking text[];
  v_meetup text[];
  v_genres text[];
  v_offers int;
  v_seeks int;
  v_events int;
  v_create_events int;
  v_interest_n real;
  v_rel_n real;
  v_create_n real;
  v_geo_n real;
  v_trust_n real;
  v_fresh_n real;
  v_taste_n real;
  v_conf real;
  v_matchable boolean;
  v_hints text[] := '{}';
  v_dims jsonb;
  v_age int;
  v_birth int;
begin
  select * into p from public.profiles where id = p_user_id;
  if not found then
    return;
  end if;

  v_interests := public.profile_jsonb_text_array(p.profile, 'interests');
  v_looking := public.profile_jsonb_text_array(p.profile, 'lookingFor');
  v_meetup := public.profile_jsonb_text_array(p.profile, 'meetupIntents');
  v_genres := public.profile_jsonb_text_array(p.profile, 'genres');

  select count(*)::int into v_offers from public.creator_roles where user_id = p_user_id;
  select count(*)::int into v_seeks from public.creator_seeks where user_id = p_user_id;
  select count(*)::int into v_events
  from public.social_score_events
  where user_id = p_user_id and created_at > now() - interval '30 days';
  select count(*)::int into v_create_events
  from public.social_score_events
  where user_id = p_user_id
    and created_at > now() - interval '90 days'
    and kind in ('drop_publish', 'opportunity_post', 'repo_commit');

  v_interest_n := least(1.0, cardinality(v_interests)::real / 5.0
    + cardinality(v_genres)::real / 10.0);

  v_rel_n := least(1.0,
    (case when cardinality(v_looking) > 0 then 0.45 else 0 end)
    + (case when cardinality(v_meetup) > 0 then 0.45 else 0 end)
    + (case when coalesce((p.profile->>'birthYear')::int, 0) between 1920 and 2012 then 0.1 else 0 end)
  );

  v_create_n := least(1.0, (v_offers + v_seeks)::real / 6.0
    + (case when coalesce((p.profile->>'openToWork')::boolean, false) then 0.15 else 0 end)
    + least(0.35, v_create_events::real / 8.0));

  v_geo_n := least(1.0,
    (case when p.lat is not null and p.lng is not null then 0.55 else 0 end)
    + (case when nullif(btrim(coalesce(p.location, '')), '') is not null then 0.35 else 0 end)
    + (case when coalesce((p.profile->>'remoteOk')::boolean, true) then 0.1 else 0 end)
  );

  v_trust_n := least(1.0,
    (case when p.avatar_url is not null then 0.45 else 0 end)
    + (case when p.username is not null then 0.25 else 0 end)
    + (case when nullif(btrim(coalesce(p.bio, '')), '') is not null then 0.2 else 0 end)
    + (case when coalesce((p.profile->>'shareAge')::boolean, false) then 0.05 else 0 end)
    + (case when coalesce((p.profile->>'shareSex')::boolean, false) then 0.05 else 0 end)
  );

  v_fresh_n := least(1.0, greatest(0.15,
    1.0 - extract(epoch from (now() - coalesce(p.created_at, now()))) / (86400.0 * 45.0)
  ));

  v_taste_n := least(1.0, v_events::real / 20.0);

  v_conf := least(1.0,
    0.2 * v_interest_n + 0.2 * v_rel_n + 0.15 * v_create_n
    + 0.15 * v_geo_n + 0.2 * v_trust_n + 0.05 * v_taste_n + 0.05 * v_fresh_n
  );

  v_matchable := public.profile_is_matchable(p);

  if cardinality(v_interests) > 0 then
    v_hints := v_hints || array['Into ' || array_to_string(v_interests[1:3], ', ')];
  end if;
  if cardinality(v_meetup) > 0 then
    v_hints := v_hints || array['Open to ' || array_to_string(v_meetup[1:2], ', ')];
  end if;
  if cardinality(v_looking) > 0 then
    v_hints := v_hints || array['Looking for ' || array_to_string(v_looking[1:2], ', ')];
  end if;
  if nullif(btrim(coalesce(p.location, '')), '') is not null then
    v_hints := v_hints || array['Near ' || btrim(p.location)];
  end if;
  if v_create_events > 0 then
    v_hints := v_hints || array['Active creator'];
  end if;

  v_birth := nullif(p.profile->>'birthYear', '')::int;
  if v_birth is not null and v_birth between 1920 and 2012 then
    v_age := extract(year from age(make_date(v_birth, 6, 15)))::int;
  end if;

  v_dims := jsonb_build_object(
    'interest', round(v_interest_n::numeric, 3),
    'relational', round(v_rel_n::numeric, 3),
    'create', round(v_create_n::numeric, 3),
    'geo', round(v_geo_n::numeric, 3),
    'trust', round(v_trust_n::numeric, 3),
    'taste', round(v_taste_n::numeric, 3),
    'freshness', round(v_fresh_n::numeric, 3),
    'age', v_age,
    'matchRadiusMiles', coalesce(nullif(p.profile->>'matchRadiusMiles', '')::int, 100),
    'cosmeticsExcluded', true
  );

  insert into public.social_scores as ss (user_id, dimensions, confidence, matchable, why_hints, updated_at)
  values (p_user_id, v_dims, v_conf, v_matchable, v_hints, now())
  on conflict (user_id) do update set
    dimensions = excluded.dimensions,
    confidence = excluded.confidence,
    matchable = excluded.matchable,
    why_hints = excluded.why_hints,
    updated_at = now();
end;
$$;
grant execute on function public.recompute_social_score(uuid) to authenticated;
