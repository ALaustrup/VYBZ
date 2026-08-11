# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-11
**Branch:** `feat/prelogin-featured-helix`
**HEAD:** `99954035` (pushed; PR [#166](https://github.com/ALaustrup/VYBZ/pull/166) open against `main`)
**Current milestone:** **Suite UX** follow-on — pre-login featured Helix mini-player (awaiting review + edge deploy).

## Production

| Item | Value | Evidence |
|---|---|---|
| Alias | https://vybz.cloud | Live |
| Production SHA | `4ace07bc` (docs tip; includes Suite UX `b0d1645d`) | Prior STATUS; not re-measured this turn |

## Last completed operations

46. **OR-042 Analyzer reliability** — PR #162 @ `373746af`. Creative OS OR-032–042 closed.
47. **Suite UX authorised** then implemented.
48. **Suite UX merged** — PR #163 @ `b0d1645d`.
49. **Suite UX production verify (unsigned)** — 2026-08-11 on https://vybz.cloud.
50. **Pre-login featured Helix** — committed `99954035`, pushed, PR #166 open. Removes Vibes Radio from landing/auth; fixed bottom FeaturedMiniPlayer (Helix / CYB3RNOM4D); BrandMark + AppBarWordmark default reactive; `audio-play` guestFeatured allowlist (edge **not deployed**).

## Deployment state

Suite UX still live on production. Web mini-player **IMPLEMENTED BUT NOT DELIVERED** (PR #166 unmerged). Backend **DEPLOYED AND VERIFIED**.

**`audio-play` edge deployed 2026-08-11** to `xixmneooyufbeftdfpcm` (project `vybz`, ACTIVE_HEALTHY): **version 6 → 7**, `verify_jwt: false` preserved, `ezbr_sha256` `a784f9dcd5c275911a0711f558d26032b5f3702bcaea76c2fa19d98a6b2296f3`. Deployed via the Supabase MCP plugin server after re-pointing `~/.cursor/mcp.json` to the VYBZ `project_ref`; local CLI was unusable (`npx supabase` has no `win32-x64` binary, nothing on PATH, no access token, no repo secrets, no deploy workflow).

Measured: the Helix object is not publicly readable (`GET /storage/v1/object/public/audio-assets/<path>` → HTTP 400), so the edge function is genuinely required for guest playback.

## Production verification

Prior Suite UX unsigned verify stands. Featured Helix on **vybz.cloud** is **Not measured** (PR #166 unmerged), but the production audio backend and the local UI against it were measured on 2026-08-11:

| Check | Result | Evidence |
|---|---|---|
| Guest mint, allowlisted path, no `Authorization` | 200 + ticket | `backend=supabase-stream`, ticket URL returned |
| Guest mint, non-allowlisted path | **403** | `featured path not allowed` |
| Mint without `guestFeatured` and without auth | **401** | unchanged auth requirement |
| Ticket stream | 302 → signed URL → 200 | `Content-Type: audio/mpeg`, `Content-Length: 12389004` |
| Seek / range request | **206 Partial Content** | `Content-Range: bytes 1000000-1000999/12389004` |
| Payload is real audio | ID3v2 header | first bytes `49 44 33 03` |
| Pre-login layout (local, 1024×691) | controls clear | `/` and `/enter` screenshots; player docked bottom-left |
| Brand mark reactivity (local) | pulsing | 7 distinct inline `filter` values in 8 samples over ~720 ms; `brightness(1.033)→(1.386)`, `scale(1.012)→(1.14)` |

**Still Not measured:** the same flows on `vybz.cloud` (needs PR #166 merged), and every signed-in surface (needs a test account).

## Validation (local `feat/prelogin-featured-helix`)

| Command | Result | Evidence |
|---|---|---|
| `npm run lint` | pass | `tsc --noEmit` exit 0 |
| `npm run test` | pass | 134 files / 600 tests |
| `npm run build` | pass | vite production build |
| `npm run check:no-fixtures` | pass | 13 markers absent from `dist/` |
| `npm run test:e2e` | Not measured this turn | — |

## Permanently out of scope (not parked)

Dating / swipe — Law 3. No DSP-delivery claims.

## Blockers / parked

OR-044 Drive sync parked. VYBZ Pro / DR-01 Live / DR-03 Opportunities **withdrawn** from active leftover.

**Standing blocker for RC:** no signed-in production verification has ever been recorded. No invite key / test account is available to the agent, so every member-only flow is `Not measured` on production.

**Known defect (not introduced here, unfixed):** `audio-play`'s Bunny branch returns `200` with `Accept-Ranges: bytes` but never forwards the incoming `Range` header and never returns `206`, so seeking may fail for legacy `drops/…` zone paths. Helix is unaffected (its `{uid}/drops/…` path takes the signed-URL redirect, measured `206` above).

**Local CLI gap:** edge deploys currently depend on the Supabase MCP server; there is no `supabase` binary, access token, repo secret or CI workflow for functions.

## Next authorised action

Owner: (1) review/merge PR #166, then re-run the verification table above against `vybz.cloud`; (2) provide a throwaway test account so the signed-in §15 path can be measured.
