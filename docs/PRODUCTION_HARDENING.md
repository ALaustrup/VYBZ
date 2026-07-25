# VYBZ — Production hardening checklist

_Astra Matrix, Inc._ · Companion to [`SECURITY.md`](../SECURITY.md)  
**Status:** living checklist for the path beyond **Beta-0B** toward a finalized production bar.

## Creator-first security invariants

- [x] Client ships **only** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (+ feature flags).
- [x] No service-role, Stripe secret, LiveKit API secret, or Bunny storage password in `src/`.
- [x] Passkey / password auth; anonymous sign-in stays disabled.
- [x] Protected media via Bunny secure zone + `bunny-sign` / `watermark` Edge paths.
- [x] Content reports surface on drops / posts (`ReportButton` → mod queue).
- [x] Room voice tokens minted server-side (`livekit-token`); access via `can_access_room`.
- [x] V¢ room subs closed-loop (`mod_points` ledger) — **no cash-out** in product.

## Edge Function inventory (privileged)

| Function | Role | Notes |
|----------|------|--------|
| `passkey` | WebAuthn | RP host allow-list must include `vybz.cloud` |
| `livekit-token` | SFU JWT | Music/speech modes; room voice + live |
| `bunny-upload` / `bunny-sign` / `bunny-live` | Media | Secrets server-only |
| `watermark` / `watermark-detect` | Provenance | Optional C2PA worker |
| `stripe-*` | Tips / Connect / credits | Webhook signature verify |
| `ice-servers` | WebRTC | TURN only when provisioned |
| `vc-room-renewals` | Premium rooms | Cron / scheduled; idempotent ledger |
| `weekly-digest` / `embed` / `oauth-*` | Aux | Keep scopes minimal |

## Explicit production blockers (do not fake-ship)

| Gate | Why blocked | Unblock when |
|------|-------------|--------------|
| **TURN** | 1:1 cam / strict NAT reliability | Provision TURN + `ice-servers` secrets |
| **Bunny Stream live ingest** | True 1:N HLS broadcast at scale | Confirm plan + wire ingest |
| **8K / TUS resumable** | Multi-GB masters | Bunny TUS + raised caps + cost policy |
| **V¢ cash-out** | Money transmission / KYC | Legal counsel; prefer closed-loop forever |
| **WebGPU-only path** | Reach | Optional after WebGL2 quality bar |

## Release hardening pass (run before “production final”)

1. `npm run lint` && `npm run build` — zero errors.
2. Spot-check RLS on `rooms`, `room_memberships`, `vc_ledger`, `live_sessions`.
3. Confirm production Supabase project ref `xixmneooyufbeftdfpcm` only.
4. Rotate any Edge secrets that were ever pasted into chat/logs.
5. CSP / security headers on `vybz.cloud` host (Vercel or reverse proxy).
6. PWA: verify precache does not pin stale HTML after deploy.
7. Manual smoke: auth → drop play (Orb Max) → Social Top-3 → room voice slots → Spark connect.
8. Tag release per [`VERSIONING.md`](../VERSIONING.md).

## Elite reactive surfaces (perf / safety)

- WebGL2 Orb + DropStage respect **Off / Soft / VYBZ Max** and `prefers-reduced-motion`.
- Fallback to Canvas2D when WebGL2 unavailable — never blank the Orb.
- FX never captures pointer events over play/scrub controls (`pointer-events-none` on DropStage).
- Analyser graph must not be starved by GPU work (draw after `sampleReactiveFrame`).
