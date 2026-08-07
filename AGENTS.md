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

**Artist OS Chrome Foundation.** Owner directed 2026-08-06 (evening): pause M4 and
authorise a signed-in Artist OS surface — dim high-fidelity chrome, Orb → left sidebar,
Home as artist profile + album library, Discover hover preview, refined VDock. Studio,
Live, and Market are archived from navigation (freeze-not-delete).

**M4 — Measurement Integrity Foundation is paused.** Resume only by later owner
authorisation. Scope when resumed: BS.1770-4 / EBU R128 meters, true peak by oversampling,
published test vectors, provenance, cross-environment consistency or disclosed difference.

### There is exactly one plan

The parallel "premium suite" phase track remains **withdrawn**. The Masterplan milestone
sequence in [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §9 remains the long-term plan;
this Chrome Foundation is the single owner-authorised interruption of M4, delivered as
sequenced PRs under one milestone — not a second parallel track.

### Law 3 during Artist OS Chrome Foundation

Discovery and shared-shell work are in scope for this milestone by owner authorisation.
Social / live / messaging still receive no unrelated feature growth; Live is archived from
nav. Bug fixes and shared-shell changes remain permitted.

### Exit gates must be executable

A gate written only in prose cannot fail a build. M3's gate — "every visible navigation item
leads to a functional surface" — was satisfied by hand and nothing stopped it regressing.
Where a gate can be expressed as a test, it must be, and the test must cite the gate.
`src/app/routeTruth.test.ts` is the reference: it enforces that M3 gate against the real
navigation model, and it caught two errors the prose version had missed.

### Carry-forward

M1 documentation is landed. M2 removed dating from the production bundle and is verified in
production. M3's navigation gate is now enforced by test. Anything else previously described
as M3 scope is closed; reopen it only by owner authorisation. M4 remains the next audio-core
milestone after this Chrome Foundation exits.

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
