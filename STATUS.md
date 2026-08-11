# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.

**Date:** 2026-08-11
**Branch:** `main`
**HEAD:** `e2e9c914` — **DEPLOYED AND VERIFIED** on https://vybz.cloud
**Current milestone:** **Social-first platform** — authorised by the owner 2026-08-11,
superseding Suite UX. VYBZ is a social network for music, sound and audio creators; the
production tools are additive and live behind the Tools launcher. Complete redesign of any
tool is authorised; **nothing may be removed**, only redesigned or frozen in the tree.

## Social-first sequence (authorised direction, not yet built)

| # | Slice | State |
|---|---|---|
| 0 | **Private-by-default playback** — prerequisite for per-track privacy | **Blocked on owner authorisation** |
| 1 | Tools behind one launcher; rail frozen in tree | **This branch** |
| 2 | Signed-in home = creator profile (already `/` → `ProfilePage`) restructured around identity | Not started |
| 3 | Customisable profile showcasing the library, Public/Private per track | Blocked by slice 0 |
| 4 | Library publishes to the creator's feed, honouring per-track visibility | Blocked by slice 0 |
| 5 | Feed as a first-class surface (currently `/feed`, absent from primary nav) | Not started |
| 6 | Follow model — today the profile action creates a mutual pending `connections` row, not a follow | Not started |
| 7 | Chat rooms — global + user-created rooms and groups, artist names shown | Audit in progress |
| 8 | Messaging surfaced properly (DMs work end to end; inbox ordering fixed in PR #170) | Not started |

Slice 0 must land before 3 or 4. Shipping a Private toggle over the current policies would
tell creators their unreleased work is protected when it is not.

### Model already present (do not rebuild)

`can_view_drop(author_id, audience, drop_id)` already implements public / followers /
private-with-invite, and `drops` SELECT uses it. Per-track visibility is an enforcement and
UI problem, not a new data model.

## Merge train — 2026-08-11

Owner authorised merging every open PR. Merged to `main`:

| PR | What |
|---|---|
| #166 | Pre-login featured Helix player; `audio-play` v7 deployed and verified |
| #167 | Library pages the whole catalogue instead of capping at 80 |
| #168 | Connect no longer claims a pending request is a follow |
| #169 | Tools behind the launcher; social-first milestone recorded |
| #170 | DM `last_at` trigger — **migration merged but NOT applied** |
| #171 | Chat shows the artist / producer name |
| #172 | Home is the creator's page; ops tooling moved to Studio |

Zero PRs open. `main` @ `e2e9c914`.

### Correctness gate on merged main

| Command | Result |
|---|---|
| `npm run lint` | pass (`tsc --noEmit` exit 0) |
| `npm run test` | pass — 137 files / 610 tests |
| `npm run build` | pass |
| `npm run check:no-fixtures` | pass — 13 markers absent from `dist/` |

### Production verification — 2026-08-11, unsigned

Deploy status `success` for `e2e9c914`; https://vybz.cloud returns 200 serving
`index-NPOuDrk3.js` (1091 KB raw). Markers measured present in that live bundle:

`Helix` · `CYB3RNOM4D` · `featured-mini-player` · `guestFeatured` · `tools-launcher` ·
`library-tab-tracks` · `social-stats` · `profile-song` · `Your music` · `Customise page` ·
`ops-home-studio` · `Request sent` · `artist_profiles(display_name, created_at)`

Function identifiers (`creatorNamesFor`, `countDropsBy`) are absent from the bundle text
because minification mangles them — string literals from the same code paths are present,
so this is not evidence of missing code.

**Still Not measured:** every signed-in surface. No test account is available to the agent,
so the dashboard, library paging at scale, chat identity and DM behaviour are unverified in
production.

### Outstanding — needs owner action

1. **Apply migration `20260811_0094_dm_thread_last_at`.** Merged but **not applied**, so DM
   inbox ordering is still broken in production exactly as before (no regression).
2. **Private-by-default playback** — see the known issue below. Blocks per-track privacy.
3. **Stripe payouts disabled** — `payouts_enabled: false`, past due since 2026-08-02, because
   `business_profile.url` is `astramatrix.xyz`, which does not resolve. Dashboard-only fix.

## Known issue — private drops are not private

Measured 2026-08-11 against `xixmneooyufbeftdfpcm`:

- `drops` SELECT is correctly gated by `can_view_drop(author_id, audience, id)`.
- `assets` SELECT is `(kind = ANY (...'track'...)) OR owner_id = auth.uid()` — the asset row,
 including its storage `url`, is readable by **anyone**, with no reference to drop audience.
- Storage `audio-assets read` is `(bucket_id = 'audio-assets')` for `authenticated` — **no**
 owner-folder restriction, so any signed-in user can sign any object.

Net: if a creator marks a drop `private` or `followers`, the drop row hides but the audio
stays reachable. **Currently unexploited** — a service-role query returned zero non-public
drops — but it must be closed before private or unreleased work is promoted. Fix needs a
migration (owner authorisation required); the stale comment at `src/lib/api.ts` claiming
`folder = auth.uid()` RLS should be corrected at the same time.

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
