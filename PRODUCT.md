# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 7 · 2026-08-18 · supersedes Version 6 (Stage File + ATC meter, 2026-08-18), Version 5 (session provenance, 2026-08-17), Version 4 (ATC, 2026-08-17), Version 3 (Live Mix Platform), Version 2 (Pack Suite) and Version 1 (The Station).
> Decisions: [`0004`](docs/decisions/0004-live-mix-streaming-platform.md) (live rooms) · [`0005`](docs/decisions/0005-airtime-credits.md) (how hosting is gated) · [`0006`](docs/decisions/0006-session-provenance.md) (what a live session can prove) · [`0007`](docs/decisions/0007-artist-stage-file.md) (public profile) · [`0008`](docs/decisions/0008-atc-unmeasured-mints.md) (reception / referral do not mint yet) · [`0009`](docs/decisions/0009-live-audio-for-any-host.md) (who may host).

---

## 1. The problem

People who need to be heard — a producer finishing a mix, a podcaster cutting an episode, someone who has to talk it out — have no honest live room. Social apps compress audio into telephony mud, rank by purchase and outrage, and treat speech as a vibe to be filtered. Music tools stay silent and private. Sample-pack shops sell files, not presence.

**That is the hole: there is no real-time live audio stage where anyone with something to say or play can host, listeners can stay for free, and hosting time is earned by giving attention.**

## 2. What VYBZ is

**VYBZ is a real-time live audio platform.** Not a sample-pack app. Not music-only.

Hosts are anyone with something to say or play: producers, artists, podcasters, talkers, open-mic, people who need to vent. Same rooms. Same Airtime Credits. Same session provenance. Same go-live gate.

Core experience pillars:
- **Live rooms** (`/live`, `/live/:id`): one person hosts, listeners hear it in real time.
- **Airtime Credits (ATC):** the only hosting clock. Listening is always free. Remaining ATC is shown as a measured clock; unknown reads **Not measured**.
- **Session provenance:** a host-downloadable proof that a verified human ran a real-time VYBZ session. It does not prove the music was not AI-generated. An audio SHA is measured only from stored bytes; a client DAW digest is declared; missing reads **Not measured**. C2PA ledger events are counted; the file C2PA box is **Not measured**.
- **Host Stage File** (`/u/:id`): public host profile. Talk, podcast, and music are first-class. Live nights lead. Connect is a request. Booking is a message, not a calendar.
- **DAW Master Channel ingest** (VST3 / CLAP / AU) when the host is mixing from a studio.
- **Companion + Android:** remote control and mobile ingest through the Platform Bridge.
- **Post-session products:** replay, episode, stems, transcript, measured packs — money on the session, never on the clock.

## 3. Surfaces

| Surface | Job | Primary Role |
|---|---|---|
| **Live room** (`/live/:id`) | Host + listeners, chat, presence, Airtime meter | **Core Stage** |
| **Live discovery** (`/live`) | Who is on, right now | **Front door** |
| **Host Stage File** (`/u/:id`) | Public host identity. Talk, podcast, music | **Public identity** |
| **Studio rooms** (`/rooms`, `/projects/:id`) | Multi-human collab. Still in the tree | **Co-Production** |
| **Living Mix** (`/library/mix`) | Catalog sequencer. Not a public live | **On-demand mix** |
| **In-session desks** (`/tools/*`) | Existing DSP / stem / MIDI / translation desks | **Toolkit** |
| **DAW bridge** | Master-bus ingest when the host is in a DAW | **Studio ingest** |
| **Marketplace** (`/market`, `/pack/:slug`) | Post-session products, not the hosting clock | **Session money** |
| **Library** (`/library`) | Files you already have | **Media** |

## 4. Airtime is the only hosting clock

- **1 ATC = 1 second of hosting.**
- **Daily free grant = 7200 ATC.** It does not stack. Overwritten each calendar day in the stored timezone.
- **Earned ATC persists.**
- **Hosting burns daily free first, then earned.**
- **Listening is always free.** ATC never gates playback. **Hosting burns Airtime Credits.**
- ATC is not purchasable, not transferable, not giftable. It cannot become money. Money cannot become ATC.
- **Stripe never creates ATC.**
- ATC is created only by daily grant, verified listen, reception bonus, referral, new-user bootstrap, or explicit admin adjust. **ATC is destroyed only by** host consumption or explicit admin adjust.
- **Reception bonus and referral do not mint yet.** Their amounts are **Not measured**. The ledger refuses those mints until amounts are declared policy. This is not a zero award.
- **Bootstrap** is only the declared mint: **3600 ATC**, once, inside **7 days** of profile creation.
- The go-live gate requires the declared start minimum (300 ATC). The host sees daily free and earned before start. A leftover shorter than a burn chunk is played out — no hard cut.
- **Station Airtime stays parked.** The Station's prompt-answer Airtime (`CURRENCY` / `STATION`) is a different, parked subsystem. Do not mix the two ledgers.

## 5. Money follows the session, never the clock

Allowed:
- Tips (fiat / V¢) during a live
- Creator subscriptions
- Post-session products: replay, episode, stems, transcript, measured packs
- Premium tools

Forbidden:
- Buying ATC
- Paying for default listen access
- Paying for rank or homepage placement

**Ticketed events stay out of this lock** unless a later decision says otherwise.

V¢ remains purchasable utility for tips and cosmetics. It never buys search placement, stream ranking, or ATC.

## 6. Session provenance

A sealed public live may emit a downloadable package (`.vprov`) and an in-app verification report.

- Binds to `live_sessions`, never Living Mix, never 1:1 `liveSession.ts` calls.
- **Full** strength only when that live consumed ATC. Otherwise **thin**.
- Copy is **Session provenance**, never “Human certified.”
- **No “not AI” proof.** Presence, ATC, and a hash cannot measure that.

## 7. Speech

Hosting is **viewpoint-neutral**. We do not kill a live because the take is unpopular.

We still do not host illegal content (CSAM, true threats, and the rest of that legal floor). That is law, not a vibe filter.

## 8. Honesty of Measurement

Three kinds of label, never mixed:

| Kind | Source | What we may say |
|---|---|---|
| **Declared** | Filename, host-typed title, “this file is the recap” | What a person wrote |
| **Measured** | Duration, peak, RMS, BS.1770-4 LUFS, sample rate, channels, content SHA, ATC burned | Computed from the bytes or the ledger |
| **Inferred** | Analysis that has no evidence | **Not used.** Unknown reads **Not measured**. |

## 9. What we refuse

- **No public vanity metrics:** No follower counts or fake play counts as social proof.
- **No purchasable attention:** Money cannot buy live ranking, "featured" tags, fake listens, or ATC.
- **No dating, romance, meetup or swipe matching:** Permanently out of scope.
- **No fabricated measurement:** Everything unmeasured reads **"Not measured"**.
- **No “not AI” proof.**
- **No undisclosed processing on the play path.**
- **No killing a live for an unpopular take.** Illegal content is still refused.

## 10. Preservation — Hide, Never Delete

**Nothing already built is deleted.** The sample pack pipeline, marketplace, analyzer, correction desk, translation lab, stem maker, MIDI maker, converter, rooms, live sessions, messages, projects, visualizer studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable, and keep compiling.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes still resolve. Code still compiles.

## 11. Interface Direction

- **Live-first:** default UI leads with live rooms, host profiles, and Library.
- **Host profiles are not artist-only.** Talk, podcast, and music share `/u/:id`.
- **Auto-adjusting** across phone, companion, and desktop studio.
- **Dark, audio-first.**

## 12. Delivery Vocabulary

A capability is delivered only when it is implemented, integrated, reachable, discoverable, deployed, production-verified, and changes what a user can do.

Permitted states — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

## 13. Definition of Success

A host taps Go Live. Listeners hear them — mix, talk, episode, or vent — in real time. Hosting burns Airtime. Listening stays free. When the session ends, the host can download a session-provenance package and, if they want, sell something that came from that night.

Nobody had to buy the right to be heard. Nobody had to buy the right to listen.
