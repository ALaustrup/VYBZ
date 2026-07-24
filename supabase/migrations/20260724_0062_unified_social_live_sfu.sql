-- ===========================================================================
-- Unified Social Live — Phase 2 (SFU room names + Bunny VOD hook fields)
-- LiveKit is the realtime mesh; Bunny remains VOD / HLS offload.
-- ===========================================================================

set search_path = public, extensions;

alter table public.live_sessions
  add column if not exists sfu_provider text
    check (sfu_provider is null or sfu_provider in ('livekit', 'none')),
  add column if not exists livekit_room text,
  add column if not exists audio_mode text not null default 'music'
    check (audio_mode in ('music', 'speech'));

comment on column public.live_sessions.sfu_provider is
  'Realtime transport: livekit (ultra-low-latency) or none (chat-only / legacy HLS).';
comment on column public.live_sessions.audio_mode is
  'music = producer/DAW-friendly (minimal AGC/NS client hints); speech = conferencing.';

alter table public.rooms
  add column if not exists livekit_room text;

-- Attach LiveKit room id when going live (host only via RPC)
create or replace function public.attach_live_sfu(
  p_session uuid,
  p_provider text default 'livekit',
  p_room text default null,
  p_audio_mode text default 'music'
)
returns boolean language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  room text;
begin
  if uid is null then return false; end if;
  if coalesce(p_provider, 'livekit') not in ('livekit', 'none') then return false; end if;
  if coalesce(p_audio_mode, 'music') not in ('music', 'speech') then return false; end if;
  room := coalesce(nullif(trim(p_room), ''), 'vybz-live-' || p_session::text);
  update public.live_sessions
    set sfu_provider = p_provider,
        livekit_room = case when p_provider = 'livekit' then room else null end,
        audio_mode = p_audio_mode,
        input_mode = coalesce(input_mode, source)
  where id = p_session and host_id = uid and status = 'live';
  return found;
end $fn$;
grant execute on function public.attach_live_sfu(uuid, text, text, text) to authenticated;

-- Voice channel room name for premium/free social rooms
create or replace function public.ensure_room_voice_channel(p_room uuid)
returns text language plpgsql security definer set search_path = public as $fn$
declare
  uid uuid := auth.uid();
  r public.rooms%rowtype;
  name text;
begin
  if uid is null or not public.can_access_room(p_room, uid) then return null; end if;
  select * into r from public.rooms where id = p_room and is_active;
  if not found or not r.voice_enabled then return null; end if;
  if r.livekit_room is not null then return r.livekit_room; end if;
  name := 'vybz-voice-' || p_room::text;
  update public.rooms set livekit_room = name where id = p_room and livekit_room is null;
  return name;
end $fn$;
grant execute on function public.ensure_room_voice_channel(uuid) to authenticated;
