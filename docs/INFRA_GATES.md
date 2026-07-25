# VYBZ — Infra gates (TURN · Bunny Stream)

_Astra Matrix, Inc._ · Companion to [`PRODUCTION_HARDENING.md`](./PRODUCTION_HARDENING.md)

These gates are **explicit production blockers**. Do not fake-ship by inventing credentials. The app already degrades gracefully:

| Gate | Without secrets | With secrets |
|------|-----------------|--------------|
| **TURN** | Google STUN only via `ice-servers` | Reliable NAT traversal for 1:1 WebRTC |
| **Bunny Stream** | LiveKit SFU + presence; no OBS RTMP/HLS | `bunny-live` provisions RTMP + HLS |

Client probes (no side effects):

- `POST ice-servers` → `{ turnConfigured }`
- `POST bunny-live` `{ "action": "status" }` → `{ configured }`
- Admin → **Infra** tab · Go Live sheet status strip · `api.fetchInfraGates()`

---

## 1. TURN on `51.210.209.112` (or managed TURN)

Recommended: **coturn** behind UDP/TCP `3478` + TLS `5349`.

1. Install and configure coturn with a long random shared secret / static user.
2. Open firewall: `3478/udp`, `3478/tcp`, relay port range (e.g. `49152–65535/udp`).
3. Set Supabase Edge secrets on project `xixmneooyufbeftdfpcm`:

```bash
# Example shapes — use your real host + credentials
supabase secrets set \
  TURN_URLS="turn:turn.vybz.cloud:3478?transport=udp,turn:turn.vybz.cloud:3478?transport=tcp" \
  TURN_USERNAME="vybz" \
  TURN_CREDENTIAL="<long-random>"
```

4. Redeploy is not required for secrets; call `ice-servers` once signed-in and confirm `turnConfigured: true`.
5. Smoke: room voice / 1:1 cam from a cellular + strict-NAT peer.

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
