# 0010 — Creator Operating System

> **SUPERSEDED AS PRODUCT IDENTITY.** Read [`PRODUCT.md`](../../PRODUCT.md) Version 9 and [`0011`](./0011-living-profile.md). VYBZ is a social network. Creator OS is what the living profile **becomes when you create** — not a separate app and not the public product. The archived executive brief is [`../archive/VYBZ-Creator-OS-Executive-Pivot-Directive.md`](../archive/VYBZ-Creator-OS-Executive-Pivot-Directive.md). Do not implement from it.

**Date:** 2026-08-21 · **Status:** Accepted as history · **Decided by:** owner

Decision records are append-only. This record does not edit [`0004`](./0004-live-mix-streaming-platform.md)–[`0009`](./0009-live-audio-for-any-host.md). Live rooms, any-host go-live, ATC as the hosting clock, session provenance, and the Stage File remain in force as **capabilities**. They are no longer the product identity.

Executive source (archived, not authority): [`../archive/VYBZ-Creator-OS-Executive-Pivot-Directive.md`](../archive/VYBZ-Creator-OS-Executive-Pivot-Directive.md).

## Context

Version 7 named VYBZ a real-time live audio platform. That was true of the live layer and false of the repository: Library, desktop, tools, profiles, projects, and provenance already existed around creative work, not only around a stream.

A 2026-08-11 Creative OS brief then centered a **song / release workspace**. That still assumed music was the unit.

The owner authorized a preservation-first, cost-constrained pivot: extract maximum value from what is built, change the center of gravity, do not rewrite, do not delete.

## Decision

**VYBZ is the Creator Operating System.** Not a sample-pack app. Not music-only. Not a live-audio product that happens to store files.

- The fundamental unit is **Creative Work**.
- Original files stay local by default. The cloud is the control plane.
- Indexing is not publishing.
- Live Creation, Follow, VYB, provenance, and tools are layers around Workspace, Library, and Creator Profile.
- “Validate Humanity” may associate a file with verified VYBZ creation sessions. It must not claim proof that no AI was involved.
- $0 incremental recurring cost is preferred. No new vendor without an existing alternative.

## Consequences

- `PRODUCT.md` is Version 8.
- `CREATOR_OS` in `src/product/invariants.ts` is the identity lock. `LIVE_AUDIO.liveAudioIsACapability` replaces `liveAudioIsTheProduct`.
- The song/release Creative OS brief is reference only. It is not authority.
- Sample packs, Living Mix, ATC, and the Station stay in the tree. They are not the product.
