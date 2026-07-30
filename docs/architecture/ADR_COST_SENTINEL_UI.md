# ADR-028 — Cost Sentinel UI + Budget Enforcement

**Status:** Accepted  
**Date:** 2026-07-30  
**Phase:** 14 (Beta-1A)

## Context

Phases 4–9 shipped a **local log-only** Cost Sentinel (job minutes / storage) and a
read-only `/settings/costs` page. Paid providers remain gated, but there was no
durable telemetry ledger, monthly USD soft-cap, kill-switch, or owner email alert.

## Decision

1. **Ledger:** `cost_events` (user_id, feature, units, usd_estimate) with RLS —
   users read own rows; `is_platform_admin()` reads all. Append via
   `record_cost_event` RPC or local memory store for offline/e2e.
2. **Caps:** `COST_SENTINEL_MONTHLY_CAP_USD` (0 = unlimited) and
   `COST_SENTINEL_FREE_TIER_UNITS`. Alert at ≥ 90% of USD cap.
3. **Kill-switch:** `edge_flags` rows named `feature:{name}:disabled`. Platform
   Bridge refuses processing when flag is enabled. Soft-limit only — no auto-spend.
4. **Alerts:** Edge Function `cost-alert` (daily / cron) aggregates month spend and
   emails owner via Resend; `?dry_run=1` and `npm run cost:alert` for CI.
5. **UI:** `/settings/costs` shows stacked monthly USD bars, recent events table,
   and a ≥90% cap banner. Playwright uses `/__e2e__/cost-sentinel` with seeded data.

## Non-goals (Phase 15+)

- Live Stripe billing webhooks for processing
- Per-feature paywall checkout UI

## Related

- [`COST_CONTROL.md`](../operations/COST_CONTROL.md)
- [`PHASE14_EXIT_GATE.md`](./PHASE14_EXIT_GATE.md)
- Prior: ADR-017 Processing Engine · ADR-022 Visual polish (`/settings/costs`)
