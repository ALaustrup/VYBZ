# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-07
**Branch:** `feat/artist-os-surface-overhaul`
**HEAD:** `66588278` — Surface Overhaul commit on `feat/artist-os-surface-overhaul` (not pushed)
**Current milestone:** **Artist OS Surface Overhaul.** Owner authorised 2026-08-07.
M4 remains paused. Premium-suite phase track remains withdrawn. Chrome Foundation landed.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `2c2826de1aeef9533e0fcad30307dbb79abceda4` | prior checkpoint — branch not deployed |
| Alias | https://vybz.cloud | unchanged until merge + promote |
| Deployment current with branch | **NO** | Surface Overhaul is local on feature branch |

## Last completed operations

1. **Artist OS Surface Overhaul implemented** on `feat/artist-os-surface-overhaul` — centered brand, Now Playing rail, VDock titles + viz modes, Library Tracks/Projects/Stages + Finalize strip, Discover search/filter/grid-list, Releases→Finalize, Messages without Rooms, AI/Usage/Flair archived from nav, Profile Packages (V¢), Codex list/cards. Gate below.
2. **PR [#61](https://github.com/ALaustrup/VYBZ/pull/61) merged** (`d1f71370`) — forge-card surface sweep (production).
3. **PR [#60](https://github.com/ALaustrup/VYBZ/pull/60) merged** (`17d52bbf`) — Chrome Foundation.

## Gate on `feat/artist-os-surface-overhaul` — 2026-08-07

```
npm run lint              — PASS
npm run test              — PASS 312/312 (54 files)
npm run build             — PASS (assets index-CPwN25j5.js / index-svqxrOvn.css)
```

Delivery state: **BUILT LOCALLY — NOT DEPLOYED**. Push / PR / production promote require owner authorisation.

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

On `feat/artist-os-surface-overhaul` branched from `d1f71370`. Untracked: `.cursor/settings.json` (do not commit).
Unrelated local line-ending diffs on other tracked files are **not** staged with this overhaul.

Two stashes remain and were **not** touched, per the preservation rule:
`stash@{0}` "ops cutover docs WIP" and `stash@{1}` "temp hash drift".

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

## Gate on `feat/premium-shell-vdock` — 2026-08-06

```
npm run lint              — PASS
npm run test              — PASS 309/309 (54 files), including tokens.test.ts
npm run build             — PASS
```

## Gate on `main` @ `0e911c4b` — 2026-08-06 (historical)

```
npm run lint              — PASS
npm run test              — PASS 307/307 (53 files)
npm run build             — PASS, no CSS warnings
npm run check:no-fixtures — PASS (10 markers absent from dist/)
e2e command-palette.spec  — PASS 36/36 across 3 repeats
e2e full suite            — 68 passed, 1 failed
```

The single e2e failure is `library.spec.ts` "shift-click extends a range", which reported
4 selected instead of 2. It passes **48/48 across 3 repeats in isolation**, so it is a
pre-existing flake under parallel load rather than a regression. Recorded rather than
described as clean.

### Environment problems observed 2026-08-06

- **Git identity was cleared mid-session.** `user.name` and `user.email` are empty in local,
  global and effective config, though `381a0270` was authored earlier the same day as
  `ALaustrup <ALaustrup@users.noreply.github.com>`. These two commits were made by passing
  the identity per-invocation with `git -c`; **the config was not modified**. It still needs
  restoring.
- **Something rewrites line endings.** Nineteen files were reported modified with no
  substantive change — line endings only, plus one removed BOM in `src/App.tsx`. Reverted
  rather than committed, to keep the real diff legible.
- **Stale `vite preview` processes hold port 4173** after an interrupted e2e run and must be
  killed by matching the command line; killing the npm wrapper leaves the node child alive.

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

## Premium suite initiative — WITHDRAWN 2026-08-06

The eleven-phase track is cancelled by owner direction. It ran alongside the Masterplan
milestone sequence, which meant two plans competing for the same surface; breadth without
completion was the result. Its phase numbers carry no authority. Work it already delivered
is retained and recorded above under the PRs that shipped it.

## Direction reset — 2026-08-06

| Item | State |
|---|---|
| Direction chosen | Audio Intelligence and Release Operating System — already Masterplan §1, so doctrine was not the failure |
| Competing plan | Premium-suite phase track withdrawn |
| Authorised milestone | **M4 — Measurement Integrity Foundation** |
| Law 3 during M4 | Social, live, messaging, rooms, connect, opportunities, discovery: reachable and maintained, **no new feature work** |
| Removal policy | **Freeze in tree**, imported by nothing, recoverable — owner chose this over deletion |
| Structural fix | An exit gate that can be automated must be. `src/app/routeTruth.test.ts` is the reference |

### Correction to a prior claim in this document

An earlier assistant statement that "seven of fourteen navigation entries are dead ends"
was **wrong**. That is true of `SUITE_ROUTES`, the intent manifest, but that manifest does
not drive the menu. `src/shell/navModel.ts` does, and it already excluded every placeholder
deliberately. The eleven placeholder pages are reachable by URL and linked from nowhere.
The navigation façade was closed before 2026-08-06; it is now closed *by test*.

## Shipped on `main` @ `2d42fd29` (pushed 2026-08-06)

| SHA | Change |
|---|---|
| `6fab11be` | One plan; M4 authorised; exit gates must be executable |
| `0e911c4b` | `routeTruth` + the M3 gate as a test; real command palette replacing the read-only search stub |
| `2d42fd29` | Passkey signup resume + real edge-function error surfacing (`account_exists`); session mint hardening |

### Passkey fix — what failed and what shipped

Signup called `createUser` before the OS passkey sheet. Cancel left an email-only account;
retry hit `409 account_exists`, but the client threw a generic non-2xx before reading the
body, so the UI never pivoted. Fix: parse `FunctionsHttpError` bodies; resume incomplete
signup server-side; prefer platform authenticators; clearer Onboarding errors.

**Owner signed-in passkey smoke on production:** **NOT DONE** — needs a real device
create / cancel-once-then-retry / sign-in pass on https://vybz.cloud/enter.

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

1. **Owner:** signed-in smoke on https://vybz.cloud — left rail, Home albums + lightbox, Discover hover preview, dim backdrop (hard-refresh / clear site data if PWA caches).
2. Close Artist OS Chrome Foundation exit gate after smoke, then resume **M4** only when owner re-authorises.
3. **Owner:** restore the git identity (`git config --global user.name` / `user.email`).

**VYBZ Pro remains designed and unauthorised.** The migration is merged but unapplied, so
`purchase_pro` and `pro_status` do not exist server-side. No purchase control exists, and
publish is not gated. Per `IDEAS_BACKLOG.md` §0 it is not authorised to build, and a backlog
entry is not authorisation.

## Known contradiction closed 2026-08-05

The three independent translucent surface systems — forge glass at
`rgba(4,8,16,0.72)`, `.glass` at `rgba(24,32,52,0.48)`, and glass-vibrant at
`rgba(16,28,48,0.45)` — made chrome and content read as two different products.
Owner reported this three times. All three now resolve to one `--surface-*`
token set and three tests guard against reintroduction.
