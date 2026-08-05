# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-04
**Branch:** `main`
**HEAD:** `ead8848a8e23d185d699dd5010f9062e3004d66e`
**Current milestone:** **M2 — Product isolation** (owner ruled 2026-08-04 that the most recent authorisation governs). Premium suite initiative running in parallel under owner direction of 2026-08-04.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `ead8848a8e23d185d699dd5010f9062e3004d66e` | merge commit of PR #55 |
| Alias | https://vybz.cloud | HTTP 200, live fetch 2026-08-04 |
| Deployed bundle | `/assets/index-C2YJIYdC.js` | live fetch |
| Deployment current with `main` | **YES** | `__VYBZ_BUILD_SHA__` in the live bundle equals `ead8848a…` |

## Last completed operations

1. **PR [#52](https://github.com/ALaustrup/VYBZ/pull/52) merged** — dating removed from the product entirely.
2. **PR [#53](https://github.com/ALaustrup/VYBZ/pull/53) merged** — evidence-based current-state product audit.
3. **PR [#54](https://github.com/ALaustrup/VYBZ/pull/54) merged** (`33b68802`) — contextual track action system, plus library search, filters, sort, grouping, views, multi-select and batch.
4. **PR [#55](https://github.com/ALaustrup/VYBZ/pull/55) merged** (`ead8848a`) — MP3/FLAC on-device loudness, the sample-peak honesty fix, and the signed-in command dashboard.

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
| Command dashboard deployed | **PASS** | `command-dashboard`, `action-centre`, `dashboard-first-scan` present |
| MP3/FLAC decode path deployed | **PASS** | `measure-loudness` worker message present |
| **Sample peak no longer presented as true peak** | **PASS** | `samplePeakDbfs` ×4, `DIST_SAMPLE_PEAK_HIGH` ×1, "true peak is not measured" ×2 in the live bundle. The two remaining `dBTP` strings are the `DIST_TRUE_PEAK_HIGH` rule — which reads a field the app now always passes as `null`, reserved for a real oversampling meter — and remediation advice about the user's own mastering chain. Neither labels a measured value as true peak |
| Published legal docs carry no dating provisions | **PASS** | Every remaining match in `terms.md` and `acceptable-use.md` is the new exclusion statement ("VYBZ does **not** provide dating, romantic matching, or adult-intent features") |
| `check:no-fixtures` against deployable `dist/` | **PASS** — 8 markers absent | local run on `main` |
| **Owner signed-in production smoke** | **NOT DONE** — requires owner credentials | `docs/operations/M3_SIGNED_IN_SMOKE.md` |

## Gate on `main` @ `ead8848a`

```
npm run lint              — PASS
npm run test              — PASS 235/235 (49 files)
npm run build             — PASS, no CSS warnings
npm run test:e2e          — PASS 53/53
npm run check:no-fixtures — PASS (9 markers)
```

CI on PR #55 reached `CLEAN` before merge — quality, android, ios and all three desktop packaging jobs passed.

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
| 4 — Media library (search, filter, sort, views, multi-select, batch) | **DEPLOYED BUT UNVERIFIED** — live, owner has not exercised it |
| 5 — Contextual track actions | **DEPLOYED BUT UNVERIFIED** — same |
| 6 — Command dashboard | **DEPLOYED BUT UNVERIFIED** — same |
| 2 — Shared design foundation | Not started |
| 3 — Application shell and navigation | Not started |
| 7 — Track detail and release workspaces | Not started |
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
| DR-01…DR-05 | Scope decisions: live, messaging/cam, opportunities/cosmetics, V¢ tipping, watermarking | Full M2 scope lock. Owner instructed 2026-08-04 to leave these in place |
| DR-07 | BS.1770 meter strategy | M4, and any true-peak claim |

## Known contradictions

- Orphaned dating RPCs (`vibe_matches`, `spark_act`, `feed_vibe_cards`) and their columns still exist server-side with no client caller. Dropping them needs an irreversible migration and is **not authorised**.
- `AGENTS.md` names M2 as the authorised milestone while the premium suite initiative spans M3–M11 work. Owner directed both; treat the suite work as owner-authorised in parallel.
- `PrimaryRail.tsx` / `MobileNav.tsx` / `CommandBar.tsx` remain unmounted dead code, flagged in the audit for revival rather than deletion.
- Integrated loudness remains a gated-RMS approximation, labelled estimated everywhere it appears.

## Next authorised action

1. **Owner:** exercise the new dashboard, library and track actions on production, and upload a real MP3 or FLAC to confirm loudness measurement works on a genuine file.
2. Premium suite Phase 2 — consolidate design tokens. This should precede broad visual work or it will be redone.
3. Premium suite Phase 7 — track detail route, reusing the existing waveform, findings, credits and mastering components.
