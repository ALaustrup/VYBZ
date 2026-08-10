# AGENTS.md

> **Authority 2 of 5.** How to work in this repository. Short on purpose — if you cannot
> follow all of it, do not start.

## Instruction precedence

1. [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) — product doctrine and the seven laws
2. This file — operating rules
3. [`ARCHITECTURE.md`](./ARCHITECTURE.md) — verified architecture
4. [`STATUS.md`](./STATUS.md) — the current evidence-backed checkpoint
5. [`IDEAS_BACKLOG.md`](./IDEAS_BACKLOG.md) — approved, deferred, frozen, decision-required

Anything under `docs/archive/` is **historical and never authoritative**. Anything else
under `docs/` is reference, not law. If a reference document contradicts an authority, the
authority wins and the reference gets fixed.

## Read before you work

Read `STATUS.md` first — it tells you the branch, HEAD, production SHA, and the one
authorised milestone. Then read the milestone's section in the Masterplan. Then inspect the
code you intend to change. Never edit a file you have not read.

Before touching any route, read the authentication gate in `src/App.tsx` and
`ARCHITECTURE.md` §3.

## Current authorised milestone

**No open Masterplan milestone.** **M9 — VDock Completion** closed **2026-08-10** as
Masterplan §12 **DEPLOYED BUT UNVERIFIED** (executable `m9VdockGate` passes; Android
call-interrupt smoke still **Not measured**). **M7** and **M8** deepen are **parked**
(owner **2026-08-10** after production smoke). Authorised OR feature deepen is **parked**
the same day — further OR work needs re-authorisation. Do not begin **M10** until the
owner authorises it.

**Suite visual polish shipped (not a Masterplan milestone):** restrained cyber/synthwave
atmosphere, ToolWorkbench density, rail chrome, light Home / Analyzer enhance —
[PR #140](https://github.com/ALaustrup/VYBZ/pull/140) merged **2026-08-10** (`46934283`).
Further polish needs owner re-authorisation. Does not reopen M7–M9 contracts. Instrument
Creator (VST3) stays parked. OR-021–OR-022 and OR-024–OR-025 remain parked. Law 3 still
bans dating and generic social growth.

### Positioning (Masterplan §1)

VYBZ helps AI-assisted creators finish release-ready work. It does not fight AI music.
Law 1 still governs every detector and claim.

### Closed / parked tracks (post-smoke)

0. **Suite visual polish (shipped)** — PR #140 @ `46934283`; continuous deepen parked
   unless re-authorised.

1. **M9 VDock (closed)** — dry playback, signal disclosure, compare preview, bridge
   playback caps / MediaSession / lifecycle / Android AudioManager focus remain frozen
   behind stable interfaces (Law 5). Extend via versioned contracts only.
2. **M8 (parked)** — assemble + rule-cited findings shipped; deepen parked.
3. **M7 (parked)** — Translation Lab streaming / device / codec previews shipped; deepen
   parked.
4. **OR deepen (parked)** — OR-019 V1, OR-020, OR-023, OR-026–OR-031 as previously shipped
   or smoke-verified; no continuous polish track. Re-auth required for new OR scope.

Bugfixes and shared-shell changes remain allowed. Do not begin **M10** until named.

### Shipped authorisations (no continuous deepen)

- **OR-019 Stem Maker V1** — 2026-08-08; V2 parked.
- **OR-023 Alpha invite keys** — 2026-08-08.
- **Analyzer intake desk** — 2026-08-09.
- **OR-026–OR-028** — shipped; Correct deepen closed unless re-authorised.
- **OR-020 / OR-029 / OR-030 / OR-031** — parked after owner smoke **2026-08-10** unless
  re-authorised.

Live/messaging receive **no new feature work** (bugfixes / shared-shell only).
Premium-suite phase track remains withdrawn. The Masterplan §9 sequence is the only plan.

### There is exactly one plan

The parallel "premium suite" phase track remains **withdrawn**. The Masterplan milestone
sequence in [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §9 is the only plan.

### Law 3 + discovery

Breadth is retained — VYBZ remains an operating system. **OR-031** discovery V1 shipped
and is **parked** for further networking deepen unless re-authorised. Live, messaging,
and rooms receive **no new feature work** beyond bugfixes and shared-shell changes.
Dating / romantic / meetup / swipe matching remain permanently out of scope.

### Exit gates must be executable

A gate written only in prose cannot fail a build. Where a gate can be expressed as a test,
it must be, and the test must cite the gate. References: `src/app/routeTruth.test.ts` (M3),
`src/features/prepare/m4MeasurementGate.test.ts` (M4), `src/features/prepare/m5AnalysisGate.test.ts` (M5),
`src/features/prepare/m6CorrectionGate.test.ts` (M6), `src/features/prepare/m7TranslationGate.test.ts` (M7),
`src/features/prepare/m8AssemblyGate.test.ts` (M8), `src/features/prepare/m9VdockGate.test.ts` (M9).

### Carry-forward

M1–M4 closed as previously recorded (native desktop BS.1770 still approx-pending where
disclosed). M5–M6 closed; **M7–M8 deepen parked**; **M9 VDock closed** (DEPLOYED BUT
UNVERIFIED). No Masterplan track open. **Suite visual polish authorised** (not a
Masterplan milestone). Do not begin M10 until the owner authorises it.

## Safety rules

- Never reset or seed a production database. Never run destructive SQL.
- Never rewrite applied migration history. Migrations are additive.
- Never expose secrets. `service_role`, `sbp_`, Stripe secret, Resend, fal and Groq keys
  never go in `VITE_*` or in a commit.
- Never overwrite unrelated uncommitted work. Check `git status` before you start.
- Never force push. Never delete a branch, tag or stash.
- Preserve rollback paths. Prefer additive change.
- Do not commit: `vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`,
  `.agents/`, `skills-lock.json`, IDE clutter.

## Law 1 applies to you

Never write a number you did not measure — in code, in a document, or in a report to the
owner. If you did not verify it, say you did not verify it. If a measurement is unavailable,
the correct output is "Not measured". This applies to your own status claims as much as to
the product's analysis results.

## Branch policy

`main` is production; Vercel deploys it automatically on merge. Work on a descriptive
branch (`docs/…`, `fix/…`, `feat/…`) and open a pull request. One milestone per branch;
prefer several small reviewable PRs over one large one.

## Preservation

Before any removal, record the starting branch, commit and working-tree state, confirm no
unrelated work is staged, and ensure the removed code is recoverable from Git history.
Frozen code stays in the tree, is imported by nothing, and must not enter a production
bundle.

## Validation

Correctness gate — all three must pass:

```
npm run lint     # tsc --noEmit
npm run test
npm run build
```

E2E: `npm run test:e2e`. Fixture guard: `npm run check:no-fixtures` must pass against
`dist/`. Fixtures are enabled only by `npm run build:e2e`, which produces a
**non-deployable** build.

Delivery gate — before claiming anything is done, satisfy every row of Masterplan §12 and
declare one of the permitted delivery states. **Never write "complete."** Merged is not
delivered; reachable is not discoverable; a green CI run proves only that the code compiles.

## Authorisation

You may, without asking: read, search, run the validation commands, create a branch, commit
to that branch.

You must ask the owner first for: pushing, opening or merging a pull request, creating or
moving a tag, any database migration, any deployment, activating any paid service,
installing new dependencies, and any destructive or irreversible action.

## Updating STATUS.md

`STATUS.md` is the single operational checkpoint and must never go stale. Update it at the
end of any unit of work with: date, branch, exact HEAD, production SHA, current milestone,
last completed operation, working-tree state, deployment state, production-verification
state, blockers, next authorised action, latest verification results, and known
contradictions. Every completion claim cites evidence — a SHA, a command output, a live
response, or a screenshot.

## Standing prohibitions

- No dating, romantic, love, meetup or swipe functionality. Permanently out of scope.
- No multi-human collaboration work. Frozen.
- No claim, in code or copy, that VYBZ distributes to DSPs. It does not.
- No new abstraction without a current consumer.
- Domain code never imports `@tauri-apps/*` or `@capacitor/*` — use the Platform Bridge.
- Do not set `VITE_FEATURE_BUNNY_AUDIO=on`.
- Do not tag `Beta-1A`.
- Park new ideas in `IDEAS_BACKLOG.md`. A backlog entry is not authorisation to build it.

## Stack

Vite 6 · React 18 · TypeScript 5.6 strict · Tailwind 3 · npm · Node 20+.
`npm run dev` → http://localhost:5173. Client env requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`; without them the app hard-stops by design.
