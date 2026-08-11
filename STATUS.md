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

Suite UX still live on production. Featured mini-player **IMPLEMENTED BUT NOT DELIVERED** (PR #166 unmerged).

**Edge deploy attempted and blocked (2026-08-11):** `npx supabase` has no `win32-x64` binary; no `supabase` on PATH; no `SUPABASE_ACCESS_TOKEN` in env and no `~/.supabase/access-token`; `gh secret list` for `ALaustrup/VYBZ` is empty and no workflow deploys functions; the `user-supabase` MCP server is bound to project `ixiveenrwhxyscmgbxpv`, **not** VYBZ `xixmneooyufbeftdfpcm`, so it must not be used to deploy. Measured: Helix object is not publicly readable (`GET /storage/v1/object/public/audio-assets/<path>` → HTTP 400), so guest playback cannot bypass the edge function.

## Production verification

Prior Suite UX unsigned verify stands. Featured Helix on sign-in **Not measured** (not on prod).

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

**Blocker for Helix audio:** no usable Supabase deploy credential on this machine (see Deployment state). Needs either a `SUPABASE_ACCESS_TOKEN` (`sbp_…`) available to the CLI or the owner running `supabase functions deploy audio-play --no-verify-jwt` against `xixmneooyufbeftdfpcm`.

**Standing blocker for RC:** no signed-in production verification has ever been recorded. No invite key / test account is available to the agent, so every member-only flow is `Not measured` on production.

## Next authorised action

Owner: (1) provide a Supabase access token or run the `audio-play` deploy; (2) review/merge PR #166; (3) then smoke `/` and `/enter` — mini-player bottom-anchored and clear of controls, Helix plays, logo mark + wordmark pulse.
