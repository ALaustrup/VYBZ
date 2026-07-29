# ADR-021 — Distribution readiness rules

**Status:** Accepted  
**Date:** 2026-07-28  
**Phase:** 8 — Distribution Readiness

## Context

Prepare findings cover import readiness. Distributors also need loudness targets, ISRC validity, and artwork DPI/size before packaging. Remote jobs may supply metrics; paid spend must never auto-run.

## Decision

1. Pure rules in `@vybz/domain/releases` (`distributionRules.ts`) — loudness / ISRC / DPI — consumable by portable or remote payloads.
2. Report UI at `/release/:id/distribution` with pass / fail / warnings.
3. Export packaging: store-only ZIP (web download); Desktop DDP **stub** ZIP; Android share-sheet with download fallback. No JSZip dependency.
4. Cost Sentinel emits `FREE_TIER_JOB_MINUTES` when remote job minutes exceed free tier — **log + UI alert only, no auto-spend**.
5. Export SHA-256 recorded via Playwright download e2e → `docs/operations/DISTRIBUTION_EXPORT_HASHES.json`.

## Consequences

- Full DDP image authoring deferred; stub package documents the path.
- Certified loudness meters remain out of scope; portable LUFS estimates are advisory.
- Live paid remote processing stays gated by Cost Sentinel / prepaid policy.

## Non-goals

Auto-charge cloud minutes; certified broadcast loudness; storefront ZIP upload coupling.
