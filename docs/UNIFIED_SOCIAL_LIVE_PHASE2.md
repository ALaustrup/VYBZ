# Unified Social Live — Phase 2 (SFU transport)

## Architecture

| Layer | Role |
|-------|------|
| **LiveKit SFU** | Ultra-low-latency realtime (cam / screenshare / DAW audio). Single quality tier: `ultra`. |
| **Bunny Stream** | Optional HLS ingest + **VOD/asset offload** via existing `bunny-live` (recordings, fallback playback). |
| **ICE / TURN** | `ice-servers` Edge Fn (STUN + optional TURN) for NAT; still required beside LiveKit. |

Honest latency target: interactive SFU stage (host + speakers), not magical zero-delay to unlimited viewers. Client `audio_mode=music` disables echoCancellation / noiseSuppression / AGC hints for producer workflows.

```
Host Orb → Go Live → live_sessions row
                 ├─ attach_live_sfu (livekit room name)
                 ├─ livekit-token (publish JWT)
                 └─ bunny-live create (optional HLS/VOD)

Viewer  → livekit-token (subscribe JWT) + optional HLS fallback
Room voice → can_access_room → livekit-token purpose=voice
```

## Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| `livekit-token` | User JWT | Mint LiveKit access tokens (`live` / `voice`) |
| `vc-room-renewals` | Service role or `x-cron-secret` | Hourly `process_vc_room_renewals` |
| `bunny-live` | User JWT | Existing Bunny Stream create/end |
| `ice-servers` | User JWT | STUN/TURN for WebRTC |

Secrets (already listed in `scripts/deploy.sh`): `LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`. Optional: `VC_RENEWALS_SECRET`, `TURN_*`, `BUNNY_STREAM_*`.

## Client

- `src/lib/livekitSfu.ts` — token mint + dynamic `livekit-client` connect
- `startLiveSession` sets `quality_tier=ultra`, `sfu_provider=livekit`, `audio_mode=music`

## Migrations

- `20260724_0062_unified_social_live_sfu.sql` — SFU columns + `attach_live_sfu` / `ensure_room_voice_channel`

## Phase 3 next

Social tab UI (Top 3 lives + room discovery), Orb Go Live dashboard wiring to these tokens.
