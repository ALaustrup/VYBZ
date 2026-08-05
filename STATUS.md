# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-05
**Branch:** `fix/prepare-publish-bridge`
**HEAD:** `4cb0677724c6c201d5cbe3055fd0506202d3d87c` — 4 commits ahead of `origin/main`, **not pushed**
**Current milestone:** **M2 — Product isolation** (owner ruled 2026-08-04 that the most recent authorisation governs). Premium suite initiative running in parallel under owner direction of 2026-08-04.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `c4033603f4672de342987d9acd0813d73b7f90f7` | merge commit of PR #57; `git log` confirms it is `origin/main` HEAD |
| Alias | https://vybz.cloud | HTTP 200, live fetch 2026-08-05 |
| Deployed bundle | `/assets/index-XM2ry_K3.js` | live fetch 2026-08-05 |
| Deployment current with `main` | **YES** | build SHA in the live bundle = `c4033603f467…`, equal to `origin/main` |
| Deployment carries this branch's 4 commits | **NO** | they are unpushed |

## Last completed operations

1. **PR [#54](https://github.com/ALaustrup/VYBZ/pull/54) merged** (`33b68802`) — contextual track action system, plus library search, filters, sort, grouping, views, multi-select and batch.
2. **PR [#55](https://github.com/ALaustrup/VYBZ/pull/55) merged** (`ead8848a`) — MP3/FLAC on-device loudness, the sample-peak honesty fix, and the signed-in command dashboard.
3. **PR [#56](https://github.com/ALaustrup/VYBZ/pull/56) merged** (`e212ac76`) — design token consolidation (premium suite Phase 2).
4. **PR [#57](https://github.com/ALaustrup/VYBZ/pull/57) merged** (`c4033603`) — track detail workspace (premium suite Phase 7). **This is production.**

### On `fix/prepare-publish-bridge`, committed and unpushed

| SHA | Change |
|---|---|
| `b07081d9` | A scanned track can be published to the catalog; the page says plainly when audio was not stored |
| `5663e717` | V-credit hosting plan designed and its rules encoded in `src/lib/proPlan.ts` |
| `78b1e5d8` | `pro_until` entitlement migration authored; token framing withdrawn from V¢ (Law 6) |
| `4cb06777` | The three surface systems fused into one `--surface-*` language |

**Merge note (historical):** #53 was authored against the stacked branch `feat/m2-purge-dating-and-nonaudio` and GitHub did not retarget it when #52 merged, so it merged into that intermediate branch rather than `main`. #54's branch already contained all three commits, so retargeting #54 to `main` and merging it delivered the audit and the purge together. Verified by `git ls-tree` on `main`.

## Working tree

Clean on `fix/prepare-publish-bridge` @ `4cb06777`. Untracked: `.cursor/settings.json` (do not commit).

## Production verification — 2026-08-04

| Check | Result | Evidence |
|---|---|---|
| Landing loads | **PASS** | HTTP 200 |
| Live bundle matches `main` HEAD | **PASS** | build SHA in bundle = `33b68802…` |
| Dating absent from the live bundle | **PASS** | 0 occurrences of `Dating`, `Something casual`, `intentMix`, `meetup_intents`, `Connection Lab`, `sexting`, `roleplay`, `spark_act`, `vibe_matches` |
| Track action system deployed | **PASS** | `track-action-` present in the live bundle |
| Library search / views / batch deployed | **PASS** | `library-search`, `library-view-`, `batch-bar` present |
| Command dashboard deployed | **PASS** | `command-dashboard`, `action-centre`, `dashboard-first-scan` present |
| MP3/FLAC decode path deployed | **PASS** | `measure-loudness` worker message present |
| **Sample peak no longer presented as true peak** | **PASS** | `samplePeakDbfs` ×4, `DIST_SAMPLE_PEAK_HIGH` ×1, "true peak is not measured" ×2 in the live bundle. The two remaining `dBTP` strings are the `DIST_TRUE_PEAK_HIGH` rule — which reads a field the app now always passes as `null`, reserved for a real oversampling meter — and remediation advice about the user's own mastering chain. Neither labels a measured value as true peak |
| Published legal docs carry no dating provisions | **PASS** | Every remaining match in `terms.md` and `acceptable-use.md` is the new exclusion statement ("VYBZ does **not** provide dating, romantic matching, or adult-intent features") |
| `check:no-fixtures` against deployable `dist/` | **PASS** — 8 markers absent | local run on `main` |
| **Owner signed-in production smoke** | **NOT DONE** — requires owner credentials | `docs/operations/M3_SIGNED_IN_SMOKE.md` |

## Gate on `fix/prepare-publish-bridge` @ `4cb06777` — 2026-08-05

```
npm run lint              — PASS
npm run test              — PASS 272/272 (51 files)
npm run build             — PASS, no CSS warnings
npm run check:no-fixtures — PASS (10 markers absent from dist/)
npm run test:e2e          — NOT RUN on this branch
```

`npm run test:e2e` last passed 53/53 on `main` @ `ead8848a`. It has **not** been run
against the surface-token change, so no claim is made about it.

### Surface unification — measured

| Check | Result | Evidence |
|---|---|---|
| Each `--surface-*` token declared exactly once | **PASS** | scan of built `dist/assets/index-U2ZRSgLz.css` |
| Eight legacy blue-grey fill literals absent from built CSS | **PASS** | same scan, 0 occurrences each |
| Legacy families resolve through the shared tokens | **PASS** | `src/design/tokens.test.ts`, 23 tests |
| Chrome and content visually match | **PASS** | localhost screenshots of `/` and `/releases/new`, 2026-08-05 |
| Verified in production | **NO** | the change is unpushed |

## M2 exit gate (Masterplan §10)

| Criterion | Status | Evidence |
|---|---|---|
| Dating recoverably archived, absent from production builds | **PASS** | 11 modules deleted, data model stripped, 9 markers absent from the live bundle, legal docs rewritten. Recoverable from Git history |
| Collaboration inaccessible and frozen | **Partial** — collab panels removed from Prepare/Credits; `CollabWorkspace` remains for e2e fixtures only | PR #47 |
| Retained systems pass regression | **PASS** | full gate above |
| No destructive database operation | **PASS** | no migrations run |

**M2 delivery state:** **DEPLOYED BUT UNVERIFIED** — the dating criterion is met and verified in production; owner signed-in smoke still outstanding.

## Premium suite initiative

| Phase | State |
|---|---|
| 1 — Audit and stabilisation | **Delivered** — `docs/architecture/PRODUCT_AUDIT_2026-08-04.md` |
| 2 — Shared design foundation | **DEPLOYED BUT UNVERIFIED** (tokens, PR #56) **+ COMMITTED NOT PUSHED** (surface fusion, `4cb06777`) |
| 4 — Media library (search, filter, sort, views, multi-select, batch) | **DEPLOYED BUT UNVERIFIED** — live, owner has not exercised it |
| 5 — Contextual track actions | **DEPLOYED BUT UNVERIFIED** — same |
| 6 — Command dashboard | **DEPLOYED BUT UNVERIFIED** — same |
| 7 — Track detail and release workspaces | **DEPLOYED BUT UNVERIFIED** — track detail live via PR #57; release workspace staging not started |
| 3 — Application shell and navigation | Not started |
| 8 — Audio-reactive visual system | Not started |
| 9 — Desktop enhancement | Not started |
| 10 — Store and discovery | Not started |
| 11 — Quality, performance, release | Not started |

## Parked branches

None. `feat/audio-loudness-mp3-flac` was cherry-picked onto current `main` as `feat/mp3-flac-loudness-rebased` and merged in PR #55.

## Active blockers

| ID | Blocker | Blocks |
|---|---|---|
| — | Owner signed-in production smoke | M2 and M3 exit sign-off |
| — | **No real MP3 or FLAC file has been decoded end to end.** Header parsers are unit-tested against synthesized streams; the decode path is type-checked only | Claiming MP3/FLAC loudness works |
| — | Bundle has no performance budget defined | Premium suite Phase 11 |
| — | **Owner authorisation to push `fix/prepare-publish-bridge` and open a PR** | Delivering all 4 commits, including the surface fusion |
| — | **`20260805_0090_pro_hosting.sql` is authored but not applied.** Requires `supabase db push` against a confirmed target | Any Pro purchase; `purchase_pro` and `pro_status` do not exist server-side |
| — | Nothing measures per-user storage bytes | Billing Pro storage overage |
| — | Publish-to-catalog is not gated on Pro; any signed-in user can upload | Enforcing the Pro boundary |
| — | No scheduled sweep flips lapsed users' public tracks private | Enforcing lapse behaviour |
| — | Surface fusion has not been seen on a signed-in surface | Confirming the app bar, dock, sheets and modals match content in the real suite |
| DR-01…DR-05 | Scope decisions: live, messaging/cam, opportunities/cosmetics, V¢ tipping, watermarking | Full M2 scope lock. Owner instructed 2026-08-04 to leave these in place |
| DR-07 | BS.1770 meter strategy | M4, and any true-peak claim |

## Known contradictions

- Orphaned dating RPCs (`vibe_matches`, `spark_act`, `feed_vibe_cards`) and their columns still exist server-side with no client caller. Dropping them needs an irreversible migration and is **not authorised**.
- `AGENTS.md` names M2 as the authorised milestone while the premium suite initiative spans M3–M11 work. Owner directed both; treat the suite work as owner-authorised in parallel.
- `PrimaryRail.tsx` / `MobileNav.tsx` / `CommandBar.tsx` remain unmounted dead code, flagged in the audit for revival rather than deletion.
- Integrated loudness remains a gated-RMS approximation, labelled estimated everywhere it appears.

## Next authorised action

1. **Owner:** authorise pushing `fix/prepare-publish-bridge` and opening a PR. Four commits are complete and gated but undelivered.
2. **Owner:** run `supabase db push` against the confirmed target to apply `20260805_0090_pro_hosting.sql`. Until then a purchase button would be a dead control.
3. **Owner:** exercise the dashboard, library and track actions on production, and upload a real MP3 or FLAC to confirm loudness measurement works on a genuine file.
4. Then: wire `api.purchasePro()` into the store, gate publish on `pro_status()`, and build storage accounting.

## Known contradiction closed 2026-08-05

The three independent translucent surface systems — forge glass at
`rgba(4,8,16,0.72)`, `.glass` at `rgba(24,32,52,0.48)`, and glass-vibrant at
`rgba(16,28,48,0.45)` — made chrome and content read as two different products.
Owner reported this three times. All three now resolve to one `--surface-*`
token set and three tests guard against reintroduction.
