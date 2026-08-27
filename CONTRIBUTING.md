# Contributing to VYBZ

Astra Matrix, Inc. — internal and invited contributors. Public drive-by PRs are
not a support channel.

## Branch policy

```text
main                    ← production
  ← suite-genesis       ← Suite Genesis integration (Phase 0+)
      ← phase/01-…      ← phase branches
      ← feature/…       ← single-issue features
```

- Prefer draft PRs into `suite-genesis` (then `main`) after Suite Genesis begins.
- Do not commit secrets, large media masters, or `service_role` keys.
- Do not amend shared history or force-push `main`.

## Pull requests

1. One coherent change set; link the phase or Opportunity Register id when relevant.
2. Describe **why**, risk, and cost/provider impact.
3. Update docs when routes, tables, Edge Functions, or product copy change.
4. Include loading / empty / error / degraded states for user-facing work.

## Testing

- Correctness gate: `npm run validate` (lint → typecheck → test → production build). Vercel Preview runs the same command — see [`docs/engineering/VERCEL_BRANCH_GATE.md`](docs/engineering/VERCEL_BRANCH_GATE.md).
- Unit (Vitest), component (RTL), e2e + a11y smoke (Playwright: `npm run test:e2e`).
- `npm run check:no-fixtures` must pass — test fixtures may never reach a production bundle.
- Migrations: RLS policy tests for any new user-scoped table.

## Documentation

- One authority: [`PRODUCT.md`](./PRODUCT.md). Enforceable rules: `src/product/invariants.ts`.
- How to work here: [`AGENTS.md`](./AGENTS.md). Current state: [`STATE.md`](./STATE.md).
- Everything under `docs/` is reference, not law.
- Archive under `docs/archive/` is never authoritative.

## Migrations

- Additive only; no database reset; one Supabase project.
- Destructive changes require backup + human approval + rollback notes.
- Regenerate types when schema changes (`db:types` planned).

## Security

- Follow [`SECURITY.md`](./SECURITY.md).
- Never enable Bunny as media origin.
- Watermark / Sentinel claims must match demonstrated capability.
- Webhooks must verify signatures.

## Cost policy

- No unbounded provider calls.
- Paid jobs: estimate → approve → reserve → execute → reconcile.
- Optional providers default `disabled` / `free_only`.
- Agents may not purchase subscriptions or raise hard budgets.

## Accessibility

- Keyboard paths for primary flows.
- Respect `prefers-reduced-motion`.
- Phase 1+ a11y smoke in CI.

## Commit conventions

- Imperative mood; focus on why.
- Do not mention “Suite Genesis” in every commit — only when doctrine or phase boundary changes.
- Never skip hooks unless the owner explicitly requests it.
