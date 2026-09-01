# VYBZ

> **The only authority.** What we are building and what we refuse to build.
> Machine-enforceable rules live in [`src/product/invariants.ts`](./src/product/invariants.ts).
> Where this document and that file disagree, the file wins and this document gets fixed.
>
> Version 9 · 2026-08-21 · supersedes Version 8 (Creator OS as product identity, 2026-08-21), Version 7 (live audio as product identity, 2026-08-18), Version 6 (Stage File + ATC meter, 2026-08-18), Version 5 (session provenance, 2026-08-17), Version 4 (ATC, 2026-08-17), Version 3 (Live Mix Platform), Version 2 (Pack Suite) and Version 1 (The Station).
> Also supersedes the 2026-08-11 song/release Creative OS brief: music is a specialization, not the unit.
> Decisions: [`0011`](docs/decisions/0011-living-profile.md) (Living Profile identity) · [`0010`](docs/decisions/0010-creator-os.md) (Creator OS as what the living profile becomes) · [`0004`](docs/decisions/0004-live-mix-streaming-platform.md) (live rooms) · [`0005`](docs/decisions/0005-airtime-credits.md) (how hosting is gated) · [`0006`](docs/decisions/0006-session-provenance.md) (what a live session can prove) · [`0007`](docs/decisions/0007-artist-stage-file.md) (public profile) · [`0008`](docs/decisions/0008-atc-unmeasured-mints.md) (reception / referral do not mint yet) · [`0009`](docs/decisions/0009-live-audio-for-any-host.md) (who may host — live remains any-host, not the product identity).

---

## 1. The problem

A person should not enter VYBZ and choose between Dashboard, Creator Studio, Library, Profile, Social, Workspace, Live, Store, Tools, and twenty other doors.

Social apps treat creation as content. Storage apps treat files as objects with no identity. Music tools assume every creator is finishing a song. Live apps assume the product is the stream. Creator workstations bury the human under systems.

**That is the hole: there is no social identity whose living profile becomes a creative operating system when the person creates — private library, public presence, and a network — where original work stays theirs.**

Live rooms remain a real-time stage inside that identity. They are not the definition of the product. The Creator Operating System is what the living profile becomes. It is not a separate app.

## 2. What VYBZ is

**VYBZ is a living social identity that becomes a creative operating system when you create.**

Not a sample-pack app. Not music-only. Not a creator workstation where the profile is a submenu. Not another social network that happens to host files.

This supersedes Version 8's sentence that VYBZ should feel like a **creative operating environment with a social layer**. The stronger model:

**VYBZ is a social identity environment whose living profile becomes a creative operating system for anyone who creates.**

The human is the root object. Their VYBZ is the interface. Their Library supplies it. Their Creative Work gives it substance. Their relationships make it social. Live makes it present. Customization makes it theirs.

The fundamental unit of creation is **Creative Work**. A Work may contain one or many assets. A song is a specialization. So is an image, a film, a game build, a plugin, a sample pack, a preset, or a document.

Someone may join only to follow, watch, comment, chat, collect, and participate. Creation is optional. There is no separate Creator Account. Nothing asks **ARE YOU A CREATOR?**

The loop:

**Join → Your VYBZ exists → Follow / watch / talk / explore → Add something when you want → Library → Work / Project / Collection → Contextual tools → Private / share / publish → It becomes part of your VYBZ → People experience it**

There is no point where somebody has to switch into Creator Mode.

## 3. Constitution

These laws are checked against every design decision, route change, feature, and migration.

1. **One Identity.** One VYBZ identity. Discipline labels are optional metadata, never identity prisons. No forced creator onboarding.
2. **One Profile.** Profile and Dashboard are two perspectives on the same living object. Owner = control mode. Visitor = experience mode. Same identity, same data, same surface, different permissions.
3. **One Library.** Upload once, register once, organize once, then decide where it appears. Do not duplicate the underlying asset because it shows in multiple places.
4. **Profile Is The Product.** The profile cannot be relegated to `/profile` while a generic dashboard becomes the real app. Everything else emerges from it.
5. **Community First.** Messaging, following, comments, VYBs, collections, discovery, livestream participation, sharing, and interaction are first-class with zero published work.
6. **Creative Work is universal.** The unit is not a song.
7. **Tools serve Work.** Pack Maker, Correct, Art Check, Stem Maker, and the Store are capabilities, not kingdoms.
8. **Refine before replacing.** Reuse over replacement. Extension over reinvention. Hide, never delete. No rewrite to change gravity.
9. **Customization without chaos.** Structured modules, layout, type, media, motion — not unrestricted JavaScript or application-breaking CSS.
10. **Private by default, public by intent.** A file entering VYBZ does not automatically become content. Indexing is not publishing.
11. **Social signals inform, not manipulate.** Notifications report what happened. They do not manufacture urgency.
12. **The interface gets quieter as VYBZ gets more powerful.** More capability must not equal more permanent navigation.

## 4. Surfaces

| Surface | Job | Primary Role |
|---|---|---|
| **Home** (`/`) | People-first social landing. Live, people, rooms, work | **Signed-in landing** |
| **My VYBZ** (`/u/:id`) | Living profile. Owner dashboard and visitor experience are one Stage File | **The product** |
| **Workspace** (`/workspace`) | Archived private desk. Hub folds into the Stage File. Wallet still at `?tab=wallet` | **Archived from nav** |
| **Library** (`/library`) | Authorized works and assets, local and published. Owner layer, hidden from default chrome | **Catalog** |
| **Network** (`/connect`, `/live`) | People, who is live. `/feed` redirects to Home. Reachable from Search, not a permanent kingdom | **Discovery and relationships** |
| **Live room** (`/live/:id`) | Host + listeners, chat, presence, Airtime meter. Target: profile banner state | **Live Creation** |
| **Devices** | Desktop / mobile Asset Nodes and availability. Node is a Search and + tool at Library This device — not a rail kingdom. | **Local originals** |
| **Studio rooms** (`/rooms`, `/projects/:id`) | Multi-human collab. Still in the tree | **Co-Production** |
| **In-session desks** (`/tools/*`) | Existing DSP / stem / MIDI / translation desks | **Toolkit** |
| **DAW bridge** | Master-bus ingest when the host is in a DAW | **Studio ingest** |
| **Marketplace** (`/market`, `/pack/:slug`) | Post-session products, not the hosting clock | **Session money** |
| **Living Mix** (`/library/mix`) | Catalog sequencer. Not a public live | **On-demand mix** |

Do not add navigation for functionality that does not exist.

The public Creator Profile (`/u/:id`) is the host Stage File. Talk, podcast, music, and other disciplines share it. Connect is a request. Booking is a message, not a calendar. Works render through a module registry — audio, image, video, file (download), project, link, text, and collection — so a new kind registers a renderer instead of forking the profile. 3D and games are later.

Live Creation reuses LiveKit. Go Live leads with screen/window, then audio. Creator identity, viewer access, public chat, the Stage File, and `live_sessions` logging stay. Live should become a **profile banner state**, not a disconnected destination. That remaining chrome change is later than this lock. `/live` stays reachable; it is not a permanent nav item.

The Network reuses VYB on works, Live discovery, direct messages, and activity. **Follow** is a unidirectional subscribe so a creator's public work can land in Following. It is not Connect. Connect remains a request. No public follower counts.

**Explore on Home** lists public work to hear. It reuses `discovery_feed`. Follow a Stage File so it lands in Following. The Node tool opens Library This device (`/library?tab=device`) from Search and +. It is not a rail kingdom.

Default chrome is **the menu**. Search, +, Chat, Alerts, and Me live in the drawer. Alerts appears once, in that drawer — not on the rail, not on the dock. When the person hits Me, they are home. Discover can emerge from Search. Library, Live, Network, and Workspace stay in the tree.

## 5. Local-first originals

The VYBZ cloud is the authentication, identity, social, metadata, discovery, permissions, signaling, and provenance plane.

Original creative files stay on the creator's device by default. Indexing is not publishing. Sharing is explicit. Public exposure is explicit.

Availability must be honest: **Available now**, **While this app is open**, **On another device**, **Unavailable here**, **Public**, **Private**. Cloud metadata is names and sizes only. A phone is not a background file host. Locally hosted files are not globally available after that device is off or the app is closed.

The Asset Node exposes **authorized assets**, not a creator's filesystem. Relative paths must stay inside the authorized folder. Cloud metadata still has no file bytes. Transport reuses the existing Content-Security-Policy. This is the start of hardening, not a completed security audit.

## 6. Airtime is the only hosting clock

Live hosting still burns Airtime Credits when that subsystem is on. It does not define the product.

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

## 7. Money follows the session, never the clock

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

Monetization must not block the first Living Profile release.

## 8. Session provenance

A sealed public live may emit a downloadable package (`.vprov`) and an in-app verification report. It is a host-downloadable proof that a verified human ran a real-time VYBZ session. It does not prove the music was not AI-generated.

- Binds to `live_sessions`, never Living Mix, never 1:1 `liveSession.ts` calls.
- **Full** strength only when that live consumed ATC. Otherwise **thin**.
- Copy is **Session provenance**, never “Human certified.”
- **No “not AI” proof.** Presence, ATC, and a hash cannot measure that.
- An audio SHA is measured only from stored bytes; a client DAW digest is declared; missing reads **Not measured**. C2PA ledger events are counted; the file C2PA box is **Not measured**.
- “Validate Humanity” associates a file with verified VYBZ creation sessions. It does not claim omniscient knowledge of work outside the observable system. The MVP sentence is: “This file is associated with verified VYBZ creation sessions.” It must not say VYBZ mathematically proves no AI was involved.

## 9. Speech

Hosting is **viewpoint-neutral**. We do not kill a live because the take is unpopular.

We still do not host illegal content (CSAM, true threats, and the rest of that legal floor). That is law, not a vibe filter.

## 10. Honesty of Measurement

Three kinds of label, never mixed:

| Kind | Source | What we may say |
|---|---|---|
| **Declared** | Filename, host-typed title, “this file is the recap” | What a person wrote |
| **Measured** | Duration, peak, RMS, BS.1770-4 LUFS, sample rate, channels, content SHA, ATC burned | Computed from the bytes or the ledger |
| **Inferred** | Analysis that has no evidence | **Not used.** Unknown reads **Not measured**. |

## 11. What we refuse

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
- **No forced creator onboarding.** No “ARE YOU A CREATOR?”
- **No generic dashboard** of stat cards and sidebars as the product. The interface says “here you are,” not “here are all the systems VYBZ contains.”

## 12. Preservation — Hide, Never Delete

**Nothing already built is deleted.** The sample pack pipeline, marketplace, analyzer, correction desk, translation lab, stem maker, MIDI maker, converter, rooms, live sessions, messages, projects, visualizer studio, sparks, reception, Living Mix, and Vibes Radio stay in the tree, stay reachable, and keep compiling.

Surfaces leaving the default experience are **hidden from navigation**, not removed. Routes still resolve. Code still compiles.

## 13. Delivery Vocabulary

A capability is delivered only when it is implemented, integrated, reachable, discoverable, deployed, production-verified, and changes what a user can do.

Permitted states — never "complete":

`DOCUMENTED ONLY` · `STUB OR SCAFFOLD` · `INFRASTRUCTURE ONLY` · `NATIVE-PLATFORM ONLY` ·
`PARTIALLY IMPLEMENTED` · `IMPLEMENTED BUT NOT DELIVERED` · `DEPLOYED BUT UNVERIFIED` ·
`DELIVERED AND PRODUCTION-VERIFIED`

## 14. Interface Direction

- **Logged-in home is the people-first social landing.** `/` shows connections, live cards, recent activity, and discovery. The owner's Stage File lives at `/u/:id` (same object as the public VYBZ, owner perspective). **That Stage File is the owner dashboard.** `/workspace` stays reachable; it is not a second home. **Open public VYBZ** and **My VYBZ** live in the identity menu — not a competing Home vs My VYBZ pair. `/feed` redirects to `/`.
- **Default chrome** is the menu. Search, +, Chat, Alerts, and Me live in the drawer on every viewport. **PrimaryRail** stays in the tree, unmounted. The signed-in Home centers the VYBZ mark as a gentle audio-reactive neon pulse. Library, Network, Live, and Workspace also stay reachable by URL and from owner controls. Frozen `MobileNav` and `SuiteAppRail` stay unmounted.
- **One Stage File, two perspectives.** Owner sees Library, Go live, Edit, Arrange, Hide, and View as Visitor. Visitor sees the experience. Preview never runs Connect, Follow, Message, or Tip against your own identity. Workspace is not an owner door.
- **Chat is Chat. Alerts is Alerts.** Message events badge the Chat control. Alerts never lists messages. No second Alerts icon on the rail or the dock.
- **Works go through a module registry.** Audio, image, video, file (download), project, link, text, and collection each have a renderer. Unknown kinds do not crash the Stage File. 3D and games are later.
- **Library places work on your VYBZ.** Upload audio, image, video, or a file. It stays private until you Place it. Select a file you already have. Place on your VYBZ. Choose Works or Featured. Done. No second upload. No second catalog. Library is a media gallery. Cinema, grid, list, table, and shelves. Full-screen visual. Sound starts on tap. Cinema overlay is one bar of kinds and tools; it recedes while you watch. Header is Works, This device, and Upload — Mixes, Projects, and scans stay in More. Cinema tools stay put; kinds scroll. Library counts works, not tracks. Cinema empty stays the gallery. Playing work shows progress on the tile. Tap progress to move in the work. Arrows move between works. Space is a tap. Arrows do not start sound. Full-screen visual: Space is a tap. Video uses the stage, not native controls. Arrangement is remembered.
- **The owner can Arrange existing Stage File modules.** Order is remembered on the profile. Empty modules omit. Identity chrome stays fixed. No theme engine. No custom CSS or JS.
- **The owner can hide existing sections** from the public VYBZ. Hidden sections stay available in Arrange. Add, rename, and invent sections are later. No theme engine.
- **Generate is a tool, not a surface.** + → Generate makes a private Library file through the local Stable Audio 3 worker. It is labeled generated. Powered by Stability AI. It is not placed on My VYBZ until you Place.
- **Phase 2 — living Profile.** Owner Stage File at `/u/:id` adds ambient attention indicators (messages, alerts, live in the banner) without dashboard panels. Signed-in `/` is the people-first social landing. **Open public VYBZ** and **My VYBZ** live in the identity menu. Every essential experience must have an equivalent — semantic structure first; Echo later.
- **Host profiles are not artist-only.** Talk, podcast, music, image, video, and software share `/u/:id`.
- **Auto-adjusting** across phone, companion, and desktop studio.
- **Dark, restrained, workstation-grade** — without presenting as a SaaS control panel.

## 15. Definition of Success

The first convincing Living Profile release proves five things:

**A.** My VYBZ is one tap away — owner Stage File at `/u/:id`.  
**B.** It looks like a portfolio to visitors and a quiet control surface to you.  
**C.** I can add several different forms of Creative Work to it.  
**D.** People can socially interact with me and my work.  
**E.** The interface stays extremely quiet until I ask it to do something.

A signed-in person lands on the people-first home at `/`. My VYBZ (owner Stage File) is at `/u/:id`. That Stage File is the owner dashboard. Workspace at `/workspace` is still in the tree. Default chrome is quiet: one Chat, one Alerts. Owner and visitor share one Stage File. Owner sees controls. Visitor sees experience. **View as Visitor** lets the owner check the public VYBZ.

A person may register creative files from a device they control, see them in Library without giving up the originals, organize a Work, choose what becomes public on their VYBZ, and can VYB or Follow another person.

If they go live while creating, the session can later be associated with the Work as session provenance.

Nobody had to buy the right to be heard. Nobody had to buy the right to listen. Nobody had to upload their entire catalog to be organized. Nobody had to declare themselves a creator to belong.
