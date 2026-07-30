# Phase 14 Exit Gate — Cost Sentinel UI + Budget Enforcement

**Branch:** `phase14-cost-sentinel`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase13`  
**Authority:** Owner Phase 14 Cost Sentinel prompt

## Adaptations vs prompt

| Prompt | Repo truth |
|--------|------------|
| `cost-alert.ts` | Edge Function `supabase/functions/cost-alert/index.ts` |
| `npm run cost:alert --dry` | `npm run cost:alert` (script passes `--dry`) |
| Live Supabase insert | Memory store locally + RPC `record_cost_event` when session/backend present |

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| `cost_events` + `edge_flags` + RLS | **Pass** | migration `0086` + `.down.sql` |
| `recordCost` collector | **Pass** | `src/platform/costs/recordCost.ts` |
| Budget caps + kill-switch | **Pass** | `budget.ts` · `edgeFlags.ts` · Bridge obeys |
| Dashboard chart + table + 90% banner | **Pass** | `/settings/costs` · e2e fixture |
| Edge `cost-alert` + Resend | **Pass** | EF + dry-run script |
| Unit ≥ 105 · e2e ≥ 17 · perf ≥ 90 | **Pass** | see Validation |
| Docs / ADR | **Pass** | this file + ADR-028 |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint               ✓
npm run test               ✓ 109 tests (≥ 105)
npm run build              ✓
npm run test:e2e           ✓ 17 passed (≥ 17)
npm run perf:audit         ✓ ≥ 90
npm run cost:test          ✓
npm run cost:alert         ✓ “No alert required”
```

## Deliverables

| Stream | Location |
|--------|----------|
| Migration | `supabase/migrations/20260730_0086_cost_sentinel.sql` |
| Collector | `src/platform/costs/recordCost.ts` |
| Dashboard | `src/features/costs/CostSentinelDashboardPage.tsx` |
| Edge alert | `supabase/functions/cost-alert/` |
| ADR | [`ADR_COST_SENTINEL_UI.md`](./ADR_COST_SENTINEL_UI.md) |

## Owner ops (parallel)

- `COST_SENTINEL_MONTHLY_CAP_USD` (e.g. `20`) before prod
- `COST_SENTINEL_FREE_TIER_UNITS`
- `COST_ALERT_EMAIL` + `COST_ALERT_SECRET` (or reuse `DIGEST_CRON_SECRET`)
- Apply migration `0086`; deploy `cost-alert` with `--no-verify-jwt`

## Next

Await owner approval → push → PR **Phase 14 – Cost Sentinel** → merge →
tag `v1.1.0-beta1A-phase14`.
