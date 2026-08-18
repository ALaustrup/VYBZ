# 0009 — Live audio for any host

**Date:** 2026-08-18 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. This record does not edit [`0004`](./0004-live-mix-streaming-platform.md)–[`0008`](./0008-atc-unmeasured-mints.md). It does not reopen Airtime Phase 1, reception/referral mints, or SessionToolDrawer.

## Context

`0004` named VYBZ a live mix audio streaming platform for producers and artists. The rooms, ATC clock, go-live gate, and session provenance already work for any authenticated host. Restricting the product to music-only contradicted the code and the owner.

Slice 2 (host Airtime card + start gate), Slice 3 (downloadable session provenance + in-app report), and Slice 1 (bootstrap 3600 / 7 days) are in the tree at `0c04d717`.

## Decision

**VYBZ is a real-time live audio platform. Not a sample-pack app. Not music-only.**

Hosts are anyone with something to say or play: producers, artists, podcasters, talkers, open-mic, people who need to vent. Same rooms, same ATC, same provenance, same go-live gate.

- Airtime is the only hosting clock.
- Money follows the session, never the clock. Tips, creator subscriptions, post-session products, and premium tools are allowed. Buying ATC, paying for default listen access, and paying for rank or homepage placement are forbidden. Ticketed events are out of this lock.
- Session provenance is a host-downloadable proof that a verified human ran a real-time VYBZ session. Full strength only when ATC was consumed. It is not a “Human certified” or not-AI claim.
- Hosting is viewpoint-neutral. We do not kill a live because the take is unpopular. We still do not host illegal content. That is law, not a vibe filter.
- Public `/u/:id` is a host profile. Talk, podcast, and music are first-class.

## Consequences

- `PRODUCT.md` is Version 7.
- `LIVE_AUDIO` and related flags live in `src/product/invariants.ts`.
- Sample packs, Living Mix, and the Station stay in the tree. They are not the product.
