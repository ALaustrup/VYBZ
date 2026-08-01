> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 3 — Credits & Metadata inventory

**Branch:** `suite-genesis` (local until exit gate + push approval)  
**Date:** 2026-07-28  
**Authority:** Master Blueprint Phase 3

## Delivered

| Stream | Location |
|--------|----------|
| Schema + RLS | `supabase/migrations/20260728_0082_release_credits.sql` (+ `.down.sql`) |
| Domain | `packages/domain/credits` — types, `validateCreditDraft`, `validateSplitBudget`, `seedCreditsFromMetadata`, `buildCredit` |
| Data | `packages/data/credits` — local + Supabase repos + RLS contract tests |
| Feature service | `src/features/credits/service.ts` — hybrid repo + mutation queue |
| UI | `src/features/credits/ReleaseCreditsPage.tsx` → `/release/:id/credits` |
| Bridge / metadata | `NewReleasePage` + credits reload call `ensureMetadataCredits` from artist / probe fields |
| Mutation queue | `src/platform/sync/mutationQueue.ts` — `credit.*` + `detectMutationConflict` |
| Unit tests | `packages/domain/credits/src/rules.test.ts`, `mutationQueue.test.ts`, `rls.policy.test.ts` |
| Playwright | `e2e/credits.spec.ts` — add → hard refresh |

## ADR

[`ADR_RELEASE_CREDITS.md`](./ADR_RELEASE_CREDITS.md)

## Follow-ups (not Phase 3 blockers)

1. Formalize `db push` vs raw-SQL workflow (checksum tables + CI guard) — see Opportunity Register / Phase 3 exit gate.
2. Two-user live RLS e2e — contract tests sufficient for now.
3. Multi-account credit confirmation workflow — later Credits increment.
