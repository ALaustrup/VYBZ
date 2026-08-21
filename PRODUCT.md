# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 8 · 2026-08-21 · supersedes Version 7 (live audio as product identity, 2026-08-18), Version 6 (Stage File + ATC meter, 2026-08-18), Version 5 (session provenance, 2026-08-17), Version 4 (ATC, 2026-08-17), Version 3 (Live Mix Platform), Version 2 (Pack Suite) and Version 1 (The Station).
> Also supersedes the 2026-08-11 song/release Creative OS brief: music is a specialization, not the unit.
> Decisions: [`0010`](docs/decisions/0010-creator-os.md) (Creator OS identity) · [`0004`](docs/decisions/0004-live-mix-streaming-platform.md) (live rooms) · [`0005`](docs/decisions/0005-airtime-credits.md) (how hosting is gated) · [`0006`](docs/decisions/0006-session-provenance.md) (what a live session can prove) · [`0007`](docs/decisions/0007-artist-stage-file.md) (public profile) · [`0008`](docs/decisions/0008-atc-unmeasured-mints.md) (reception / referral do not mint yet) · [`0009`](docs/decisions/0009-live-audio-for-any-host.md) (who may host — live remains any-host, not the product identity).

---

## 1. The problem

Creators have no single environment in which to organize their work, keep original files under their control, show the process of making, publish selectively, and connect with other people who make things.

Social apps treat creation as content. Storage apps treat files as objects with no identity. Music tools assume every creator is finishing a song. Live apps assume the product is the stream.

**That is the hole: there is no operating environment for digital creators — private workspace, public identity, and a network — where the original work stays the creator's.**

Live rooms remain a real-time stage inside that environment. They are not the definition of the product.

## 2. What VYBZ is

**VYBZ is the Creator Operating System.** Not a sample-pack app. Not music-only. Not another social network that happens to host files.

The fundamental unit is **Creative Work**. A Work may contain one or many assets. A song is a specialization. So is an image, a film, a game build, a plugin, a sample pack, a preset, or a document.

VYBZ should feel like a **creative operating environment with a social layer**, not a social app with a library bolted on.

The loop:

**Create → Organize → Version → Preview → Validate → Share → Showcase → Connect**

Social functionality exists around creation. Creation does not exist merely to generate social content.

Creators are anyone whose work can be represented digitally: musicians, producers, visual artists, filmmakers, game developers, writers, designers, and categories that do not fit a traditional store.

## 3. Surfaces

| Surface | Job | Primary Role |
|---|---|---|
| **Workspace** (`/`) | The creator's private operating environment | **Front door** |
| **Library** (`/library`) | Authorized works and assets, local and published | **Catalog** |
| **Creator Profile** (`/u/:id`) | Living portfolio. Host Stage File. Not artist-only | **Public identity** |
| **Network** (`/feed`, `/connect`, `/live`) | Other creators, activity, who is live | **Social layer** |
| **Live room** (`/live/:id`) | Host + listeners, chat, presence, Airtime meter | **Live Creation** |
| **Devices** | Desktop / mobile Asset Nodes and availability | **Local originals** |
| **Studio rooms** (`/rooms`, `/projects/:id`) | Multi-human collab. Still in the tree | **Co-Production** |
| **In-session desks** (`/tools/*`) | Existing DSP / stem / MIDI / translation desks | **Toolkit** |
| **DAW bridge** | Master-bus ingest when the host is in a DAW | **Studio ingest** |
| **Marketplace** (`/market`, `/pack/:slug`) | Post-session products, not the hosting clock | **Session money** |
| **Living Mix** (`/library/mix`) | Catalog sequencer. Not a public live | **On-demand mix** |

Do not add navigation for functionality that does not exist.

The public Creator Profile (`/u/:id`) is the host Stage File. Talk, podcast, music, and other disciplines share it. Connect is a request. Booking is a message, not a calendar. Works render through an extensible set of kinds — audio, image, video, file, project, and link — so the profile is a living portfolio, not an audio list.

Live Creation reuses LiveKit. Go Live leads with screen/window, then audio. Creator identity, viewer access, public chat, the Stage File, and `live_sessions` logging stay.

The Network reuses VYB on works, Live discovery, direct messages, and activity. **Follow** is a unidirectional subscribe so a creator's public work can land in Following. It is not Connect. Connect remains a request. No public follower counts.

## 4. Local-first originals

The VYBZ cloud is the authentication, identity, social, metadata, discovery, permissions, signaling, and provenance plane.

Original creative files stay on the creator's device by default. Indexing is not publishing. Sharing is explicit. Public exposure is explicit.

Availability must be honest: **Available now**, **While this app is open**, **On another device**, **Unavailable here**, **Public**, **Private**. Cloud metadata is names and sizes only. A phone is not a background file host. Locally hosted files are not globally available after that device is off or the app is closed.

The Asset Node exposes **authorized assets**, not a creator's filesystem.

## 5. Airtime is the only hosting clock

Live hosting still burns Airtime Credits when that subsystem is on. It does not define the Creator OS.

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

## 6. Money follows the session, never the clock

Allowed:
- Tips (fiat / V¢) during a live
- Creator subscriptions
- Paid Works and digital asset sales (later)
- Post-session products: replay, episode, stems, transcript, measured packs
- Premium tools

Forbidden:
- Buying ATC
- Paying for default listen access
- Paying for rank or homepage placement

**Ticketed events stay out of this lock** unless a later decision says otherwise.

V¢ remains purchasable utility for tips and cosmetics. It never buys search placement, stream ranking, or ATC.

Monetization must not block the first Creator OS release.

## 7. Session provenance

A sealed public live may emit a downloadable package (`.vprov`) and an in-app verification report. It is a host-downloadable proof that a verified human ran a real-time VYBZ session. It does not prove the music was not AI-generated.

- Binds to `live_sessions`, never Living Mix, never 1:1 `liveSession.ts` calls.
- **Full** strength only when that live consumed ATC. Otherwise **thin**.
- Copy is **Session provenance**, never “Human certified.”
- **No “not AI” proof.** Presence, ATC, and a hash cannot measure that.
- An audio SHA is measured only from stored bytes; a client DAW digest is declared; missing reads **Not measured**. C2PA ledger events are counted; the file C2PA box is **Not measured**.
- “Validate Humanity” associates a file with verified VYBZ creation sessions. It does not claim omniscient knowledge of work outside the observable system. The MVP sentence is: “This file is associated with verified VYBZ creation sessions.” It must not say VYBZ mathematically proves no AI was involved.

## 8. Speech

Hosting is **viewpoint-neutral**. We do not kill a live because the take is unpopular.

We still do not host illegal content (CSAM, true threats, and the rest of that legal floor). That is law, not a vibe filter.

## 9. Honesty of Measurement

Three kinds of label, never mixed:

| Kind | Source | What we may say |
|---|---|---|
| **Declared** | Filename, host-typed title, “this file is the recap” | What a person wrote |
| **Measured** | Duration, peak, RMS, BS.1770-4 LUFS, sample rate, channels, content SHA, ATC burned | Computed from the bytes or the ledger |
| **Inferred** | Analysis that has no evidence | **Not used.** Unknown reads **Not measured**. |

## 10. What we refuse

- **No public vanity metrics:** No follower counts or fake play counts as social proof.
- **No purchasable attention:** Money cannot buy live ranking, "featured" tags, fake listens, or ATC.
- **No dating, romance, meetup or swipe matching:** Permanently out of scope.
- **No fabricated measurement:** Everything unmeasured reads **"Not measured"**.
- **No “not AI” proof.**
- **No undisclosed processing on the play path.**
- **No killing a live for an unpopular take.** Illegal content is still refused.
- **No rewrite** to change product gravity. Adapt what exists.
- **No silent publication** of local files.
- **No new recurring vendor** when an existing system or a local/self-hosted path will do.

## 11. Preservation — Hide, Never Delete

**Nothing already built is deleted.** The sample pack pipeline, marketplace, analyzer, correction desk, translation lab, stem maker, MIDI maker, converter, rooms, live sessions, messages, projects, visualizer studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable, and keep compiling.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes still resolve. Code still compiles.

## 12. Interface Direction

- **Workspace-first:** default UI leads with the creator's work. Live, profile, and network surround it.
- **Evolve the existing VYBZ theme.** No wholesale redesign. No generic dashboard template. Premium means hierarchy, spacing, type, and motion on the current DNA.
- **Host profiles are not artist-only.** Talk, podcast, music, image, video, and software share `/u/:id`.
- **Auto-adjusting** across phone, companion, and desktop studio.
- **Dark, restrained, workstation-grade.**

## 13. Delivery Vocabulary

A capability is delivered only when it is implemented, integrated, reachable, discoverable, deployed, production-verified, and changes what a user can do.

Permitted states — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

## 14. Definition of Success

A creator signs in, enters their Workspace, registers creative files from a device they control, sees them in Library without giving up the originals, organizes a Work, chooses what becomes public on their Creator Profile, and can VYB or Follow another creator.

If they go live while creating, the session can later be associated with the Work as session provenance.

Nobody had to buy the right to be heard. Nobody had to buy the right to listen. Nobody had to upload their entire catalog to be organized.
