# 0003 — Pack suite and marketplace

> **SUPERSEDED AS PRODUCT IDENTITY.** Read [`PRODUCT.md`](../../PRODUCT.md). VYBZ is a social network, not a sample-pack suite. Pack Maker and Market stay in the tree (hide, never delete). Do not implement from this file as the product.

**Date:** 2026-08-16 · **Status:** Accepted as history · **Decided by:** owner

Decision records are append-only. This record supersedes [`0001-the-station.md`](./0001-the-station.md).
It does not edit that file's body.

## Context

`0001` made one synchronized station the product so the documentation would stop arguing with
itself. The code underneath was already a release OS with a sample-pack storefront, a pack
assembler, a library, and desks.

On 2026-08-16 the owner completed a **$1.00** purchase of a published pack on
https://vybz.cloud and received the ZIP by email. That is a measured marketplace loop.
The Station remains schema-and-docs: edge refill still picks from a pool, no artist line
UI, no locked-transport earning. Building radio next would ignore the till that just
worked.

The owner directed that authority be rewritten from Station to a sample pack creation
suite plus marketplace. Features are not deleted.

## Decision

VYBZ's default product is:

**organize → tag → preview → package → (optional) sell**

as specified in `PRODUCT.md` v2.

- Library, Pack Maker, and Market / storefront are the default experience
- Publishing and packaging are free; only a completed sale is charged
- Market lists measured published packs only
- Station, sparks-on-station, Airtime, and social expansion are **parked** — reachable,
  not the front door, no new work until a later decision
- `STATION` and `CURRENCY` in `src/product/invariants.ts` stay. They constrain the parked
  subsystem. They are not deleted. Pack sales use Stripe, not Airtime
- Nothing already built is removed

## Why this and not staying with 0001

The Station answered a real wound (release and learn nothing). It is not what a producer
can finish today. The pack loop is. A self-purchase is not a market, but it is a working
checkout, webhook, and download mail — more of a product than an unbuilt radio.

Keeping both as the default would repeat the 0001 failure mode: two products, no front door.

## Consequences

**Documentation.** `PRODUCT.md` is rewritten to v2. `STATE.md` records this decision and
the $1 order. This file is the record. `0001` is marked superseded.

**Code.** No feature deletion. Navigation and copy should follow `PRODUCT.md` §11 in later
slices. This record does not itself change `suiteApps.ts`.

**Left open.** A second, non-owner customer is Not measured. Pack Maker assemble and the
uploader hang fix are Not measured in a browser. Automatic Stripe payouts are Not
measured (`payouts_enabled` last recorded false). Airtime constants remain Not measured
and unused.
