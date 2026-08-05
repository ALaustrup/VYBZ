# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-05
**Branch:** `main`
**HEAD:** `5d1bcc40f10396fc75a04b0b46825c6113b2ec2f`
**Current milestone:** **M2 — Product isolation** (owner ruled 2026-08-04 that the most recent authorisation governs). Premium suite initiative running in parallel under owner direction of 2026-08-04.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `5d1bcc40f10396fc75a04b0b46825c6113b2ec2f` | merge commit of PR #58, merged 2026-08-05T19:40:45Z |
| Alias | https://vybz.cloud | HTTP 200, live fetch 2026-08-05 |
| Deployed bundle | `/assets/index-B9yWIVJ_.js` | live fetch 2026-08-05 |
| Deployed CSS | `/assets/index-U2ZRSgLz.css` | live fetch 2026-08-05 |
| Deployment current with `main` | **YES** | build SHA in the live bundle = `5d1bcc40f103…`, equal to `origin/main` |

## Last completed operations

1. **PR [#54](https://github.com/ALaustrup/VYBZ/pull/54) merged** (`33b68802`) — contextual track action system, plus library search, filters, sort, grouping, views, multi-select and batch.
2. **PR [#55](https://github.com/ALaustrup/VYBZ/pull/55) merged** (`ead8848a`) — MP3/FLAC on-device loudness, the sample-peak honesty fix, and the signed-in command dashboard.
3. **PR [#56](https://github.com/ALaustrup/VYBZ/pull/56) merged** (`e212ac76`) — design token consolidation (premium suite Phase 2).
4. **PR [#57](https://github.com/ALaustrup/VYBZ/pull/57) merged** (`c4033603`) — track detail workspace (premium suite Phase 7).
5. **PR [#58](https://github.com/ALaustrup/VYBZ/pull/58) merged** (`5d1bcc40`) — publish bridge, surface fusion, Pro hosting design and the Law 6 token withdrawal. **This is production.**

### Delivered in PR #58

| SHA | Change |
|---|---|
| `b07081d9` | A scanned track can be published to the catalog; the page says plainly when audio was not stored |
| `5663e717` | V-credit hosting plan designed and its rules encoded in `src/lib/proPlan.ts` |
| `78b1e5d8` | `pro_until` entitlement migration authored; token framing withdrawn from V¢ (Law 6) |
| `4cb06777` | The three surface systems fused into one `--surface-*` language |
| `8d254359` | Checkpoint corrected against measured production state |

CI on PR #58 was fully green before merge: `quality`, `ai-test`, `load-test`,
`perf-audit`, `android-aab`, `ios-ipa`, `linux-appimage`, `mac-dmg`,
`windows-msi` and Vercel all passed. `draft-release` skipped by design.

**Merge note (historical):** #53 was authored against the stacked branch `feat/m2-purge-dating-and-nonaudio` and GitHub did not retarget it when #52 merged, so it merged into that intermediate branch rather than `main`. #54's branch already contained all three commits, so retargeting #54 to `main` and merging it delivered the audit and the purge together. Verified by `git ls-tree` on `main`.

## Working tree

Clean on `main` @ `5d1bcc40`. Untracked: `.cursor/settings.json` (do not commit).

Two stashes remain and were **not** touched, per the preservation rule:
`stash@{0}` "ops cutover docs WIP" and `stash@{1}" "temp hash drift".

`docs/operations/DISTRIBUTION_EXPORT_HASHES.json` is rewritten by every
`test:e2e` run with a fresh release id, timestamp and hash. The local churn from
this session's run was reverted rather than committed, since the value is
nondeterministic and records nothing durable.

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

## Gate on `main` @ `5d1bcc40` — 2026-08-05

```
npm run lint              — PASS
npm run test              — PASS 272/272 (51 files)
npm run build             — PASS, no CSS warnings
npm run test:e2e          — PASS 57/57
npm run check:no-fixtures — PASS (10 markers absent from dist/)
```

### Surface unification — verified in production

| Check | Result | Evidence |
|---|---|---|
| Each `--surface-*` token declared exactly once | **PASS** | scan of live `/assets/index-U2ZRSgLz.css`, 1 occurrence each |
| Seven legacy blue-grey fill literals absent | **PASS** | same live scan, 0 occurrences each |
| Legacy families resolve through the shared tokens | **PASS** | `src/design/tokens.test.ts`, 23 tests |
| Chrome and content visually match | **PASS** | production screenshot of `/releases/new`, 2026-08-05 |
| Signed-in chrome — app bar, dock, sheets, modals | **NOT VERIFIED** | resolves through the shared tokens by construction, but not observed; requires owner credentials |

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
| 2 — Shared design foundation | **DEPLOYED** — tokens (PR #56) and the surface fusion (PR #58); fusion verified in the live CSS, signed-in chrome unobserved |
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
| — | **`20260805_0090_pro_hosting.sql` is merged but not applied.** Requires `supabase db push` against an owner-confirmed target | Any Pro purchase; `purchase_pro` and `pro_status` do not exist server-side |
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

1. **Owner:** confirm the target Supabase project so `20260805_0090_pro_hosting.sql` can be applied with `supabase db push`. It is merged but unapplied, so `purchase_pro` and `pro_status` do not exist server-side and a purchase button would be a dead control. A database migration needs owner approval regardless of the standing push/deploy authorisation.
2. **Owner:** sign in on production and confirm the app bar, dock, sheets and modals now match the content surfaces. This is the only part of the fusion not verified.
3. **Owner:** upload a real MP3 or FLAC to confirm loudness measurement works on a genuine file.
4. Then: wire `api.purchasePro()` into the store, gate publish on `pro_status()`, and build storage accounting.

## Known contradiction closed 2026-08-05

The three independent translucent surface systems — forge glass at
`rgba(4,8,16,0.72)`, `.glass` at `rgba(24,32,52,0.48)`, and glass-vibrant at
`rgba(16,28,48,0.45)` — made chrome and content read as two different products.
Owner reported this three times. All three now resolve to one `--surface-*`
token set and three tests guard against reintroduction.
