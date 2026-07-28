# VYBZ ΓÇö Production hardening checklist

> **VYBZ Music Hub infra** ΓÇö tip + live + catalog for indie artists (not a dating product).

_Astra Matrix, Inc._ ┬╖ Companion to [`SECURITY.md`](../SECURITY.md) ┬╖ Infra gates: [`INFRA_GATES.md`](./INFRA_GATES.md)  
**Host:** https://vybz.cloud ┬╖ **Supabase:** `xixmneooyufbeftdfpcm` ┬╖ **Release:** Beta-0B.1+

**Status:** living checklist for the path beyond **Beta-0B** toward a finalized production bar.

## Creator-first security invariants

- [x] Client ships **only** `VITE_SUPABASE_URL` + `VITE_SUPABASE_ANON_KEY` (+ feature flags).
- [x] No service-role, Stripe secret, LiveKit API secret, or Bunny storage password in `src/`.
- [x] Passkey / password auth; anonymous sign-in stays disabled.
- [x] Protected media via Bunny secure zone + `bunny-sign` / `watermark` Edge paths.
- [x] Content reports surface on drops / posts (`ReportButton` ΓåÆ mod queue).
- [x] Room voice tokens minted server-side (`livekit-token`); access via `can_access_room`.
- [x] V┬ó room subs closed-loop (`mod_points` ledger) ΓÇö **no cash-out** in product.

## Edge Function inventory (privileged)

| Function | Role | Notes |
|----------|------|--------|
| `passkey` | WebAuthn | RP host allow-list must include `vybz.cloud` |
| `livekit-token` | SFU JWT | Music/speech modes; room voice + live |
| `bunny-upload` / `bunny-sign` / `bunny-live` | Media | Secrets server-only; `bunny-live` supports `action: "status"` |
| `watermark` / `watermark-detect` | Provenance | Optional C2PA worker |
| `stripe-*` | Tips / Connect / credits | Webhook signature verify |
| `ice-servers` | WebRTC | STUN always; TURN when `TURN_*` set (`turnConfigured`) |
| `vc-room-renewals` | Premium rooms | Cron / scheduled; idempotent ledger |
| `weekly-digest` / `embed` / `oauth-*` | Aux | Keep scopes minimal |

## Explicit production blockers (do not fake-ship)

| Gate | Why blocked | Unblock when | Probe |
|------|-------------|--------------|-------|
| **TURN** | 1:1 cam / strict NAT reliability | Managed TURN (ExpressTURN) + `TURN_*` Edge secrets | Admin ΓåÆ Infra ┬╖ Go Live strip |
| **Bunny Stream live ingest** | True 1:N HLS broadcast at scale | Confirm plan + `BUNNY_STREAM_*` secrets | Admin ΓåÆ Infra ┬╖ `bunny-live` status |
| **8K / TUS resumable** | Multi-GB masters | Bunny TUS + raised caps + cost policy | ΓÇö |
| **V┬ó cash-out** | Money transmission / KYC | Legal counsel; prefer closed-loop forever | ΓÇö |
| **WebGPU-only path** | Reach | Optional after WebGL2 quality bar | ΓÇö |

Provisioning steps: [`INFRA_GATES.md`](./INFRA_GATES.md).

## vybz.cloud host pass (Vercel)

| Check | Status | Notes |
|-------|--------|-------|
| `X-Content-Type-Options: nosniff` | Γ£à in `vercel.json` | |
| `Referrer-Policy: strict-origin-when-cross-origin` | Γ£à | |
| `X-Frame-Options: DENY` | Γ£à | |
| `Permissions-Policy` | Γ£à | `camera=(self), microphone=(self)` ΓÇö required for Go Live |
| **Content-Security-Policy** | Γ£à shipped in `vercel.json` | Supabase / Bunny / LiveKit / Stripe allow-lists; tighten further after deploy smoke |
| HTML rewrite SPA | Γ£à | `/(.*) ΓåÆ /index.html` |
| Asset immutable cache | Γ£à | `/assets/*` |

After deploy: DevTools ΓåÆ Network ΓåÆ document response headers on `https://vybz.cloud/` must show CSP. If a third-party host is missing, widen `connect-src` deliberately ΓÇö do not disable CSP.

## Supabase advisors spot-check (2026-07-24)

| Severity | Finding | Action |
|----------|---------|--------|
| ERROR (2) | `SECURITY DEFINER` views `public_profiles`, `creator_stats` | Track; intentional public profile surface ΓÇö audit grants before ΓÇ£production finalΓÇ¥ |
| WARN (many) | `function_search_path_mutable`, `anon` executable SECURITY DEFINER RPCs | Prefer `REVOKE EXECUTE FROM anon` where JWT-only; batch hardening pass |
| WARN | Extensions `vector`, `pg_trgm` in `public` | Move schema when safe |

Advisors are **not** a ship-blocker for Beta-0B; treat as the next hardening sprint before ΓÇ£production finalΓÇ¥.

## Release hardening pass (run before ΓÇ£production finalΓÇ¥)

1. [x] `npm run lint` && `npm run build` ΓÇö zero errors (gate on every merge).
2. [~] Spot-check RLS on `rooms`, `room_memberships`, `vc_ledger`, `live_sessions` ΓÇö ongoing.
3. [x] Confirm production Supabase project ref `xixmneooyufbeftdfpcm` only.
4. [ ] Rotate any Edge secrets that were ever pasted into chat/logs.
5. [x] CSP / security headers on `vybz.cloud` host (`vercel.json`).
6. [ ] PWA: verify precache does not pin stale HTML after deploy.
7. [ ] Manual smoke (**GTM loop**): Enter VYBZ ΓåÆ upload ΓåÆ `/u/:id` ΓåÆ VDock play (confirm `site-visuals` CDN loops) ΓåÆ tip with Vc ΓåÆ Go Live. Optional legacy checks: Library / Orb / Social Top-3 / room voice only if debugging those surfaces.
8. [ ] Tag release per [`VERSIONING.md`](../VERSIONING.md).

## Elite reactive surfaces (perf / safety)

- WebGL2 Orb + DropStage respect **Off / Soft / VYBZ Max** and `prefers-reduced-motion`.
- Fallback to Canvas2D when WebGL2 unavailable ΓÇö never blank the Orb.
- FX never captures pointer events over play/scrub controls (`pointer-events-none` on DropStage).
- Analyser graph must not be starved by GPU work (draw after `sampleReactiveFrame`).

## Library (uploader media)

- [x] `/library` ΓÇö drops (rename / feature / delete), project posts (rename / delete), stage backdrops.
- [x] V-Dock pin catalog + More ΓåÆ Workspace ΓåÆ Library; Profile links into Library.
