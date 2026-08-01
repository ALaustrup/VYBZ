# STATUS

> **Authority 4 of 5.** The single operational checkpoint. Every claim cites evidence.
> Update this at the end of any unit of work. If it is stale, it is wrong.

**Date:** 2026-08-01
**Branch:** `docs/m1-doctrine-refoundation`
**Base:** `main` @ `53ab9ef90dfd8bf88feb7657184abc7ecf2e1d8b`
**Current milestone:** **M1 — Doctrine refoundation** (documentation only)

---

## Production

| Item | Value | Evidence |
|---|---|---|
| Production SHA | `53ab9ef90dfd8bf88feb7657184abc7ecf2e1d8b` | Vercel deployment `dpl_6AJZUxDyLPAuzQSvYDPjKEqMW7k5`, `target: production`, `state: READY` |
| Alias | https://vybz.cloud | HTTP 200 |
| Deployed bundle | `/assets/index-CjRLJawG.js` (911,432 chars) | live fetch 2026-08-01 |
| Deployment current | **YES** — production equals `main` | two independent sources: Vercel API and bundle fingerprint |

**Independent corroboration.** The deployed bundle contains none of `__e2e__`,
`mastering-e2e-fixture`, `collab-e2e`, `cost-sentinel-e2e`, `ai-credits-e2e`. Before the
D1 merge all five were present. The change in bundle content matches exactly what D1
predicts, confirming the deployed SHA without relying on Vercel's own report.

## Last completed operations

1. **Stage 1 forensic intake** — read-only inspection of git, Vercel, live production,
   routes, flags, 99 migrations, 30 edge functions, three native shells, all analysis
   sources, and 145 markdown files. Produced five classification matrices.
2. **Stage 2 refoundation proposal** — five-document authority, archival structure, dating
   removal manifest, collaboration freeze boundary, feature disposition, milestone mapping,
   nineteen owner decisions, destructive-action list.
3. **D-1 — PR [#30](https://github.com/ALaustrup/VYBZ/pull/30) merged** as an out-of-band
   security fix. All twelve checks passed. Merge commit `53ab9ef9`.
4. **D-2 — PR [#31](https://github.com/ALaustrup/VYBZ/pull/31) closed** as superseded by M3.
   Its `quality` check was failing. Branch `feat/d2-landing-readiness-entry` @ `049cf165`
   preserved.
5. **D-3** — `docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md` landed on `main`
   via #30 and is the M0 evidence artifact.
6. **Stage 3 in progress** — this document set.

## Working tree

Clean apart from the M1 documentation changes on this branch and one pre-existing untracked
file, `.cursor/settings.json`.

**Two stashes remain uninspected** — `stash@{0}` "ops cutover docs WIP" (on `main`) and
`stash@{1}` "temp hash drift" (on `suite-genesis`). Tracked as DR-09.

## Production verification

| Check | Result | Date |
|---|---|---|
| `/__e2e__/*` fixtures absent from the production bundle | **PASS** | 2026-08-01 |
| Anonymous landing page loads | PASS (HTTP 200) | 2026-08-01 |
| Security headers (CSP, HSTS, X-Frame-Options, nosniff) | PASS | 2026-08-01 |
| **Authenticated experience** | **NEVER OBSERVED** | — |
| Prepare → Findings flow, end to end | **NEVER OBSERVED** | — |

The signed-in product has never been exercised against production by anyone. This is the
single largest evidence gap and is owned by M3.

## Active blockers

| ID | Blocker | Blocks |
|---|---|---|
| DR-01…DR-05 | Scope decisions: live streaming, messaging/cam/rooms, opportunities and cosmetics, V¢ tipping, watermarking (~7,800 lines undecided) | M2 scoping |
| DR-06 | Onboarding gate — `App.tsx` forces `RoleIntentOnboarding`; removing dating requires deciding its replacement | M2 |
| DR-07 | M4 strategy — build or integrate a BS.1770 meter | M4 |
| — | Owner approval of the M1 documentation PR | M2 start |

## Known contradictions

None between the five authorities as of this commit. Previously:

- `VYBZ_MASTERPLAN.md` claimed Prepare was "Not started", Tauri "Not present" and
  `packages/` absent, while `AGENTS.md` recorded Phases 2–19 complete. **Resolved** — the
  Masterplan is rewritten and no longer carries state.
- Seventeen documents claimed supreme or canonical authority. **Resolved** — reduced to
  five; the rest are reference or archived.
- `docs/DOCUMENTATION_MANIFEST.md` defined a six-tier hierarchy contradicting the AGENTS
  conflict order. **Resolved** — deleted; the document map now lives in `ARCHITECTURE.md` §16.
- `README.md` said "Next engineering: Phase 1.5". **Resolved.**

**Outstanding, tracked not resolved:** fifteen technical-integrity defects listed in
[`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) §3, nine of which are fabricated values reaching
users in production today. They are documented and scheduled but **not yet fixed** — M3 and
M4 own them.

## Next authorised action

Owner review of the M1 documentation pull request. Nothing else is authorised.

After M1 merges, the next decision point is the DR-01…DR-06 block, which must be answered
before M2 can be scoped.
