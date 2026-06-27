# MYVYB Live — Setup Runbook

The Live carousel needs LiveKit Cloud + three new Supabase pieces. Once these
are configured, **Go live** publishes a stream and the carousel picks it up for
everyone in the same age layer.

## 1. LiveKit Cloud (one-time)

1. Create a project at <https://cloud.livekit.io>.
2. From the project dashboard, copy:
   - **WS URL** — looks like `wss://<project>.livekit.cloud`
   - **API key** (`APIxxxxxxxxxxxx`)
   - **API secret** (`secretxxxxxxx…`)

## 2. Supabase secrets (server-side)

Set on the Supabase project (Settings → Edge Functions → Secrets, or via CLI):

```bash
supabase secrets set \
  LIVEKIT_URL=wss://<project>.livekit.cloud \
  LIVEKIT_API_KEY=APIxxxxxxxxxxxx \
  LIVEKIT_API_SECRET=secretxxxxxxx…
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are already set by Supabase for
edge functions; no action needed.

## 3. Apply migrations

In order (newest last):

```bash
supabase db push   # or paste each file into the SQL editor
# Files:
#   apps/veiled/supabase/migrations/20260626_0001_drop_games.sql
#   apps/veiled/supabase/migrations/20260626_0002_live_streams.sql
#   apps/veiled/supabase/migrations/20260626_0003_live_moderation_and_recording.sql
```

## 4. Deploy the edge function

```bash
supabase functions deploy live-token
```

## 5. (Optional) record-and-publish clips

The `record` flag on `live_start` is already wired through the schema and UI
("Save a clip to my profile"). Server-side recording will land in a follow-up
that registers a LiveKit Egress webhook + writes the resulting MP4 into the
private `confessions` bucket (or a sibling `clips` bucket).

## Eligibility (what the server enforces)

A user can **stream** only if all true:
- non-anonymous (`anonymous = false`)
- not banned
- email verified (`auth.users.email_confirmed_at` set)
- permanent **age** set
- permanent **sex** set

A viewer can **watch a given stream** only if all true:
- same age layer as the stream (`teen` ↔ `teen`, `adult` ↔ `adult`)
- if `stream.nsfw` is true, the viewer has `nsfw_opt_in = true`
- not banned, not the streamer themselves
- they haven't already reacted to that stream (skipped by `live_carousel`)

## Moderation (community-led + safety net)

- **Vyb / Fail rate** auto-ends a stream at ≥60% Fails with ≥8 votes
  (`ended_reason = 'community_fail'`).
- **3 unique reports in 10 minutes** auto-end the stream
  (`ended_reason = 'reports'`).
- Operators see the row + reports for post-hoc action (bans, etc.).

Tune thresholds in `live_check_auto_end()` in migration `0003`.
