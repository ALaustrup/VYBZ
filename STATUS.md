# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-04
**Branch:** `docs/m2-authorisation` (from `origin/main` @ `c79948b6`)
**HEAD:** _see final commit on this branch_
**Current milestone:** **M2 — Product isolation** — owner ruled 2026-08-04 that the most recent authorisation governs.

---

## Milestone ruling (2026-08-04)

The authority documents disagreed: `AGENTS.md` named M3, while `STATUS.md` history recorded
M2 as owner-authorised on 2026-08-02. Owner ruled that the **most recent** authorisation is
the one to honour.

| Milestone | Authorised | Evidence |
|---|---|---|
| M3 | earlier | merged PRs #36–#45, last on 2026-08-02T03:32Z |
| **M2** | **later — governs** | `112f4d9f` "docs(status): PRs #46-47 merged, M2 authorised", 2026-08-02 |

`AGENTS.md` has been corrected to name M2. Outstanding M3 items are carry-forward, to be
finished after M2 rather than expanded.

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `c79948b64ccb3d18e5330b51c9ebe897e0747556` | merge commit of PR #51 |
| Alias | https://vybz.cloud | HTTP 200, live fetch 2026-08-04 |
| Deployed bundle | `/assets/index-cQiJuwWY.js` | live fetch 2026-08-04 |
| Deployment current with `main` | **YES** | `__VYBZ_BUILD_SHA__` in live bundle = `c79948b64ccb…` |

## M2 exit gate audit — 2026-08-04

Masterplan §10 requires dating to be "recoverably archived and **absent from production
builds**". It is not. Evidence below is from a local deployable build (`npm run build`,
`index-DfPTnYyc.js`, same dating code paths as production) plus source inspection.

**Correctly frozen — absent from the bundle:** `SparkPage`, `LoveMeetup*`, `MutualMatch*`,
`loveFilter`, `swipe deck`.

**Still reaching the production bundle:**

| # | Surface | Location | Bundle evidence |
|---|---|---|---|
| 1 | `"Dating"`, `"Something casual"` in the looking-for option list | `src/lib/profileFields.ts:295` | `"Dating"` present (3 case-insensitive matches) |
| 2 | `ROMANTIC_LOOKING_FOR` + `hasRomanticLookingFor()` still exported and consumed | `src/lib/profileFields.ts:398` | reachable from `/profile/edit` |
| 3 | User-facing romantic copy: "Set birth year (18+) before Dating / Something casual", "Romantic intents require 18+" | `src/pages/ProfileEditPage.tsx:121,237,248,263` | route is live in the signed-in shell |
| 4 | `love` pillar maps to `"Dating"`, `"Something casual"`; `meetup` pillar to `"Activity partner"` | `src/lib/intentMix.ts:137–139` | `intentMix` present (3 matches) |
| 5 | "Connection Lab", "Enable spice (18+)", "Spice requires 18+" | `src/components/dashboard/DashConnectPanel.tsx:33,83,129` | rendered on the dashboard |
| 6 | Dating profile data mapping — `meetup_intents`, `looking_for`, and a `p_meetup` RPC parameter | `src/lib/api.ts` | `meetup` present (13 matches) |
| 7 | Legal copy advertising "opt-in Connection Lab (18+ adult intents)" | `src/lib/codex.ts:39` | shipped in Codex/legal surface |

This also violates the standing prohibition in `AGENTS.md` ("No dating, romantic, love,
meetup or swipe functionality. Permanently out of scope") and Masterplan §6, which requires
this functionality to be absent from the active application.

| M2 criterion | Status |
|---|---|
| Dating recoverably archived, absent from production builds | **FAIL** — seven live surfaces above |
| Collaboration inaccessible and frozen | **PARTIAL** — collab panels removed from Prepare/Credits; `CollabWorkspace` remains for e2e fixtures only |
| Retained systems pass regression | **PASS** — lint / test 161 / build / e2e 26 / no-fixtures, 2026-08-04 |
| No destructive database operation | **PASS** — no migrations run |

**M2 delivery state:** **PARTIALLY IMPLEMENTED.**

## Open work already targeting this

**PR [#48](https://github.com/ALaustrup/VYBZ/pull/48) — OPEN, stale** (`feat/m2-dating-profile-cleanup`,
`bf36a0a1`). Touches items 1, 2, 3 and 4 above: `profileFields.ts`, `intentMix.ts`,
`ProfileEditPage.tsx`, plus `OrbFan`, `OrbJoystick`, `appBarChrome`, `livingHomeLayout`,
`surfaceTheme`, `vdock/layout`. GitHub reports `mergeable: UNKNOWN` because the branch
predates `#49`–`#51`; it needs updating against `main` before it can land.

Not covered by #48 and still required for the M2 gate: items 5, 6 and 7
(`DashConnectPanel.tsx`, `src/lib/api.ts`, `src/lib/codex.ts`).

## Carry-forward from M3 (not authorised to expand)

M3's exit gate is unsigned. Outstanding:

- **Owner signed-in production smoke** — `docs/operations/M3_SIGNED_IN_SMOKE.md`, needs owner credentials.
- Fabricated-measurement items still open in `IDEAS_BACKLOG.md` §3: #1 and #5 (hash-derived ISRC, genre, mood, BPM), #4 (artwork DPI defaulted to 300), #6 (hardcoded `remoteMinutes = 31`), #7 (`processing-enqueue` reporting jobs completed that never ran), #12 (`stereoWidth` 1.05 undisclosed processing).

## Parked branches (committed, not pushed)

| Branch | HEAD | Contents | Milestone |
|---|---|---|---|
| `feat/audio-loudness-mp3-flac` | `497d4afc` | MPEG/FLAC header probes, Web Audio decode + worker loudness, provenance fields, sample-peak/true-peak correction. Addresses backlog §3 items #2, #3, #8 (M3) and #9 (M4). Gate green: lint, test 161/161, build, e2e 26/26, no-fixtures. | M3 / M4 — **parked**, out of scope under the M2 ruling |

## Verification results (2026-08-04)

```
npm run lint                 — PASS
npm run test                 — PASS 161/161 (45 files)
npm run build                — PASS
npm run test:e2e             — PASS 26/26
npm run check:no-fixtures    — PASS (6 markers absent from dist/)
Production bundle            — index-cQiJuwWY.js, build SHA c79948b64ccb… (live fetch)
```

## Active blockers

| ID | Blocker | Blocks |
|---|---|---|
| — | Dating surfaces live in the production bundle (7 items above) | **M2 exit gate**, standing prohibition compliance |
| — | PR #48 is stale against `main` | Landing items 1–4 |
| — | Owner signed-in production smoke | M3 exit sign-off |
| DR-01…DR-05 | Scope decisions: live, messaging/cam, opportunities/cosmetics, V¢ tipping, watermarking | Full M2 scope lock |
| DR-07 | BS.1770 meter strategy | M4, and any true-peak claim |

## Known contradictions

- Milestone conflict **resolved** by the 2026-08-04 ruling above; `AGENTS.md` corrected.
- `IDEAS_BACKLOG.md` DR-02/DR-03/DR-04 still list messaging, rooms, opportunities and tipping as decision-required, yet those surfaces ship today. M2 cannot fully close until the owner rules on them.
- `PrimaryRail.tsx` / `MobileNav.tsx` still reference `suiteNavRoutes()` but are unmounted; live navigation is `OrbMenu`.
- Integrated loudness is a gated-RMS approximation without K-weighting, labelled estimated everywhere it appears; non-certified until M4.

## Next authorised action

1. Update PR #48 against `main` @ `c79948b6` and land it (items 1–4).
2. Remove the remaining dating surfaces in a follow-up branch: `DashConnectPanel.tsx`, `src/lib/api.ts` dating field mapping, `src/lib/codex.ts` legal copy (items 5–7).
3. Re-audit the deployable bundle and record a clean result here before claiming the M2 gate.
4. **Owner:** rule on DR-02, DR-03 and DR-04 so M2 scope can be locked.
