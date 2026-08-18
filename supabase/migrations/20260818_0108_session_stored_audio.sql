-- Bind a host-owned stored asset SHA to a sealed session provenance row.
-- The SHA is measured from assets.sha256. The "this file is the mix" link is declared.
-- C2PA is a ledger event count, not a parse of the file. Worker is not invoked.
-- Does not change ATC formulas, LiveKit, or the sealed event chain.

set search_path = public, extensions;

create or replace function public.bind_session_stored_audio(p_live uuid, p_asset uuid)
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
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;

  select * into rec from public.provenance_sessions where live_session_id = p_live;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;

  select lower(a.sha256) into sha
  from public.assets a
  where a.id = p_asset and a.owner_id = uid;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'asset_not_found');
  end if;
  if sha is null or sha !~ '^[a-f0-9]{64}$' then
    return jsonb_build_object('ok', false, 'error', 'no_sha', 'audio_sha_kind', null);
  end if;

  select count(*)::int into c2pa_n
  from public.provenance_ledger
  where asset_id = p_asset and event_type = 'c2pa';

  update public.provenance_sessions
    set manifest = coalesce(manifest, '{}'::jsonb) || jsonb_build_object(
      'audio_sha', sha,
      'audio_sha_kind', 'measured',
      'audio_asset_id', p_asset,
      'audio_link', 'declared',
      'c2pa_ledger_events', c2pa_n,
      'c2pa_on_file', 'Not measured',
      'stored_bound_at', now()
    )
  where id = rec.id;

  return jsonb_build_object(
    'ok', true,
    'audio_sha', sha,
    'audio_sha_kind', 'measured',
    'audio_asset_id', p_asset,
    'audio_link', 'declared',
    'c2pa_ledger_events', c2pa_n,
    'c2pa_on_file', 'Not measured'
  );
end
$fn$;

create or replace function public.session_stored_audio(p_live uuid)
returns jsonb
language plpgsql
security definer
set search_path = public
stable
as $fn$
declare
  uid uuid := auth.uid();
  rec public.provenance_sessions;
  m jsonb;
begin
  if uid is null then
    return jsonb_build_object('ok', false, 'error', 'auth');
  end if;
  select * into rec from public.provenance_sessions where live_session_id = p_live;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'not_found');
  end if;
  if rec.host_id <> uid then
    return jsonb_build_object('ok', false, 'error', 'forbidden');
  end if;
  m := coalesce(rec.manifest, '{}'::jsonb);
  return jsonb_build_object(
    'ok', true,
    'audio_sha', m ->> 'audio_sha',
    'audio_sha_kind', m ->> 'audio_sha_kind',
    'audio_asset_id', m ->> 'audio_asset_id',
    'audio_link', m ->> 'audio_link',
    'c2pa_ledger_events', m -> 'c2pa_ledger_events',
    'c2pa_on_file', coalesce(m ->> 'c2pa_on_file', 'Not measured')
  );
end
$fn$;

grant execute on function public.bind_session_stored_audio(uuid, uuid) to authenticated;
grant execute on function public.session_stored_audio(uuid) to authenticated;
revoke all on function public.bind_session_stored_audio(uuid, uuid) from anon, public;
revoke all on function public.session_stored_audio(uuid) from anon, public;

comment on function public.bind_session_stored_audio(uuid, uuid) is
  'Host binds a stored asset SHA to session provenance. SHA measured; link declared. C2PA is a ledger count.';
