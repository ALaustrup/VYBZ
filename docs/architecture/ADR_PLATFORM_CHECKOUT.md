# ADR-023 — Platform Checkout (no Connect for storefront)

**Status:** Accepted  
**Date:** 2026-07-29  
**Phase:** 10 — Storefront go-live (platform checkout)

## Context

Stripe Connect Express cannot be activated for the current producer (photo-ID
gate). Blocking pack sales on Connect onboarding would freeze the GTM wedge.
Storefront already charges via Checkout + webhook fulfillment (signed ZIP).

## Decision

1. **Platform Checkout:** `storefront-checkout` creates a standard Checkout Session
   on the VYBZ Stripe account — **no** `transfer_data.destination` / Connect fee.
2. **Manual settlement:** `storefront_orders.settlement_status` defaults to
   `pending_manual`. Pack owners mark `settled_off_platform` via RPC
   `storefront_settle_order` after ACH / Zelle / Vc debit outside Stripe.
3. **Tips / cosmetics Connect paths unchanged** — only storefront pack sales.
4. Migration `20260729_0084_storefront_platform_checkout`.

## Manual settlement procedure

1. Fan pays → webhook sets `status=paid`, `settlement_status=pending_manual`,
   emails ZIP.
2. Owner opens `/tools/packs` → **Orders** → **Settle now** after paying the
   producer off-platform (retain 10% `application_fee_cents` as platform share).
3. No automated payouts in v1.

## Consequences

- Producers can publish without Express `charges_enabled`.
- Ops must track pending_manual rows (Cost Sentinel / Orders UI).
- Live Stripe keys remain Supabase Edge secrets only.

## Non-goals

Automated ACH; additional payment providers; NAV changes on pack detail.
