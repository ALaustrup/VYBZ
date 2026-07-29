# Performance

## Targets

- First meaningful Suite shell paint fast on mid mobile.
- VDock / AudioBus stay smooth during navigation — no nested tall sheets in `.vdock-shell`.
- Overlays via `OverlayPortal` on `document.body`.
- React vendor chunk: keep `react` / `react-dom` / `scheduler` / `react-router` shared.

## Practices

1. Prefer Storage CDN for loops and site visuals — not giant git assets.
2. Lazy-route heavy Studio / Prepare / CoverLab surfaces when they land.
3. Avoid unbounded list renders; virtualize long catalogs later if needed.
4. Deterministic browser analysis before calling paid AI.
5. LiveKit: hard-cap new sessions rather than melting the SFU budget.
6. No decorative fal generation; stills are prepaid and intentional.

## Measure

- **Phase 11 gate:** `npm run perf:audit` (Lighthouse ≥ 90 on `/perf-audit.html` +
  `/perf-orders.html`; desktop + mobile).
- **Bundle:** `npm run perf:bundle` → `dist/stats.html`.
- **Load:** `npm run perf:load` / K6 — pack page + checkout Edge, p95 < 800 ms.
- SPA `?audit=1` reduces DynamicBackground FX for profiling.
- Vercel analytics optional; do not add paid APM on Hobby budgets.

See [`../architecture/ADR_PERF_BUDGET.md`](../architecture/ADR_PERF_BUDGET.md),
[`PWA.md`](./PWA.md), [`BROWSER_COMPUTE.md`](./BROWSER_COMPUTE.md).
