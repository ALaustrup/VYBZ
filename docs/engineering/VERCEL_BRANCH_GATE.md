# Vercel validation gate

VYBZ uses **Vercel Preview** as the required PR merge gate. GitHub Actions may still run
(perf, e2e, load tests) but **does not block merge** unless you explicitly add those checks
to branch protection later.

## Pipeline

```text
PR opened/updated
  → Vercel Preview build runs `npm run validate`
       lint → typecheck → tests → production build
  → validate failure → Preview build FAILED (no green Preview URL)
  → validate success → Preview deployment READY
  → GitHub **Vercel** status check green
  → merge allowed (when branch protection is configured)
  → merge to main → Vercel Production (same `validate` command)
```

Production deploy uses the same `buildCommand` in [`vercel.json`](../../vercel.json).

## Local

```bash
npm run validate
```

Equivalent to running lint, typecheck, test, and build in sequence.

## GitHub branch protection (`main`)

Configure once in the repository (requires admin):

1. **Settings → Branches → Branch protection rules → Add rule**
2. **Branch name pattern:** `main`
3. Enable **Require status checks to pass before merging**
4. Enable **Require branches to be up to date before merging**
5. Search and select the **Vercel** status check (reported by the [Vercel GitHub integration](https://vercel.com/docs/deployments/git/vercel-for-github) on every Preview deployment)
6. Save

The exact label is usually **`Vercel`**. If multiple Vercel checks appear, require the one
tied to Preview deployment success for this project (`vybz`).

Optional: under **Require deployments to succeed**, add the **Preview** environment if your
Vercel ↔ GitHub integration exposes deployment environments as merge gates.

### Verify on a test PR

1. Open a PR (e.g. PR **#211** — `feat/vercel-validate-gate`).
2. Confirm a **Vercel** check appears on the PR Checks tab.
3. Confirm Preview URL is only available when `npm run validate` succeeded in the Vercel build log.
4. After branch protection is enabled, confirm merge is blocked until **Vercel** is green.

**Applied 2026-08-27:** `main` requires the **Vercel** status check (`strict: true`). Evidence: GitHub branch protection API response on `ALaustrup/VYBZ`.

## What validate does *not* prove

| Proven by `validate` | **Not** proven — requires signed-in production walk |
|----------------------|-----------------------------------------------------|
| TypeScript strict | Auth session flows |
| Unit / gate tests | Live presence / SFU playback |
| Production bundle compiles | Profile persistence after refresh |
| | Generate worker end-to-end (local machine) |

Record production walk results in [`STATE.md`](../../STATE.md). **Not measured** until walked.

## GitHub Actions

[`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) still runs extended checks (e2e,
perf, load, ai-test). These are **supplementary**. Do not add them as required merge checks
unless you intentionally want to block on billing-heavy runners.

If you later need browser automation artifacts, scheduled suites, or multiple environments,
consider [CircleCI](https://circleci.com/docs/guides/pull-requests/) with GitHub Checks as an
additional required status — it reports normal PR checks GitHub can require.

Avoid self-hosted GitHub Actions runners for routine CI unless you accept runner security
overhead (untrusted code executes on your hardware).

## Rollback

If Preview builds become too slow, split `validate` steps only after measuring Vercel build
times. Do not weaken the gate without updating [`src/product/invariants.ts`](../../src/product/invariants.ts)
and [`src/product/validateGate.test.ts`](../../src/product/validateGate.test.ts).
