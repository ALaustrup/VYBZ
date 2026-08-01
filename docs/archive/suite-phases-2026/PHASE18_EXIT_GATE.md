> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 18 Exit Gate — Cost-Minute Billing (AI minutes)

**Branch:** `phase18-billing`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase17`  
**Authority:** Owner Phase 18 Cost-Minute Billing prompt

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Schema `0089` `ai_credit_ledger` + `ai_topups` | **Pass** | migration + `.down.sql` |
| Edge `ai-topup` Checkout Session | **Pass** | `supabase/functions/ai-topup` |
| Webhook `kind=ai_topup` → +6000 s | **Pass** | `fulfill_ai_topup` in stripe-webhook |
| `recordCost` + `debitAICredits` after AI job | **Pass** | `aiMasterService` / Edge `ai-mastering` |
| UI `/settings/credits` + master banner &lt;120 s | **Pass** | `AiCreditsPage` · `ReleaseMasterPane` |
| Unit: purchase / debit / hard-stop | **Pass** | `aiCredits.test.ts` + mastering cost tests |
| Docs ADR-032 + COSTS.md | **Pass** | this file + `ADR_AI_MINUTE_BILLING.md` |
| Unpushed until owner approval | **Pass** | |

## Validation (2026-07-30 local)

```text
npm run lint       ✓
npm run test       ✓ 135 tests (≥ 135)
npm run build      ✓
npm run test:e2e   ✓ 24 passed (≥ 22) — ai-credits + master banner
```

## Owner follow-up (post-merge)

1. Apply migration `0089` on prod.
2. Deploy `ai-topup` (`--no-verify-jwt`) + redeploy `stripe-webhook` + `ai-mastering`.
3. Optional: create Stripe Product/Price in Dashboard (code uses `price_data` inline).
4. Live smoke: `/settings/credits` → Checkout → ledger +6000 → master debit.
