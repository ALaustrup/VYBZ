# 0007 — Artist / producer Stage File

> **SUPERSEDED AS PUBLIC VOCABULARY.** Read [`PRODUCT.md`](../../PRODUCT.md). `/u/:id` is **their VYBZ**, not an artist storefront. “Stage File” is an internal engineering name. Live nights do not have to lead. The place is not artist-only.

**Date:** 2026-08-18 · **Status:** Accepted as history · **Decided by:** owner

Decision records are append-only. This record does not edit [`0004`](./0004-live-mix-streaming-platform.md), [`0005`](./0005-airtime-credits.md), or [`0006`](./0006-session-provenance.md).

## Context

`0004` made live mix the product. `0005` gated hosting with ATC. `0006` let a sealed session emit a measured package and refused a “not AI” claim.

The public artist page was still a catalog storefront. The owner directed a premium artist/producer profile that treats live mixes as the star and keeps Connect honest.

## Decision

**`/u/:id` is the Stage File — a public stage for an artist or producer.**

- Live nights lead. Catalog, packs, discography, roster, and affiliates stay.
- The Session provenance seal may appear when a sealed night exists. Copy is **Session provenance**, never “Human certified.”
- Connect remains a request that the other person must accept. The UI must not say “Following.”
- Book-a-session opens a message and states that it is not a calendar.
- Cells on the profile are measured or absent. Unknown reads **Not measured**. No follower or play-count vanity.
- Circle / private sessions stay hidden. Public nights may show sealed strength and ATC burned, never provenance event payloads.
- The route stays resolvable. Nothing already built is deleted.

## Consequences

- `PRODUCT.md` is Version 6.
- `ARTIST_STAGE_PROFILE` and the `artistStageProfile` gate live in `src/product/invariants.ts`.
- Stripe, ATC grant/earn/consume formulas, LiveKit, and Living Mix are not changed by this surface.
