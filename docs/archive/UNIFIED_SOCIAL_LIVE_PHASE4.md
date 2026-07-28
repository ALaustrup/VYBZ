# Unified Social Live — Phase 4 (Room voice + renewals)

## Scope

| Surface | Behavior |
|---------|----------|
| **Room voice** | Social rooms with `voice_enabled` show Join voice / mute / leave via LiveKit (`purpose=voice`) |
| **Access gate** | Premium rooms: subscribe CTA when `can_access_room` is false; messages + voice blocked |
| **V¢ renewals** | Edge `vc-room-renewals` → RPC `process_vc_room_renewals` (hourly cron recommended) |

## Client

- `src/lib/livekitSfu.ts` — `joinRoomVoiceSfu`
- `src/pages/RoomPage.tsx` — VoiceBar + premium lock
- `api.getRoom` / `ensureRoomVoiceChannel`

## Cron (ops)

Set a long random secret, then schedule hourly POST:

```bash
npx supabase secrets set VC_RENEWALS_SECRET="…" --project-ref xixmneooyufbeftdfpcm
```

```bash
curl -sS -X POST "https://xixmneooyufbeftdfpcm.supabase.co/functions/v1/vc-room-renewals" \
  -H "x-cron-secret: $VC_RENEWALS_SECRET" \
  -H "content-type: application/json" \
  -d '{"limit":200}'
```

Supabase Dashboard → Edge Functions → Schedules (or external cron) → hourly is enough. Function is deployed with `--no-verify-jwt`; auth is secret or service-role Bearer.

## Phase 5 candidates

Priority voice slots / speaker limits, Social ranking beyond viewer count, Bunny Stream library for HLS/VOD.
