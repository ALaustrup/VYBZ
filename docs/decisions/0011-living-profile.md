# 0011 — Living Profile Operating System

**Date:** 2026-08-21 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. This record does not edit [`0010`](./0010-creator-os.md) or [`0004`](./0004-live-mix-streaming-platform.md)–[`0009`](./0009-live-audio-for-any-host.md). Creator OS, live rooms, any-host go-live, ATC, session provenance, and the Stage File remain in force as **capabilities**. They are no longer the product identity.

Executive source: owner Living Profile master plan (the constitution in [`PRODUCT.md`](../../PRODUCT.md) Version 9).

## Context

Version 8 named VYBZ the Creator Operating System and said it should feel like a creative operating environment with a social layer. That still made the workstation the root and the profile a surface around it.

The owner superseded that identity: the human is the root object. Their VYBZ is the interface. Library supplies it. Creative Work gives it substance. Relationships make it social.

## Decision

**VYBZ is a living social identity that becomes a creative operating system when you create.**

- **One Identity.** No forced creator onboarding. No separate Creator Account.
- **One Profile.** Owner dashboard and visitor experience are two perspectives on the same object.
- **One Library.** Do not duplicate assets because they appear in multiple places.
- **Profile Is The Product.** Everything else emerges from it.
- **Community First.** Follow, VYB, comments, chat, collections, discovery, and live participation are first-class with zero published work.
- **Refine before replacing.** Hide, never delete. No rewrite to pivot.

Logged-in chrome may still lead Workspace until a later phase moves home. That transitional rail is not the identity.

## Consequences

- `PRODUCT.md` is Version 9.
- `LIVING_PROFILE` in `src/product/invariants.ts` is the identity lock. `CREATOR_OS.creatorOsIsTheProduct` is false. `CREATOR_OS.livingProfileBecomesCreatorOs` is true.
- Gate `livingProfile` is registered.
- Version 8 / decision 0010 remain history: Creative Work is still the unit of creation; local-first, Follow-without-count, and provenance-as-association stay.
