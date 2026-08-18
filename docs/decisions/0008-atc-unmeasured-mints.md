# 0008 — ATC reception bonus and referral rates are Not measured

**Date:** 2026-08-18 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. This record does not edit [`0005`](./0005-airtime-credits.md). It does not rebuild the ATC ledger (0105). It does not change Stripe, LiveKit, Living Mix, or daily-grant / listen-earn / host-consume formulas.

## Context

`0005` listed reception bonus and referral as ATC creation types. Those types exist on `airtime_ledger`. No mint amount was declared. Inventing one would violate the measurement rule.

Airtime Phase 1 (ledger foundation) is already applied. Daily grant, listen earn, and host consume already have declared policy numbers. New-user bootstrap already has declared `3600` / `7` days and is unchanged here.

## Decision

**Reception bonus and referral may not mint ATC until their amounts are declared policy.**

- Creation types stay on the ledger CHECK. They are not deleted.
- Mint amounts read **Not measured**.
- Server and client refuse to mint these types. Refusal is not a zero award.
- Money still cannot become ATC. Listening stays free.
- Station Airtime stays parked and separate.

## Consequences

- `PRODUCT.md` records the refusal.
- `ATC_UNMEASURED_MINTS` and `refuseUnmeasuredMint` live in `src/product/invariants.ts`.
- Additive RPCs return `rates_not_measured` and insert nothing.
