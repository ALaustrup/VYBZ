# ADR-022 — Visual polish & Market cutover

**Status:** Accepted  
**Date:** 2026-07-28  
**Phase:** 9 — Polish & Visual

## Context

Storefront / CoverLab visual WIP lived isolated from Suite routes. Brand tokens already defined Market violet and CoverLab magenta; Cost Sentinel tracked usage without a dashboard. Product `/sentinel` must remain watermark/security — not cost UI.

## Decision

1. Wire Sample Pack Storefront behind `FLAGS.storefront` in `App.tsx` (`/tools/packs`, `/pack/:slug` public shell); `/market` redirects when flag on.
2. Keep Studio → Compose backdrop handoff and visual-generate path as CoverLab surfaces.
3. Final polish tokens: `MOTION_MS`, `SHADOW`, `ACCENT_WASH` + CSS wash utilities; prefer existing Suite glass / abyss language.
4. Cost Sentinel read-only UI at `/settings/costs` (not `/sentinel`).
5. Extend a11y smoke: Prepare landmarks + focusable CTA; Cost Sentinel path soft-check.

## Consequences

- Prod should keep `VITE_FEATURE_STOREFRONT=off` until migration `0080` + secrets + webhook redeploy are confirmed.
- Desktop/Android unchanged at Bridge layer; pages remain web APIs.
- Full axe-core suite deferred; smoke a11y is the Phase 9 gate.

## Non-goals

Replacing product Sentinel; paid auto-spend; Spark/Living Home revival.
