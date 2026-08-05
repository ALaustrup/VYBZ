# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-04
**Branch:** `main`
**HEAD:** `33b6880269fb31cc6d819f54fa36a8990bf12c80`
**Current milestone:** **M2 — Product isolation** (owner ruled 2026-08-04 that the most recent authorisation governs). Premium suite initiative running in parallel under owner direction of 2026-08-04.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `33b6880269fb31cc6d819f54fa36a8990bf12c80` | merge commit of PR #54 |
| Alias | https://vybz.cloud | HTTP 200, live fetch 2026-08-04 |
| Deployed bundle | `/assets/index-D3G5pgXQ.js` (887,004 bytes) | live fetch |
| Deployment current with `main` | **YES** | `__VYBZ_BUILD_SHA__` in the live bundle equals `33b6880269fb31cc6d819f54fa36a8990bf12c80` |

## Last completed operations

1. **PR [#52](https://github.com/ALaustrup/VYBZ/pull/52) merged** — dating removed from the product entirely.
2. **PR [#53](https://github.com/ALaustrup/VYBZ/pull/53) merged** — evidence-based current-state product audit.
3. **PR [#54](https://github.com/ALaustrup/VYBZ/pull/54) merged** (`33b68802`) — contextual track action system, plus library search, filters, sort, grouping, views, multi-select and batch.

**Merge note:** #53 was authored against the stacked branch `feat/m2-purge-dating-and-nonaudio` and GitHub did not retarget it when #52 merged, so it merged into that intermediate branch rather than `main`. #54's branch already contained all three commits, so retargeting #54 to `main` and merging it delivered the audit and the purge together. Verified by `git ls-tree` on `main`.

## Working tree

Clean on `main` @ `33b68802`. Untracked: `.cursor/settings.json` (do not commit).

## Production verification — 2026-08-04

| Check | Result | Evidence |
|---|---|---|
| Landing loads | **PASS** | HTTP 200 |
| Live bundle matches `main` HEAD | **PASS** | build SHA in bundle = `33b68802…` |
| Dating absent from the live bundle | **PASS** | 0 occurrences of `Dating`, `Something casual`, `intentMix`, `meetup_intents`, `Connection Lab`, `sexting`, `roleplay`, `spark_act`, `vibe_matches` |
| Track action system deployed | **PASS** | `track-action-` present in the live bundle |
| Library search / views / batch deployed | **PASS** | `library-search`, `library-view-`, `batch-bar` present |
| Published legal docs carry no dating provisions | **PASS** | Every remaining match in `terms.md` and `acceptable-use.md` is the new exclusion statement ("VYBZ does **not** provide dating, romantic matching, or adult-intent features") |
| `check:no-fixtures` against deployable `dist/` | **PASS** — 8 markers absent | local run on `main` |
| **Owner signed-in production smoke** | **NOT DONE** — requires owner credentials | `docs/operations/M3_SIGNED_IN_SMOKE.md` |

## Gate on `main` @ `33b68802`

```
npm run lint              — PASS
npm run test              — PASS 206/206 (47 files)
npm run build             — PASS, no CSS warnings
npm run test:e2e          — PASS 49/49 (verified on the PR head, same tree)
npm run check:no-fixtures — PASS (8 markers)
```

CI on `main`: `ios` success, `android` success, `CI` and `desktop` were still running at the time of writing — **not verified to completion**.

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
| 5 — Contextual track actions | **DEPLOYED BUT UNVERIFIED** — live on production, owner has not exercised it |
| 4 — Media library (search, filter, sort, views, multi-select, batch) | **DEPLOYED BUT UNVERIFIED** — same |
| 2 — Shared design foundation | Not started |
| 3 — Application shell and navigation | Not started |
| 6 — Command dashboard | Not started |
| 7 — Track detail and release workspaces | Not started |
| 8 — Audio-reactive visual system | Not started |
| 9 — Desktop enhancement | Not started |
| 10 — Store and discovery | Not started |
| 11 — Quality, performance, release | Not started |

## Parked branches (committed, not merged)

| Branch | HEAD | Contents |
|---|---|---|
| `feat/audio-loudness-mp3-flac` | `497d4afc` | MPEG/FLAC header probes, Web Audio decode + worker loudness, provenance fields, sample-peak/true-peak correction. Gate was green when parked. **Now behind `main`** and will need rebasing |

## Active blockers

| ID | Blocker | Blocks |
|---|---|---|
| — | Owner signed-in production smoke | M2 and M3 exit sign-off |
| — | Sample peak still presented as true peak (`DistributionReportPage.tsx`) | Law 1 compliance; fix sits on the parked branch |
| — | Bundle is 887 kB with no performance budget defined | Premium suite Phase 11 |
| DR-01…DR-05 | Scope decisions: live, messaging/cam, opportunities/cosmetics, V¢ tipping, watermarking | Full M2 scope lock. Owner instructed 2026-08-04 to leave these in place |
| DR-07 | BS.1770 meter strategy | M4, and any true-peak claim |

## Known contradictions

- Orphaned dating RPCs (`vibe_matches`, `spark_act`, `feed_vibe_cards`) and their columns still exist server-side with no client caller. Dropping them needs an irreversible migration and is **not authorised**.
- `AGENTS.md` names M2 as the authorised milestone while the premium suite initiative spans M3–M11 work. Owner directed both; treat the suite work as owner-authorised in parallel.
- `PrimaryRail.tsx` / `MobileNav.tsx` / `CommandBar.tsx` remain unmounted dead code, flagged in the audit for revival rather than deletion.
- Integrated loudness remains a gated-RMS approximation, labelled estimated everywhere it appears.

## Next authorised action

1. **Owner:** exercise the new library and track actions on production and report anything broken.
2. Premium suite Phase 6 — the signed-in command dashboard, assembled from existing data paths.
3. Rebase and land `feat/audio-loudness-mp3-flac` to close the open Law 1 defect.
