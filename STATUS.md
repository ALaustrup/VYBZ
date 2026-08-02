# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-01
**Branch:** `main`
**HEAD:** `04c63be6` (M3 verification docs)
**Current milestone:** **M3 — Information architecture & truthful shell** (owner-authorised)

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `27ad580b99aaa0dd1d4f1e7188081754cf069675` | `git rev-parse origin/main` |
| Alias | https://vybz.cloud | HTTP 200 |
| Deployed bundle | `/assets/index-Car-LCS8.js` | live fetch 2026-08-01 |
| Deployment current | **YES** — bundle tracks #45 code + STATUS doc deploy | live fetch 2026-08-01 |
| Build SHA footer (landing) | `27ad580` | browser CDP `data-testid="build-sha"` 2026-08-01 |

## Last completed operations

1. **PR [#45](https://github.com/ALaustrup/VYBZ/pull/45) merged** — M3 final chrome: WallAlerts + RoomsPage Nexus tokens.
2. **Expanded E2E** — `smoke` + `prepare` + `distribution` specs: **7/7 PASS** (fixture build).
3. **Production bundle audit** — no `__e2e__` markers; `Not measured` present; no fabricated `-14 LUFS` pattern.
4. **`docs/operations/M3_SIGNED_IN_SMOKE.md`** — owner checklist for M3 exit gate.

## Working tree

Clean on `main` @ `04c63be6`. Untracked: `.cursor/settings.json` (do not commit).

## Production verification

| Check | Result | Date |
|---|---|---|
| `/__e2e__/*` fixtures absent from production bundle | **PASS** | 2026-08-01 (bundle grep) |
| `check:no-fixtures` on deployable `dist/` | **PASS** — 6 markers absent | 2026-08-01 |
| Anonymous landing page loads | PASS (HTTP 200) | 2026-08-01 |
| Build SHA in landing footer | **PASS** — `27ad580` matches HEAD | 2026-08-01 |
| Distribution loudness shows "Not measured" not fabricated LUFS | **PASS in bundle** | 2026-08-01 |
| `processing-enqueue` live (v1 ACTIVE, `verify_jwt: true`) | **PASS** | 2026-08-01 Supabase MCP |
| Prepare + distribution + smoke (fixture E2E) | **PASS** — 7/7 | 2026-08-01 |
| Prepare Nexus on production (signed-in) | **Not verified live** | — |
| **Authenticated experience end-to-end on production** | **NEVER OBSERVED** | — |

## M3 exit gate review (Masterplan §10)

| Criterion | Status | Evidence |
|---|---|---|
| Ordinary user understands the product | **Partial** — landing/auth/prepare copy rewritten; Nexus IA on primary routes + modals | PRs #36–#45 |
| Every visible nav item → functional surface | **PASS in OrbMenu** — `navGroups()` lists only working surfaces; legacy `/spark`, `/opportunities`, `/social` are deep-link only (not in orb nav) | `navModel.ts`, `OrbMenu.tsx` |
| No fabricated measurement remains | **PASS in code** | #37, `distributionTruth.test.ts`, production bundle audit |
| Production visibly reflects new direction | **PASS** — bundle `index-Car-LCS8.js` deployed | live fetch 2026-08-01 |

**Remaining `glass-panel` in tree:** `LivingHomePage.tsx` only (unmounted).

**M3 delivery state:** **Not delivered** — owner signed-in smoke test pending (`docs/operations/M3_SIGNED_IN_SMOKE.md`).

## Active blockers

| ID | Blocker | Blocks |
|---|---|---|
| DR-01…DR-05 | Scope decisions: live, messaging/cam, opportunities/cosmetics, V¢ tipping, watermarking | M2 scoping |
| DR-06 | Dating onboarding gate | **Partially resolved** — gate removed in #37; `RoleIntentOnboarding.tsx` still in tree, unmounted |
| DR-07 | M4 BS.1770 meter strategy | M4 |
| — | Signed-in production E2E never observed | M3 exit gate sign-off |

## Known contradictions

- `PrimaryRail.tsx` / `MobileNav.tsx` still render `suiteNavRoutes()` (includes placeholder suite entries) but are **not mounted** in `SuiteShell` — live nav is `OrbMenu` → `navGroups()`.

## Next authorised action

1. **Owner:** run `docs/operations/M3_SIGNED_IN_SMOKE.md` on https://vybz.cloud and record results in this file.
2. Owner M3 exit sign-off **or** authorise **M2** (product isolation + DR-01…DR-05 decisions).

## Latest verification results

```
npm run lint   — PASS (2026-08-01, feat/m3-final-chrome @ 414361d6)
npm run test   — PASS 145/145 (2026-08-01)
npm run build  — PASS (2026-08-01)
npm run check:no-fixtures — PASS (2026-08-01)
npm run test:e2e -- e2e/smoke.spec.ts e2e/prepare.spec.ts e2e/distribution.spec.ts — PASS 7/7 (2026-08-01)
Production bundle — index-Car-LCS8.js (2026-08-01 live fetch)
Production bundle audit — no __e2e__, Not measured present, no fabricated LUFS (2026-08-01)
Build SHA footer — 27ad580 (2026-08-01 browser CDP)
processing-enqueue — v1 ACTIVE verify_jwt=true (2026-08-01 Supabase MCP)
```
