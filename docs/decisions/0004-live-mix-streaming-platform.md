# 0004 — Live Mix Audio Streaming Platform

**Date:** 2026-08-17 · **Status:** Accepted · **Decided by:** owner

Decision records are append-only. This record supersedes [`0003-pack-suite-marketplace.md`](./0003-pack-suite-marketplace.md) and [`0001-the-station.md`](./0001-the-station.md). It does not edit those files' bodies.

## Context

`0003` made the sample pack creation suite with marketplace the default product focus after the first live $1.00 pack purchase was verified on production.

However, the core transformative vision of VYBZ requires a live, participatory stage: giving producers and artists a place to produce their music, sound, and audio projects with listeners around the world in real time live.

The underlying infrastructure already contains high-value live streaming and audio assets: LiveKit SFU integration (`livekit-token` edge function and client layer with stereo music constraints), Living Mix session engine, P2P WebRTC call infrastructure, collab rooms with cursor presence, 9 DSP correction desks, in-browser BS.1770-4 loudness measurement, WebGL visualizers, and multi-client Platform Bridge (Tauri desktop and Capacitor Android).

The owner directed a complete rewrite of product authority to the **Live Mix Audio Streaming Platform**.

## Decision

**VYBZ is to become the ultimate live mix audio streaming platform, giving producers and artists a place to produce their music, sound and audio projects with listeners around the world in real time live.**

Key architectural decisions:
1. **Live Mix Sessions & Rooms are the Core Front Door:** Live production sessions, stage discovery (`/live`), and interactive listener rooms (`/live/:id`) become the primary user experience.
2. **DAW Master Channel Plug-in (VST3 / CLAP / AU):** Develop a lightweight native remote broadcast plug-in that producers insert on their DAW master channel to stream studio audio directly to LiveKit SFU in lossless 32-bit float stereo.
3. **Android First-Class & Multi-Device Sync:** Enable Android devices as companion hardware-style remote controllers and mobile live streaming rigs via the Capacitor Platform Bridge.
4. **Responsive, Live-Audio Friendly Interface:** Remove the old sample-pack stepper as the default shell; replace with an auto-adjusting interface tailored for live mix monitoring, metering, visualizers, and real-time interaction.
5. **Subordinated Production Tooling & Post-Stream Monetization:** All existing DSP desks (correct, translate, stems, MIDI) become in-session plugins. The sample pack pipeline (`PackMakerPage`) becomes the post-session export path to monetize recorded live mixes on the marketplace.
6. **Preservation (Hide, Never Delete):** Zero existing feature code, tables, or edge functions are deleted. All existing routes remain resolvable.

## Consequences

- **Documentation:** `PRODUCT.md` is rewritten to Version 3. `STATE.md` records this pivot. `README.md` and `docs/products/LIVE.md` are updated.
- **Invariants:** Machine-enforceable rules in `src/product/invariants.ts` are evolved to protect live-mix streaming invariants while keeping all existing test gates green.
- **Codebase:** Navigation and UI shell evolve to lead with Live Mix while preserving all existing routes and desks.
