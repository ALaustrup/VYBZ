-- Work / session association for Validate Humanity.
-- Additive RPCs only. Does not rewrite provenance_events.
-- The SHA bind stays measured; the Work/Project link stays declared.
-- Does not prove the work was not AI-generated.

set search_path = public, extensions;

create or replace function public.associate_session_work(
  p_live uuid,
  p_asset uuid default null,
  p_project uuid default null
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $fn$
declare
  uid uuid := auth.uid();
  rec public.provenance_sessions;
  sha text;
  c2pa_n int;
  patch jsonb := '{}'::jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  if p_asset is null and p_project is null then
    return jsonb_build_object('ok', false, 'error', 'nothing_to_associate');
  end if;

  select * into rec from public.provenance_sessions where live_session_id = p_live;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  if rec.status <> 'sealed' then
    return jsonb_build_object('ok', false, 'error', 'not_sealed');
  end if;

  if p_asset is not null then
    select lower(a.sha256) into sha
    from public.assets a
    where a.id = p_asset and a.owner_id = uid;
    if not found then
      return jsonb_build_object('ok', false, 'error', 'asset_not_found');
    end if;
    if sha is null or sha !~ '^[a-f0-9]{64}$' then
      return jsonb_build_object('ok', false, 'error', 'no_sha');
    end if;
    select count(*)::int into c2pa_n
    from public.provenance_ledger
    where asset_id = p_asset and event_type = 'c2pa';
    patch := patch || jsonb_build_object(
      'audio_sha', sha,
      'audio_sha_kind', 'measured',
      'audio_asset_id', p_asset,
      'audio_link', 'declared',
      'c2pa_ledger_events', c2pa_n,
      'c2pa_on_file', 'Not measured',
      'work_link', 'declared',
      'stored_bound_at', now()
    );
  end if;

  if p_project is not null then
    if not exists (
      select 1 from public.profile_projects p
      where p.id = p_project and p.user_id = uid and p.archived_at is null
    ) then
      return jsonb_build_object('ok', false, 'error', 'project_not_found');
    end if;
    patch := patch || jsonb_build_object(
      'profile_project_id', p_project,
      'project_link', 'declared'
    );
  end if;

  update public.provenance_sessions
    set manifest = coalesce(manifest, '{}'::jsonb) || patch
  where id = rec.id;

  return jsonb_build_object('ok', true) || patch;
end
$fn$;

create or replace function public.creation_session_links(p_host uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $fn$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    return '[]'::jsonb;
  end if;

  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'liveSessionId', ps.live_session_id,
      'assetId', nullif(ps.manifest ->> 'audio_asset_id', ''),
      'projectId', nullif(ps.manifest ->> 'profile_project_id', ''),
      'strength', ps.strength,
      'sealedAt', ps.sealed_at,
      'atcBurned', ps.atc_burned
    ) order by ps.sealed_at desc)
    from public.provenance_sessions ps
    join public.live_sessions s on s.id = ps.live_session_id
    where ps.host_id = p_host
      and ps.status = 'sealed'
      and (
        uid = p_host
        or coalesce(s.visibility, 'world') in ('world', 'public')
      )
  ), '[]'::jsonb);
end
$fn$;

grant execute on function public.associate_session_work(uuid, uuid, uuid) to authenticated;
grant execute on function public.creation_session_links(uuid) to authenticated;
revoke all on function public.associate_session_work(uuid, uuid, uuid) from anon, public;
revoke all on function public.creation_session_links(uuid) from anon, public;

comment on function public.associate_session_work(uuid, uuid, uuid) is
  'Host declares a Work (stored asset) and/or Project as associated with a sealed live. SHA measured; link declared.';
comment on function public.creation_session_links(uuid) is
  'Sealed session-to-work links for a host. No event payloads. Circle lives hidden from others.';
