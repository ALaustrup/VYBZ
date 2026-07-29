# ADR-025 — Performance budget (Phase 11)

**Status:** Accepted  
**Date:** 2026-07-29  
**Phase:** 11 — Performance & Hardening + Premium UI

## Context

Need measurable perf gates before more Suite surfaces land. Lighthouse on a
full atmospheric SPA is noisy; Edge checkout latency matters for storefront.

## Decision

1. **`npm run perf:audit`** — Lighthouse (desktop + mobile) on static premium shells:
   - `/perf-audit.html` (brand landing token shell)
   - `/perf-orders.html` (Orders / Pending manual shell)  
   Assert **performance ≥ 90** and **best-practices ≥ 90**.  
   Full SPA category scores remain tracked via bundle visualizer + e2e; `?audit=1`
   still reduces DynamicBackground FX for SPA profiling.
2. **`npm run perf:bundle`** — `rollup-plugin-visualizer` → `dist/stats.html` (gitignored).
3. **`npm run perf:load`** / K6 — 100 VU ramp against pack page + `storefront-checkout`;
   **p95 http_req_duration < 800 ms**.
4. CI jobs `perf-audit` and `load-test` alongside `quality`.

## Consequences

- CI depends on public `vybz.cloud` + Supabase Edge for load-test.
- Heavy Studio routes are out of the Lighthouse gate until lazy-loaded further.

## Non-goals

Paid APM; rewriting vendor chunk rules that keep React co-located.
