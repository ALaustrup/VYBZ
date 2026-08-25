# 0005 — Airtime Credits (ATC)

> **NOT PRODUCT IDENTITY.** Read [`PRODUCT.md`](../../PRODUCT.md). ATC remains the hosting clock for live. “Live mix remains the product” below is historical — live is a capability.

**Date:** 2026-08-17 · **Status:** Accepted (capability) · **Decided by:** owner

Decision records are append-only. This record does not edit [`0004`](./0004-live-mix-streaming-platform.md). Live mix remains the product. This record replaces the sentence in PRODUCT.md v3 that said hosting is free.

## Context

`0004` made VYBZ a live mix audio streaming platform. Hosting had no scarce resource, so the network had no reason to listen. Station Airtime (`CURRENCY` / `STATION`) is a parked prompt-answer currency and must not be reused as a hosting gate.

The owner directed a closed-loop attention commons: the scarce resource required to broadcast is earned primarily by giving verified attention.

## Decision

**Airtime Credits (ATC) are the only gate on hosting. Listening is always free.**

- 1 ATC = 1 second of host publish time.
- Daily free grant = 7200 ATC, overwritten each calendar day in the user's stored timezone (UTC fallback). It does not stack.
- Earned ATC is the only path beyond the free grant.
- Two balances: `daily_free_remaining` and `earned_balance`. Consume free first, then earned.
- ATC cannot be purchased, transferred, gifted, or converted to or from money or V¢. Stripe never touches this ledger.
- ATC is created only by daily grant, verified listen, reception bonus, referral, new-user bootstrap, or explicit admin adjust.
- ATC is destroyed only by host consumption or explicit admin adjust.
- The ledger is server-authoritative. Clients display and request; they never invent a balance.
- Station Airtime stays parked and separate. Do not join the ledgers.

These rates are **declared policy**, not measurements of production.

## Consequences

- `PRODUCT.md` is Version 4.
- `AIRTIME_CREDITS`, `ATC_POLICY`, and the `airtimeCredits` gate live in `src/product/invariants.ts`.
- Phase 1 lands the ledger as **INFRASTRUCTURE ONLY**. Host start is not gated until Phase 3.
- Existing live sessions keep working until the host-burn gate is switched on.
