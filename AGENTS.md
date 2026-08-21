# AGENTS.md

How to work in this repository. If you cannot follow all of it, do not start.

## Read first

1. [`PRODUCT.md`](./PRODUCT.md) — the only authority. VYBZ is the Creator Operating System. Not a sample-pack app. Not music-only.
2. [`src/product/invariants.ts`](./src/product/invariants.ts) — the rules, in code, enforced by tests
3. [`STATE.md`](./STATE.md) — where things actually stand right now
4. [`docs/`](./docs/) — reference material, never authority

There is one authority. If reference material contradicts it, the authority wins and the
reference gets fixed. Documents cannot contradict each other into a stalemate any more,
because only one of them decides anything.

## Rules live in code, not prose

Sixteen gate tests used to grep `AGENTS.md` and `VYBZ_MASTERPLAN.md` for sentences. That made
documents load-bearing: rewording could turn the build red, and nothing detected two documents
disagreeing.

Now every enforceable rule is a value in `src/product/invariants.ts`, and gates import it.

**If you want a new rule, add it there with a test. A rule that no test can enforce is not a
rule — it is a preference, and it belongs in prose where it cannot break a build.**

Every gate registers its id in `GATE_REGISTRY` and asserts its own membership.

## Never delete what exists

Nothing already built gets removed. Surfaces leaving the default experience are **hidden from
navigation** — routes still resolve, code still compiles, imports may be dropped but files
stay. `PRESERVATION` in the invariants file encodes this.

Documentation is the sole exception, and that removal already happened.

## Never fabricate a number

Not in code, not in a document, not in a report to the owner. If you did not measure it, say
you did not measure it. The correct output for an unavailable value is **"Not measured"**.

This applies to your own status claims exactly as much as to the product's analysis results.
"All tests pass" requires having run them.

## Safety

- Never reset, seed or run destructive SQL against a production database
- Never rewrite applied migration history — migrations are additive
- Never put `service_role`, `sbp_`, Stripe, Resend, fal or Groq keys in `VITE_*` or a commit
- Never delete a branch or drop a stash
- Never force push to `main`. On your own unmerged branch, after a rebase, use
  `--force-with-lease` and nothing weaker
- Check `git status` before starting so you do not bury unrelated work
- Do not commit `vizualz/`, `public/**/loop.{mp4,webm}`, `public/backdrop/*.{mp4,webm}`,
  `.agents/`, `skills-lock.json`, or IDE clutter

## Branches

`main` is production and deploys automatically on merge. Work on a descriptive branch
(`feat/…`, `fix/…`, `docs/…`) and open a pull request. Prefer several small reviewable PRs
over one large one.

## Validation

All three must pass before anything is claimed:

```
npm run lint     # tsc --noEmit
npm run test
npm run build
```

Fixture guard: `npm run check:no-fixtures` against `dist/`. E2E: `npm run test:e2e`.
Fixtures are enabled only by `npm run build:e2e`, which produces a **non-deployable** build.

Merged is not delivered. Reachable is not discoverable. A green run proves the code compiles
and nothing more. Use the delivery vocabulary in `PRODUCT.md` §13 and never write "complete".

## Ask before

Pushing · opening or merging a pull request · tagging · any database migration · any
deployment · activating a paid service · installing a dependency · anything irreversible.

You may always, without asking: read, search, run the validation commands, create a branch,
and commit to it.

## Keep STATE.md true

Update it at the end of any unit of work: date, branch, HEAD, what changed, validation
results, what is deployed, what is unverified, and what is blocked. Every completion claim
cites evidence — a SHA, command output, a live response, or a screenshot.

## Stack

Vite 6 · React 18 · TypeScript 5.6 strict · Tailwind 3 · npm · Node 20+.
`npm run dev` → http://localhost:5173. Requires `VITE_SUPABASE_URL` and
`VITE_SUPABASE_ANON_KEY`; without them the app hard-stops by design.

Domain code never imports `@tauri-apps/*` or `@capacitor/*` — go through the Platform Bridge
in `src/platform/`.
