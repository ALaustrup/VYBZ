# VYBZ — Infra gates (TURN · Bunny Stream)

_Astra Matrix, Inc._ · Companion to [`PRODUCTION_HARDENING.md`](./PRODUCTION_HARDENING.md)

These gates are **explicit production blockers**. Do not fake-ship. The app degrades gracefully:

| Gate | Without secrets | With secrets |
|------|-----------------|--------------|
| **TURN** | Google STUN only via `ice-servers` | Reliable NAT traversal for 1:1 WebRTC |
| **Bunny Stream** | LiveKit SFU + presence; no OBS RTMP/HLS | `bunny-live` provisions RTMP + HLS |

Client probes (no side effects):

- `POST ice-servers` → `{ turnConfigured }`
- `POST bunny-live` `{ "action": "status" }` → `{ configured }`
- Admin → **Infra** tab · Go Live sheet status strip · `api.fetchInfraGates()`

VYBZ runs on **Vercel + Supabase + Bunny** — there is **no VYBZ-owned VPS**. TURN must be a **managed** provider (or a host you explicitly choose later).

---

## 1. TURN (managed) — ExpressTURN free

**Endpoint:** `free.expressturn.com:3478`  
Sign up → copy long-term username + password from the ExpressTURN dashboard.  
Never commit credentials; never put them in `VITE_*`.

### Set Edge secrets (project `xixmneooyufbeftdfpcm`)

```bash
export SUPABASE_ACCESS_TOKEN=sbp_...   # https://supabase.com/dashboard/account/tokens

export TURN_URLS='turn:free.expressturn.com:3478?transport=udp,turn:free.expressturn.com:3478?transport=tcp'
export TURN_USERNAME='<from ExpressTURN dashboard>'
export TURN_CREDENTIAL='<from ExpressTURN dashboard>'

bash scripts/set-turn-edge-secrets.sh
```

Or one-liner:

```bash
npx supabase secrets set --project-ref xixmneooyufbeftdfpcm \
  "TURN_URLS=turn:free.expressturn.com:3478?transport=udp,turn:free.expressturn.com:3478?transport=tcp" \
  "TURN_USERNAME=..." \
  "TURN_CREDENTIAL=..."
```

Redeploy is **not** required for Edge secrets. Verify: Admin → Infra → **TURN ready**.

Smoke: room voice / 1:1 cam from cellular + Wi‑Fi NAT.

**Note:** Free managed TURN is shared capacity. Upgrade ExpressTURN (or another provider) if you outgrow the free tier. If credentials are ever pasted into chat/logs, rotate them in the ExpressTURN dashboard and re-run `secrets set`.

---

## 2. Bunny Stream live ingest

1. In Bunny.net: create a **Stream Library** (Live enabled). Note Library ID + AccessKey.
2. Set Edge secrets:

```bash
supabase secrets set \
  BUNNY_STREAM_LIBRARY_ID="<numeric-id>" \
  BUNNY_STREAM_API_KEY="<library-access-key>"
# optional:
# BUNNY_STREAM_RTMP_BASE="rtmp://…"
```

3. Redeploy `bunny-live` if the `status` action is not yet live on the project.
4. Confirm Admin → Infra shows Bunny ready, or `action: "status"` returns `configured: true`.
5. Smoke: Go Live → host sees RTMP URL + stream key when Bunny succeeds; viewers get HLS when OBS/encoder publishes.

LiveKit remains the in-app SFU path (`livekit-token` + `LIVEKIT_*` secrets). Bunny is the optional 1:N HLS / OBS path.

---

## 3. Verify from the product

1. Sign in on https://vybz.cloud
2. Admin (staff) → **Infra** → Refresh
3. Or Live → Go live → read the amber/green status strip
4. Never paste secrets into client env, chat, or `VITE_*`
