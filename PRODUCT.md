# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 3 · 2026-08-17 · supersedes Version 2 (Pack Suite, 2026-08-16) and Version 1 (The Station, 2026-08-15).
> Decision: [`docs/decisions/0004-live-mix-streaming-platform.md`](./docs/decisions/0004-live-mix-streaming-platform.md).

---

## 1. The problem

Music production has spent decades isolated in bedrooms, private studios, and silent project files.

A producer works for hours or weeks on a track or mix. They post a 15-second snippet on social media to beg for algorithmic attention, or wait months for a DSP release that delivers nothing but a flat play count. There is no stage where creators can produce, test, refine, and perform their sound live with a global audience in real time—with pristine, studio-grade audio fidelity and zero friction.

Traditional live streaming platforms compress audio into telephony mud, introduce seconds of latency, lack music production context, and offer no integration with digital audio workstations (DAWs).

**That is the hole: producers have nowhere to create, perform, and mix audio projects live with the world, directly from their studio workflow, in high fidelity and real time.**

## 2. What VYBZ is

**VYBZ is to become the ultimate live mix audio streaming platform, giving producers and artists a place to produce their music, sound and audio projects with listeners around the world in real time live.**

Core experience pillars:
- **Real-time collaborative live production / mixing sessions:** Multi-producer stages and interactive rooms where music is shaped live.
- **Low-latency audio streaming of live mixes:** Studio-quality, full-frequency stereo audio streamed with sub-second latency to global listeners.
- **Direct DAW Master Channel integration:** Dedicated remote broadcast plug-in (VST3 / CLAP / AU) dropping directly onto the master channel to stream studio output in pristine fidelity.
- **Listener presence & interaction:** Active audience presence, real-time feedback prompts (Sparks), live tipping (V¢ / Stripe), and identity-verified chat inside the live experience.
- **Multi-device & Android synchronization:** Seamless companion control, mobile live broadcast rigs, and lockstep device sync.
- **Persistent continuity & post-stream monetization:** Tools to split stems, measure loudness, package live recordings into verified sample packs, and sell them directly on the marketplace.

## 3. The Live Mix Platform Architecture

VYBZ replaces static steppers with a live-audio-friendly interface that auto-adapts across all screen sizes and devices.

| Surface | Job | Primary Role |
|---|---|---|
| **Live Mix Room** (`/live/:id`) | Interactive live mixing stage with real-time waveform HUD, visualizer, chat, presence, and tip goals | **Core Stage** |
| **Live Discovery** (`/live`) | Real-time browser of active producer sessions, genre tags, and live listener counts | **Discovery Front Door** |
| **Studio Collab Rooms** (`/rooms`, `/projects/:id`) | Multi-human collaborative studios with LiveKit audio, split sheets, and versioning | **Co-Production** |
| **Living Mix Engine** (`/library/mix`) | Intelligent on-demand track sequencing, transition scoring, and energy management | **Automated Mix Core** |
| **In-Session Tool Drawer** (`/tools/*`) | 9 DSP correction desks, Stem splitter, MIDI extractor, Translation Lab (car/club monitors) | **Studio Toolkit** |
| **DAW Broadcast Bridge** (`VST3 / CLAP / Desktop`) | Master bus audio capture streamed directly from Ableton, FL Studio, Logic, Reaper | **Master Channel Ingest** |
| **Marketplace & Storefront** (`/market`, `/pack/:slug`) | Post-session export of live mixes into measured, sellable sample packs | **Monetization** |
| **Library & Working Set** (`/library`) | Ingest, organize, and summon assets directly into live sessions | **Media Repository** |

## 4. DAW Integration: The VYBZ Broadcast Plug-in

A core requirement for professional producers is zero-friction audio capture:
1. **Master Bus Insert:** A lightweight native plug-in (VST3 / CLAP / AU) dropped onto the master channel of any DAW.
2. **Lossless PCM Capture:** Intercepts 32-bit float stereo audio directly from the DAW audio buffer with zero coloration.
3. **Ultra-Low Latency Transport:** Hands off audio to the VYBZ LiveKit SFU using uncompressed stereo music constraints (Opus up to 510 kbps, 48 kHz).
4. **In-DAW Live HUD:** Real-time stream telemetry, active listener count, live chat alerts, and Sparks audience feedback rendered directly inside the DAW plugin UI.

## 5. Multi-Device & Android Synchronization

VYBZ treats Android as a first-class production and listening target:
- **Companion Control Mode:** Android devices function as hardware-like remote controllers for desktop live sessions (faders, mutes, cue triggers, chat).
- **Mobile Live Ingest:** Artists can broadcast live mix sessions from mobile audio interfaces on location.
- **Lockstep Sync:** Verified listener playback synchronized across devices with low latency.

## 6. Subordinated Production Tooling & Post-Stream Monetization

Everything already built in the VYBZ ecosystem serves the live mix experience:
- **In-Session Desks:** The 9 audio correction tools, stem isolation engine, MIDI generator, and translation monitors are accessible as on-demand side panels during live sessions.
- **Post-Live Pack Generation:** When a live mixing session ends, the producer can export the recorded audio/stems into a measured sample pack with one click.
- **Storefront & Marketplace:** Published packs are sold on the marketplace (`/market`) with honest SHA manifests, delivering measured ZIPs via Stripe checkout.

## 7. Honesty of Measurement

Three kinds of label, never mixed:

| Kind | Source | What we may say |
|---|---|---|
| **Declared** | Filename, artist-typed fields, pack/stream title and genre | What a person wrote |
| **Measured** | Duration, peak, RMS, BS.1770-4 LUFS, sample rate, channels, content SHA | Computed from the bytes |
| **Inferred** | Analysis that has no evidence | **Not used.** Unknown reads **Not measured**. |

VYBZ never fabricates play counts, listener engagement, or musical analysis. A fabricated number wearing a lab coat is still fabricated.

## 8. Money & Economy

- **Live Tipping:** Listeners tip producers during live mix sessions in fiat (via Stripe) or V¢ utility credits.
- **Pack Sales:** Recorded live mixes packaged into sample packs are sold on the platform with a 10% fee.
- **Publishing & Streaming:** Going live and hosting sessions is free. The platform charges a cut only on completed sales and tipping transactions.
- **V¢ Remains Utility:** V¢ is purchasable for tips and cosmetics; it never buys search placement or artificial stream ranking.

## 9. What we refuse

- **No public vanity metrics:** No follower counts or fake play counts as social proof.
- **No purchasable attention:** Money cannot buy live stream ranking, "featured" tags, or fake listens.
- **No dating, romance, meetup or swipe matching:** Permanently out of scope.
- **No fabricated measurement:** Everything unmeasured reads **"Not measured"**.
- **No undisclosed processing on the play path:** Stream and playback paths remain dry and disclosed.

## 10. Preservation — Hide, Never Delete

**Nothing already built is deleted.** The sample pack pipeline, marketplace, analyzer, correction desk, translation lab, stem maker, MIDI maker, converter, rooms, live sessions, messages, projects, visualizer studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable, and keep compiling.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes still resolve. Code still compiles.

## 11. Interface Direction

- **Live-First & Audio-Friendly:** The default UI leads with Live Mix sessions, Stage Discovery, Studio Rooms, and Library.
- **Auto-Adjusting Responsive Layout:** Ergonomically tailored for single-hand mobile (Android), tablet companion mode, desktop studio screens, and multi-monitor setups.
- **Dark, Sleek, Audio-Reactive:** Modern glassmorphism with high-contrast audio meters and WebGL reactive visual stages.

## 12. Delivery Vocabulary

A capability is delivered only when it is implemented, integrated, reachable, discoverable, deployed, production-verified, and changes what a user can do.

Permitted states — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

## 13. Definition of Success

A producer fires up their DAW, inserts the VYBZ Broadcast plug-in onto their master channel, and taps "Go Live". Within seconds, listeners around the world tune in to pristine stereo sound, interact in real-time, send sparks and tips, and experience music being born live. When the session ends, the producer exports the session stems as a measured pack and lists it on the store.

Music production is no longer a silent, lonely island.
