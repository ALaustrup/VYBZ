# ADR-024 — Premium UI refresh (Phase 11)

**Status:** Accepted  
**Date:** 2026-07-29  
**Phase:** 11 — Performance & Hardening + Premium UI

## Context

Phase 10 shipped storefront. Stakeholders require a next-gen dark/vibrant shell
so later Suite features inherit one look. Prompt suggested `packages/ui` + shadcn;
this repo already has hand-rolled [`src/components/ui`](../../src/components/ui)
and Suite chrome — a full extract would blow the phase budget.

## Decision

1. Evolve tokens in place: [`tokens.css`](../../src/design/tokens.css) +
   [`tokens.v2.ts`](../../src/design/tokens.v2.ts) (8-step accent, glass vibrant,
   motion 120/240).
2. Add `Button variant="glass"` and `FormField`; animate PrimaryRail with Framer
   + `useReducedMotion`.
3. Dark-only. No theme switcher. No Lottie dependency.
4. Desktop/Android inherit via shared CSS/React — no native redesign this phase.

## Consequences

- Legacy Music Hub pages may still look older until touched.
- Contrast must stay WCAG 2.1 AA after glass mats.

## Non-goals

shadcn extraction; light theme; business features.
