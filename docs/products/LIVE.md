# VYBZ Live

> Product brief — reference only. Product authority is [`PRODUCT.md`](../../PRODUCT.md). Accent: **crimson** (`#e11d48`).

## Purpose

The core stage of VYBZ. Low-latency, high-fidelity audio streaming and collaborative live mixing sessions where producers create, perform, and refine music live with listeners worldwide.

## Customer

- **Producers / Artists:** Going live from their DAW (via the VYBZ Broadcast Master Channel plug-in), browser, or mobile rig to produce, test tracks, DJ, and mix live.
- **Global Audience:** Listening to pristine, full-bandwidth stereo mixes in real time, interacting via chat, sending Sparks reactions, and tipping the host.

## Core Capabilities

- **Direct DAW Streaming:** Master channel VST3 / CLAP / AU plug-in capturing 32-bit float audio directly to LiveKit SFU in uncompressed music mode.
- **Multi-Producer Live Sessions:** Co-producing and back-to-back live mixes with sub-second latency and synchronized state.
- **Interactive Listener Arena:** Real-time presence, WebGL audio-reactive visual stage, Sparks feedback prompts, and V¢ / Stripe live tipping.
- **Airtime Credits:** Hosting burns ATC earned by verified listening. Listening itself is free. Stripe never mints ATC.
- **Session provenance:** A sealed live mix can emit a measured event chain. It does not claim the audio was not AI-generated.
- **Artist Stage File:** Public `/u/:id` leads with live nights and the session seal. Connect is a request. Booking is a message.
- **Android Sync & Companion Mode:** Using Android devices as companion faders, cue triggers, and mobile broadcast rigs.
- **In-Session Tool Drawer:** Instant access to 9 DSP correction desks, Stem extraction, MIDI generation, and Car/Club translation monitors.
- **Post-Session Export:** One-click conversion of recorded live session stems into measured sample packs for sale on the marketplace.

## Media Architecture & Constraints

- **Audio Plane:** LiveKit SFU with `MUSIC_AUDIO_CONSTRAINTS` (stereo, 48 kHz, echo cancellation/auto gain disabled, bitrate up to 510 kbps).
- **Token Authority:** `livekit-token` Supabase edge function minting signed HMAC-SHA256 JWTs.
- **Fallback P2P:** WebRTC with STUN/TURN via `ice-servers` edge function.
- **Cost Behavior:** LiveKit `hard_cap` with transparent graceful degrade when bandwidth allowances are reached. Never silent overage.

## Copy One-Liner

**Produce, perform, and mix live with the world in real time.**
