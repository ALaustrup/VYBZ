# VYBZ Live

> **NOT AUTHORITY.** Live Room is a capability inside the social network, not the product. See [`PRODUCT.md`](../../PRODUCT.md). Accent: **crimson** (`#e11d48`).

## Purpose

The core stage of VYBZ. Real-time live audio. Hosts are anyone with something to say or play.

## Customer

- **Hosts:** Producers, artists, podcasters, talkers, open-mic — browser, phone, or DAW.
- **Listeners:** Free, real-time audio. Chat, sparks, tips. No ATC required to listen.

## Core Capabilities

- **Direct DAW Streaming:** Master channel VST3 / CLAP / AU plug-in capturing 32-bit float audio directly to LiveKit SFU in uncompressed music mode.
- **Multi-Producer Live Sessions:** Co-producing and back-to-back live mixes with sub-second latency and synchronized state.
- **Interactive Listener Arena:** Real-time presence, WebGL audio-reactive visual stage, Sparks feedback prompts, and V¢ / Stripe live tipping.
- **Airtime Credits:** Hosting burns ATC earned by verified listening. Listening itself is free. Stripe never mints ATC.
- **Session provenance:** A sealed live mix can emit a measured event chain. An audio SHA is measured only from stored bytes; a client DAW digest is declared. Binding a catalog file is declared. C2PA on the file is Not measured. It does not claim the audio was not AI-generated.
- **Host Stage File:** Public `/u/:id` leads with live nights. Talk, podcast, and music. Connect is a request. Booking is a message.
- **Android Sync & Companion Mode:** Using Android devices as companion faders, cue triggers, and mobile broadcast rigs.
- **In-Session Tool Drawer:** Instant access to 9 DSP correction desks, Stem extraction, MIDI generation, and Car/Club translation monitors.
- **Post-Session Export:** One-click conversion of recorded live session stems into measured sample packs for sale on the marketplace.

## Media Architecture & Constraints

- **Audio Plane:** LiveKit SFU with `MUSIC_AUDIO_CONSTRAINTS` (stereo, 48 kHz, echo cancellation/auto gain disabled, bitrate up to 510 kbps).
- **Token Authority:** `livekit-token` Supabase edge function minting signed HMAC-SHA256 JWTs.
- **Fallback P2P:** WebRTC with STUN/TURN via `ice-servers` edge function.
- **Cost Behavior:** LiveKit `hard_cap` with transparent graceful degrade when bandwidth allowances are reached. Never silent overage.

## Copy One-Liner

**Go live. Talk, play, or mix. Listening is free.**
