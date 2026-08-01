# COSTS.md

Canonical cost doctrine: [`operations/COST_CONTROL.md`](./operations/COST_CONTROL.md).

**Storefront (Phase 10):** platform Checkout — no Connect transfer. Manual
producer settlement (ACH / Zelle / Vc). See
[`architecture/ADR_PLATFORM_CHECKOUT.md`](./architecture/ADR_PLATFORM_CHECKOUT.md).

**Cost Sentinel (Phase 14):** telemetry ledger `cost_events`, soft monthly USD
cap, free-tier units, kill-switch `edge_flags`, dashboard `/settings/costs`,
daily Edge alert `cost-alert`. See
[`architecture/ADR_COST_SENTINEL_UI.md`](./architecture/ADR_COST_SENTINEL_UI.md)
and [`archive/suite-phases-2026/PHASE14_EXIT_GATE.md`](./archive/suite-phases-2026/PHASE14_EXIT_GATE.md).

**Remote AI (Phase 15):** `ai_mastering` / `ai_metadata` cost features; free-tier
**300 s/month** mastering (`AI_MASTERING_FREE_SECONDS`). Soft telemetry via Cost
Sentinel. See [`architecture/ADR_AI_MASTERING.md`](./architecture/ADR_AI_MASTERING.md).

**AI minute billing (Phase 18):** prepaid ledger `ai_credit_ledger`; Stripe
Checkout Edge `ai-topup` (default **100 min / $10** → **+6000 s**); webhook
`kind=ai_topup` → `fulfill_ai_topup`. Jobs call `recordCost` **and**
`debitAICredits` for prepaid seconds. Hard-stop when free-tier + balance
exhausted. UI `/settings/credits`. See
[`architecture/ADR_AI_MINUTE_BILLING.md`](./architecture/ADR_AI_MINUTE_BILLING.md)
and [`archive/suite-phases-2026/PHASE18_EXIT_GATE.md`](./archive/suite-phases-2026/PHASE18_EXIT_GATE.md).

| Env | Role |
|-----|------|
| `COST_SENTINEL_MONTHLY_CAP_USD` | Soft monthly USD cap (`0` = unlimited) |
| `COST_SENTINEL_FREE_TIER_UNITS` | Free-tier unit allowance |
| `COST_ALERT_EMAIL` | Owner Resend destination |
| `COST_ALERT_SECRET` | Edge auth (fallback: `DIGEST_CRON_SECRET`) |
| `VITE_COST_SENTINEL_MONTHLY_CAP_USD` | Optional client display mirror |
| `GROQ_API_KEY` | Metadata AI (Edge `ai-metadata`) |
| `STRIPE_SECRET_KEY` | Checkout for AI minute packs (`ai-topup`) |
| `STRIPE_WEBHOOK_SECRET` | Fulfill `ai_topup` sessions |
