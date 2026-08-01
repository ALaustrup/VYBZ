# ADR-032 — AI Minute Billing (Cost-Minute)

**Status:** Accepted  
**Date:** 2026-07-30  
**Phase:** 18 (Beta-1A)

## Context

Phase 15 shipped AI mastering with soft Cost Sentinel telemetry and a
**300 s/month** free tier. Monetising those seconds requires prepaid minutes
without inventing a new wallet (Vc remains social/cosmetics).

## Decision

1. **Ledger:** `ai_credit_ledger` (`delta_seconds`, `usd`, `reason`) — purchase
   inserts **+6000** s (100 min / $10 default); jobs insert **−seconds** via
   `debitAICredits` / `admin_debit_ai_credits`.
2. **Checkout:** Edge `ai-topup` creates Stripe Checkout (`price_data`, no Price
   ID required). Metadata `kind=ai_topup`. Webhook calls `fulfill_ai_topup`.
3. **Gate:** `assertAiMasteringAllowed` allows `freeLeft + prepaidBalance`.
   Hard-stop when both exhausted (existing kill-switch still wins).
4. **UI:** `/settings/credits` — balance, Buy pack, ledger. Master page banner
   when prepaid balance **&lt; 120 s**.
5. **Separation:** AI minutes ≠ Vc (`mod_points`). Distinct ledger and Checkout kind.

## Non-goals

- Subscriptions / metered Stripe Billing
- Connect transfers for AI packs
- iOS IAP (Phase 19+)

## Related

- [`PHASE18_EXIT_GATE.md`](../archive/suite-phases-2026/PHASE18_EXIT_GATE.md)
- [`COSTS.md`](../COSTS.md)
- Prior: ADR-028 Cost Sentinel · ADR-029 AI Mastering
