-- Public stage nights for artist profiles.
-- Returns world/public live_sessions plus sealed provenance summary only.
-- No event payloads. Circle sessions stay hidden.

set search_path = public, extensions;

create or replace function public.list_host_stage_nights(p_host uuid, p_limit int default 24)
returns jsonb
language sql
security definer
set search_path = public
stable
as $fn$
  select coalesce(jsonb_agg(row_to_json(t)::jsonb order by t.started_at desc), '[]'::jsonb)
  from (
    select
      s.id,
      s.title,
      s.status,
      s.source,
      s.intent,
      s.viewer_count,
      s.playback_hls,
      s.started_at,
      s.ended_at,
      ps.strength,
      ps.atc_burned,
      (ps.id is not null) as sealed
    from public.live_sessions s
    left join public.provenance_sessions ps
      on ps.live_session_id = s.id
     and ps.status = 'sealed'
    where s.host_id = p_host
      and coalesce(s.visibility, 'world') in ('world', 'public')
    order by s.started_at desc
    limit greatest(1, least(coalesce(p_limit, 24), 40))
  ) t;
$fn$;

grant execute on function public.list_host_stage_nights(uuid, int) to authenticated;
revoke all on function public.list_host_stage_nights(uuid, int) from anon, public;

comment on function public.list_host_stage_nights(uuid, int) is
  'Public nights for a host profile. Sealed strength only; no provenance event payloads.';
