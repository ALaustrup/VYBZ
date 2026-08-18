# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 6 · 2026-08-18 · supersedes Version 5 (session provenance, 2026-08-17), Version 4 (ATC, 2026-08-17), Version 3 (Live Mix Platform), Version 2 (Pack Suite) and Version 1 (The Station).
> Decisions: [`0004`](docs/decisions/0004-live-mix-streaming-platform.md) (what we are) · [`0005`](docs/decisions/0005-airtime-credits.md) (how hosting is gated) · [`0006`](docs/decisions/0006-session-provenance.md) (what a live session can prove) · [`0007`](docs/decisions/0007-artist-stage-file.md) (how an artist or producer is shown).

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
- **Airtime Credits (ATC):** Hosting time is earned by giving verified attention. Listening is always free. Remaining ATC is shown as a measured clock; unknown reads **Not measured**.
- **Session provenance:** A sealed live mix can emit a measured package (who hosted, that ATC was burned, a chained event log). It does not prove the music was not AI-generated.
- **Artist / producer Stage File:** The public profile (`/u/:id`) is a stage, not a social graph. Live nights lead. Stats are measured. Connect is a request. Booking is a message, not a calendar.

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
| **Artist Stage File** (`/u/:id`) | Public artist/producer stage: live nights, sealed session badge, catalog, measured cells | **Public identity** |

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

- **Listening is always free and unlimited.** ATC never gates playback.
- **Hosting burns Airtime Credits (ATC).** 1 ATC = 1 second of publishing. Daily free grant is 7200 ATC (2 hours), overwritten each calendar day in the user's stored timezone. Earned ATC is the only path beyond that grant.
- **ATC is a closed loop.** Non-purchasable, non-transferable, non-giftable. It cannot become money. Money cannot become ATC. Stripe is not on this path.
- **ATC is created only by** daily grant, verified listen, reception bonus, referral, new-user bootstrap, or explicit admin adjust. **ATC is destroyed only by** host consumption or explicit admin adjust.
- **Verified attention only.** Credit is awarded in discrete chunks after LiveKit presence plus server-validated playback heartbeats. Clients never invent or trust their own balance.
- **Live Tipping:** Listeners tip producers in fiat (Stripe) or V¢. Tips are not ATC.
- **Pack Sales:** Recorded live mixes packaged into sample packs are sold with a 10% fee.
- **V¢ Remains Utility:** V¢ is purchasable for tips and cosmetics; it never buys search placement, stream ranking, or ATC.
- **Station Airtime stays parked.** The Station's prompt-answer Airtime (`CURRENCY` / `STATION`) is a different, parked subsystem. Do not mix the two ledgers.

## 9. What we refuse

- **No public vanity metrics:** No follower counts or fake play counts as social proof. Public profiles may show sealed nights, rated tracks, and accepted connections only when those numbers were measured.
- **No purchasable attention:** Money cannot buy live stream ranking, "featured" tags, fake listens, or ATC.
- **No dating, romance, meetup or swipe matching:** Permanently out of scope.
- **No fabricated measurement:** Everything unmeasured reads **"Not measured"**.
- **No “not AI” proof:** Session provenance never claims the audio was human-composed or not fully AI-generated. That is not measurable from presence, ATC, or a client hash.
- **No undisclosed processing on the play path:** Stream and playback paths remain dry and disclosed.

## 10. Preservation — Hide, Never Delete

**Nothing already built is deleted.** The sample pack pipeline, marketplace, analyzer, correction desk, translation lab, stem maker, MIDI maker, converter, rooms, live sessions, messages, projects, visualizer studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable, and keep compiling.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes still resolve. Code still compiles.

## 11. Interface Direction

- **Live-First & Audio-Friendly:** The default UI leads with Live Mix sessions, Stage Discovery, Studio Rooms, Library, and the public Stage File.
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
