# COSTS.md

Canonical cost doctrine: [`operations/COST_CONTROL.md`](./operations/COST_CONTROL.md).

**Storefront (Phase 10):** platform Checkout — no Connect transfer. Manual
producer settlement (ACH / Zelle / Vc). See
[`architecture/ADR_PLATFORM_CHECKOUT.md`](./architecture/ADR_PLATFORM_CHECKOUT.md).

**Cost Sentinel (Phase 14):** telemetry ledger `cost_events`, soft monthly USD
cap, free-tier units, kill-switch `edge_flags`, dashboard `/settings/costs`,
daily Edge alert `cost-alert`. See
[`architecture/ADR_COST_SENTINEL_UI.md`](./architecture/ADR_COST_SENTINEL_UI.md)
and [`architecture/PHASE14_EXIT_GATE.md`](./architecture/PHASE14_EXIT_GATE.md).

**Remote AI (Phase 15):** `ai_mastering` / `ai_metadata` cost features; free-tier
**300 s/month** mastering (`AI_MASTERING_FREE_SECONDS`). Soft telemetry only —
paid minutes deferred to Phase 16. See
[`architecture/ADR_AI_MASTERING.md`](./architecture/ADR_AI_MASTERING.md).

| Env | Role |
|-----|------|
| `COST_SENTINEL_MONTHLY_CAP_USD` | Soft monthly USD cap (`0` = unlimited) |
| `COST_SENTINEL_FREE_TIER_UNITS` | Free-tier unit allowance |
| `COST_ALERT_EMAIL` | Owner Resend destination |
| `COST_ALERT_SECRET` | Edge auth (fallback: `DIGEST_CRON_SECRET`) |
| `VITE_COST_SENTINEL_MONTHLY_CAP_USD` | Optional client display mirror |
| `GROQ_API_KEY` | Metadata AI (Edge `ai-metadata`) |
