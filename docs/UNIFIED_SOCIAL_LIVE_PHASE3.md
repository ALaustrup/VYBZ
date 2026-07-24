# Unified Social Live — Phase 3 (Social hub + Orb Go Live)

## Scope

| Surface | Behavior |
|---------|----------|
| **`/social`** | Top 3 public lives (`top_live_sessions`) + social room discovery (`list_social_rooms`); create free/premium V¢ rooms; subscribe with closed-loop V¢ |
| **Taskbar** | Default pin **Social** (`/social`); Orb **Go live** → `/social?go=1` |
| **Go Live sheet** | Preview → `startLiveSession` (ultra + LiveKit attach) → MediaStream handoff → Watch |
| **`/live/:id`** | Host publishes / viewers subscribe via `joinLiveSessionSfu`; Bunny HLS fallback when SFU off |

## Client files

- `src/pages/SocialPage.tsx`
- `src/lib/livePreviewHandoff.ts`
- `src/lib/livekitSfu.ts` (`joinLiveSessionSfu`)
- Flag: `FLAGS.socialLive` / `VITE_FEATURE_SOCIAL_LIVE` (default ON)

## Ops still required

LiveKit secrets on Edge (`LIVEKIT_URL`, `LIVEKIT_API_KEY`, `LIVEKIT_API_SECRET`) for in-app SFU. Without them, Go Live still creates the session + chat; host keeps local preview; viewers wait / use HLS if Bunny is configured.

## Phase 4 candidates

Room voice UI (`mintRoomVoiceToken`), cron wiring polish for `vc-room-renewals`, Social ranking signals beyond viewer count.
