# Cost Control

> Doctrine for Suite spend. Mirror: [`../architecture/COST_INVENTORY.md`](../architecture/COST_INVENTORY.md).

## Ten cost laws

1. No unbounded provider call.
2. Paid jobs: **estimate → user approval → reserve → execute → reconcile**.
3. Optional providers default `disabled` or `free_only` (fal: `prepaid_only` only).
4. Prefer browser → Bridge/Engine → Edge → free external → paid external.
5. Deterministic code before AI for validation/measurement.
6. No agent may purchase vendor subscriptions or raise hard budgets.
7. Degrade to local/templates when caps hit — never silent overspend.
8. One reservation per paid job; no recursive agent loops that rebill.
9. Vc tips ≠ obscuring dollar prices of professional processing.
10. Weekly Cost Sentinel report before raising any hard_cap.

## ProviderMode

`disabled` | `free_only` | `prepaid_only` | `hard_cap` | `manual_approval` | `production`

## Cost Sentinel (planned)

Track quotas · estimate · enforce user/feature/provider caps · degrade · weekly reports ·
block recursive jobs. Precursor models in Phase 1; full Sentinel Phase 9.

## Reservation flow

```text
estimate → show user → approve → reserve ledger row → execute → reconcile / refund unused
```

Owner secrets still needed for alpha: `FAL_KEY`, `GROQ_API_KEY`, migration `0080`,
redeploy `stripe-webhook`. See [`VENDOR_REGISTER.md`](./VENDOR_REGISTER.md).

## Storefront manual payouts (platform checkout)

Pack sales charge the **platform** Stripe account. Producers are settled outside
Stripe (ACH / Zelle / Vc debit). Track `storefront_orders.settlement_status`
(`pending_manual` → `settled_off_platform`). Platform retains ~10%
(`application_fee_cents`). No automated Connect transfer — see
[`ADR_PLATFORM_CHECKOUT.md`](../architecture/ADR_PLATFORM_CHECKOUT.md).
