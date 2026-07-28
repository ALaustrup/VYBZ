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

- Lighthouse / Web Vitals on landing + artist page after visual changes.
- Vercel analytics optional; do not add paid APM on Hobby budgets.

See [`PWA.md`](./PWA.md), [`BROWSER_COMPUTE.md`](./BROWSER_COMPUTE.md).
