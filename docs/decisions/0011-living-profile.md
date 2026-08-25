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

## Phase 1 — Home is My VYBZ (2026-08-21)

Logged-in `/` is the owner's Stage File. Workspace remains at `/workspace`, hidden from default chrome.

## Phase 2 — Quiet chrome (2026-08-21)

Permanent navigation is collapsed. Default chrome is **VYBZ · Search · + · Chat · Alerts · Me**. `PrimaryRail` stays in the tree, imported by nothing. Library, Network, Live, and Workspace stay reachable by URL and from owner controls. Frozen `MobileNav` stays unmounted. No Devices nav.

## Phase 3 — Owner / visitor dual mode (2026-08-22)

One Stage File. Two permission contexts. Owner sees management controls. Visitor sees experience. **View as Visitor** lets the owner check the public VYBZ without Connect/Follow/Tip on their own identity.

## Phase 4 — Profile module registry (2026-08-22)

Creative Work on the Stage File goes through a kind → renderer registry (`MODULE_RENDERERS`). Audio, image, video, file (download), project, and link stay. Text (notes / writing) and collection (albums with two or more tracks, connected playlists) register as first-release kinds. Unknown kinds fall back; they do not crash the profile. 3D and games stay out (Phase 9). Library → profile picker is later (Phase 5).

## Phase 5 — Library → profile (2026-08-22)

A person selects existing Library work, **Place on your VYBZ**, chooses Works or Featured, and is done. Ids only — the asset is not copied. Until they compose, the Stage File still shows catalog drops so existing public work does not vanish. After the first place or hide, new uploads stay off the Stage File until placed. Library views: grid, list, table, and shelves. Arrangement (view / sort / group) is remembered per person. Profile layout editing is later (Phase 6).

## Phase 6 — Modular arrangement (2026-08-22)

The owner can **Arrange** modules that already exist on the Stage File (stage, featured, works, story, packs, measured, credits, more). Order is stored on the same profile jsonb. Empty modules omit; Arrange still shows them so they can be moved. Identity banner, sticky chrome, and Book a session stay out of the layout toy. Featured is its own module when a work is pinned or placed there. No theme engine, no CSS/JS injection, no cinematic canvas. Phase 6 is **frozen**.

## Phase 7 — Hide existing sections (2026-08-25)

The owner can **Hide** a section that already exists on the Stage File. Public and visitor-preview omit it even when it has content. Arrange still lists it with **Show**. Stored on the same profile jsonb as `stageHiddenModules`. Identity banner, sticky chrome, and Book a session stay fixed. No rename, no invent, no theme engine, no CSS/JS injection.
