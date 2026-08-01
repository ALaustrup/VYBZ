> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# VYBZ ΓÇö Ideas Backlog (save points between phases)

> **Purpose.** A low-friction place to capture the owner's ideas *as they happen*
> without detouring the active development plan. Ideas land here for analysis;
> when one is ready, it graduates into a sequenced phase in `VYBZ_MASTERPLAN.md`.
>
> **Current platform release:** **Beta-0B** ΓÇö see `VERSIONING.md` / `CHANGELOG.md`.
> This backlog is not versioned per label; promote ideas into the masterplan when ready.
>
> **Ritual.** At each phase boundary (before starting the next phase) the agent
> asks: *"Any new ideas to bank before we continue?"* New ideas are appended
> below with a short analysis (fit / dependencies / guardrails / rough shape).
> Nothing here is committed to build until it's promoted into the masterplan.
>
> **Legend:** ≡ƒƒó ready to plan ┬╖ ≡ƒƒí needs infra/keys ┬╖ ≡ƒö┤ needs research/decision.

---

## Idea log

### 2026-07-28 ΓÇö ACTIVE: Tip + live + catalog launch loop ≡ƒƒó
- **What:** Official GTM wedge ΓÇö indie artists upload ΓåÆ `/u/:id` ΓåÆ tip (Vc) ΓåÆ live.
  Marketing landing + alpha waitlist; cosmetics primary, tips secondary.
- **Status:** **Active build** (see masterplan GTM). Do not divert into VR or
  dating-first chrome until this loop is profitable.

### 2026-07-27 ΓÇö Engagement loops + VYBZ Immersive (3D / VR) ≡ƒö┤ PARKED
- **What:** Retention systems that keep creators returning daily, plus a fully
  interactive 3D/VR ΓÇ£VYBZ WorldΓÇ¥ where listening, collab, and live become spatial.
- **Status:** **Parked for launch era** (freeze per masterplan GTM). Near-term
  engagement loops (Daily Drop, Listen Circles, etc.) may graduate later; Immersive
  / VR stays frozen. If revived, reuse AudioBus as the single clock.

#### A. Engagement / habit loops (near-term, web-first)
1. **Daily Drop Ritual** ΓÇö personalized morning ΓÇ£3 tracks for your vibeΓÇ¥ + optional
   voice prompt (ΓÇ£what are you making today?ΓÇ¥) ΓåÆ For You radio. Streak Vc micro-grant.
2. **Listen Circles** ΓÇö ephemeral 24h co-listen rooms (friends / role-class). Shared
   VDock queue + stage; reactions float on the cinema strip.
3. **Creator Pulse** ΓÇö when someone you rate/favorite goes live or drops, Orb
   pulse + one-tap Join (reuses live priority already on NowPlayingStage).
4. **Collab Bingo / Weekly Challenge** ΓÇö genre or stem challenge; public board of
   entries; winners get Vizualz unlocks + Vc.
5. **Taste Graph transparency** ΓÇö ΓÇ£Why this trackΓÇ¥ chip on For You (roles, ratings,
   listen time, list adds) ΓÇö trust ΓåÆ more ratings ΓåÆ better radio.
6. **Session souvenirs** ΓÇö after a meaningful listen (ΓëÑ50%), offer a shareable
   Wave-comment card / Vizual clip still with track + ~addr.
7. **Return hooks** ΓÇö unfinished feedback notes, open collab invites, and ΓÇ£your
   drop got 3 new listensΓÇ¥ as soft Orb badges (not spam email first).

#### B. Spatial / 3D web (bridge to VR)
1. **Orb Planetarium** ΓÇö WebGL sky of drops as glowing orbs; proximity = preview
   audio from AudioBus; grab to queue. Desktop + Quest browser.
2. **Studio Floors** ΓÇö persistent rooms per genre/DAW; avatars near a booth hear
   that boothΓÇÖs stage visual + track (positional audio later).
3. **Drop Monoliths** ΓÇö each release is a 3D totem with Vizualz as emissive
   material; walk around to scrub waveform (maps to `seekFraction`).

#### C. Full VR ΓÇö ΓÇ£VYBZ ImmersiveΓÇ¥ (mind-blowing north star)
- **Fantasy:** Put on a headset ΓåÆ emerge in a neon harbor / canyon city of sound.
  Your VDock is a wrist deck; the cinema stage is a sky-theater; friends are
  volumetric or stylized avatars; going live opens a floating amphitheater that
  *overrides* the sky-theater (same priority model as web: live > track visual).
- **Pillars:**
  1. **One clock** ΓÇö AudioBus (or Immersive fork) remains the audio authority;
     all visual layers slave to it (learned from web stage sync).
  2. **Presence** ΓÇö see whoΓÇÖs listening to the same drop; ghost trails of recent
     visitors on a trackΓÇÖs monolith.
  3. **Creation in-world** ΓÇö drag stems onto a table ΓåÆ intent-mix / collab invite;
     Visualizer Studio as a VR booth with hand-tracked FX pads.
  4. **Economy** ΓÇö tip jars as physical objects; Vc orbs you can toss to performers.
  5. **Safety** ΓÇö identity-first avatars, personal space bubble, mute/block, no
     anonymous lurkers in intimate rooms.
- **Stack sketch:** WebXR (Quest / PCVR browsers) first via `three` / `react-three-fiber`
  + Web Audio positional nodes fed by AudioBus analyser; later native if needed
  (Unity/Unreal) only if WebXR hits a ceiling. LiveKit spatial rooms for voice
  booths; HLS/WebRTC for sky-theater live.
- **Phased path:** (1) WebGL planetarium on `/immersive` desktop ΓåÆ (2) WebXR
  controller locomotion ΓåÆ (3) persistent world shards ΓåÆ (4) native shell if demanded.
- **Guardrails:** motion comfort (SSW options, vignette, teleport), hearing health
  (level guard), GPU budget (one stage video decoder ΓÇö same lesson as web), and
  never block the 2D app; Immersive is an opt-in layer.
- **Fit:** Aligns with music-first VYBZ, Vizualz, live priority, For You, and Vc.
  Large; promote only after cinema stage + listen loops feel excellent on 2D.

---

### 2026-07-27 ΓÇö Music Hub + Connection Lab (clarified) ≡ƒƒó
- **What:** SoundCloud ├ù Spotify ├ù Twitch as the product; Hub feed (live + trending);
  waveform comments; optional 18+ Connection Lab spice (romance/meetup/adult intents)
  without overwhelming the music majority. Legal Terms/Privacy/AUP v2ΓÇô3 aligned.
- **Status:** **In progress / promoted** ΓÇö UI hub + legal shipped in this pass; AI playlists,
  donation goals, full collab playlists continue on the same spine.

---

### 2026-07-19 ΓÇö "Live & Video" cluster
Five related ideas, captured together. They split cleanly across three buckets:
things that reuse what we have (do soon), things gated on infra/cost, and one
Trust & Safety must-have.

#### 1. Private 1:1 cam-to-cam in chat ≡ƒƒí
- **What:** optional, high-quality, private video call between two connected
  creators inside DMs.
- **Fit:** extends the shipped **H1 live 1:1 audio** WebRTC path (┬ºK) ΓÇö add a
  camera `MediaStream` (video track) to the existing peer connection + local/
  remote video tiles. Signaling + connection model already exist.
- **Security/privacy:** WebRTC is P2P and encrypted (DTLS-SRTP) ΓÇö no server sees
  the stream. Identity-first: both sides are real, connected creators; both must
  explicitly opt in to go live; no recording by default.
- **Dependency:** **TURN** server for NAT traversal reliability (already on the
  infra-gated backlog, ┬º4.1). Works on good networks without it; unreliable on
  strict NAT until TURN exists.
- **Guardrails:** consent-to-connect, in-call "end/report", camera off by default.
- **Rough shape:** moderate FE work on top of existing WebRTC; unblock fully with TURN.

#### 2. Live Streams feed ΓÇö "minimalist Twitch, built in" ≡ƒƒí≡ƒö┤
- **What:** creators broadcast what they're working on to the world (or a filtered
  audience); its own high-quality feed + a home in the dashboard.
- **Fit:** audience filtering maps to our existing **professions / role-class**
  axes + audience-restricted visibility (already in `feed_posts`). A `/live` tab
  slots beside the feed.
- **Hard part (decision needed ≡ƒö┤):** 1-to-many does **not** work over P2P. Two
  viable paths:
  - **A) Bunny Stream live ingest ΓåÆ HLS** (RTMP/SRT in, adaptive HLS out). Cheapest,
    aligns with our existing Bunny.net media strategy; needs confirmation Bunny
    supports live ingest on our plan (VOD is confirmed; live must be verified).
  - **B) LiveKit SFU** (already infra-gated on our backlog) ΓÇö lower latency, more
    infra + cost.
- **Monetization:** live tips via **Stripe Connect** (Lane A) ΓÇö on-mission (tips,
  never paywalls/ads). Per-creator, disclosed.
- **Guardrails:** identity-first broadcasters; audience scoping in stream settings;
  report affordance on every stream (see #5); no anonymous viewers.
- **Rough shape:** largest item; gated on the A-vs-B decision + infra/cost.

#### 3. Full 8K video upload support ≡ƒƒí
- **What:** ensure very-high-res video uploads are fully supported end-to-end.
- **Fit:** we already **stream** large uploads (Γëñ1 GB) via `bunny-upload`. 8K
  masters are multi-GB, so: raise the cap, move to **resumable/chunked** upload
  (Bunny TUS), and transcode to **adaptive HLS via Bunny Stream** for playable
  delivery (raw 8K is unplayable for most viewers).
- **Dependency:** Bunny Stream library (already noted as gated in ┬º4.1).
- **Guardrails:** per-uploader storage awareness (cost); format/size validation.

#### 4. Uploader-managed content library (all media) ≡ƒƒó Γ£à SHIPPED 2026-07
- **What:** original uploader can manage everything they've uploaded.
- **Fit:** the **Uploads/Library dashboard** (Phase 3) already does this for drops
  (rename / feature / delete). Generalize it to video + all content kinds ΓÇö mostly
  an extension, not new infra.
- **Rough shape:** smallΓÇômoderate; do alongside #3's video work.
- **Γ£à Shipped (2026-07):** `/library` ΓÇö Drops + Posts + Stages tabs; V-Dock pin /
  More drawer; Profile ΓåÆ Library.

#### 5. Universal one-tap "report illegal content" flag ≡ƒƒó ΓÜæ Γ£à SHIPPED 2026-07
- **What:** a simple, optional flag/report button on **every** piece of uploaded
  content (drops, project posts, video, streams).
- **Fit:** the **reporting + staff/moderation backbone already exists**
  (`ReportModal`, reports, mod/staff system ┬º12.5). This is mostly surfacing the
  affordance consistently everywhere + a fast path for "illegal content."
- **Why prioritize:** legal / DMCA / Trust & Safety obligation (see masterplan
  Legal ┬º). Low effort, high protection ΓÇö strong candidate to pull forward as a
  small standalone item rather than waiting on the full Live cluster.
- **Rough shape:** small; can ship independently and early.
- **Γ£à Shipped (2026-07):** promoted and delivered as a reusable `ReportButton`
  on drops (`TrackCard`), project posts + gallery images (`ProjectView`), and the
  home feed (`FeedPostCard`) ΓÇö feeding the existing `content_reports` ΓåÆ mod queue
  (reasons incl. "Illegal"). See masterplan ┬º12.21. E2E-verified end to end.

**Suggested grouping when promoted:**
- Pull **#5** forward as a small, independent T&S item (not infra-gated).
- Bundle **#3 + #4** into a "Video pipeline" phase once a Bunny Stream library exists.
- Treat **#1 + #2** as a "Live" phase, unblocked by TURN (#1) and the Bunny-live /
  LiveKit decision (#2).

### 2026-07-19 ΓÇö "V┬ó (VYBZ Credit)" ΓÇö a platform value unit ≡ƒö┤ (needs decision + legal)
- **What (owner):** introduce **V┬ó = "VYBZ Credit"** as the platform's transacting
  unit that facilitates *all* value exchange ΓÇö tips, paid services, commissions,
  user-to-user payments. **Never required for anything**; purely an *optional* way
  to support creators and pay for services rendered.
- **Why it's compelling:** one coherent vocabulary + rail for every money moment
  (tips O3b, commissions O3, cosmetics Lane B) instead of separate one-off Stripe
  flows. A single "wallet" UX is friendlier and unifies the economy.
- **ΓÜá∩╕Å Two things to resolve before this can be promoted:**
  1. **It revives a scrapped concept.** The clean rebuild explicitly *removed*
     unrelated platform-economy units (masterplan ┬º0 Correction of record).
     Reintroducing V┬ó is an owner-level mission decision, not a routine feature.
     It can be done ΓÇö but ┬º0 must be amended deliberately.
  2. **Money-transmission / regulatory exposure.** The design hinges on ONE
     question: **can V┬ó be cashed OUT?**
     - **Closed-loop, spend-only** (buy V┬ó with Stripe ΓåÆ spend on
       tips/commissions/cosmetics; creators receive **real money via Stripe
       Connect**, never a withdrawable V┬ó balance): lowest risk, cleanest, most
       on-mission. V┬ó is essentially prepaid credit the *payer* holds.
     - **V┬ó balance that creators cash out** (stored value + payout): this is
       **money transmission / stored value** ΓåÆ likely triggers licensing, KYC/AML,
       escrow, chargeback handling, and tax reporting (1099-K). Do **not** build
       without legal counsel.
     - **Crypto/on-chain token**: off-mission (┬º0), highest regulatory risk ΓÇö
       recommend hard no.
- **Recommended framing (my take):** promote V┬ó **only** as a **thin, closed-loop
  layer over Stripe Connect** ΓÇö a branded unit (fix a ratio, e.g. `100 V┬ó = $1`)
  that the *payer* prepurchases or spends inline, while creator earnings always
  settle as real money through Stripe Connect (never a withdrawable in-app
  balance). That keeps the "no ads / no paywalls / not required for anything"
  guardrails intact and sidesteps the money-transmitter problem, while still
  giving the unified "V┬ó everywhere" experience.
- **Dependencies:** Stripe keys (same block as O3b). Best sequenced as the
  *presentation + accounting layer* built on top of O3b's Stripe Connect rails ΓÇö
  i.e. do O3b first (real-money tips), then optionally wrap it in V┬ó.
- **Open decisions for owner:** (a) amend ┬º0 to allow V┬ó? (b) closed-loop
  spend-only vs. cash-out? (c) fixed ratio + pricing? (d) does V┬ó replace or sit
  beside direct-dollar tipping?

### 2026-07-24 ΓÇö Visual reactivity cluster + unified Social / Live

Three visual concepts (**#1ΓÇô#3**) plus a sharp Live/Rooms pivot (**#4**).
**#1ΓÇô#3** share one reactive FX runtime. **#4** replaces fragmented Live tiers /
scrapped ΓÇ£ClubzΓÇ¥ with one ultra-low-latency broadcast standard and **premium
text+voice rooms** monetized via recurring **V┬ó** ΓÇö analysis only until promoted.

> **Hard gate:** nothing below is promoted or coded until it lands in
> `VYBZ_MASTERPLAN.md` with explicit sequencing. Analysis only.
> The ΓÇ£output Phase 1 schema nowΓÇ¥ ask is **not** development ΓÇö see #4 sketch.

---

#### 1. High-quality visualizer backdrops on New Drop (upload + crop + reactive editor) Γ£à **PARTIAL / SHIPPED**

- **Shipped:** Compose ΓåÆ upload video/still via Bunny public CDN ΓåÆ stored on
  `playback_customization.backdropUrl` (+ fit/dim). DropStage composites under
  reactive WebGL/Canvas layer; TrackCard + GlobalPlayer pass through. Cover/Fit
  + dim controls. Off/Soft/Max + reduce-motion respected.
- **Still open:** Pop-out visual editor; interactive spatial crop; Live tile reuse.
- **What:** During New Drop, upload a high-quality **video backdrop** that fills
  the audio-player / track banner (where the seeded visualizer lives today).
  Include user or auto **crop/fit** so every video matches the banner aspect.
  Optional **visual editor** (pop-out) to layer customized, **audio-reactive**
  effects on top of the video so drops stand out without fighting playback.
- **Fit:** Extends Phase **E** + existing `playback_customization` /
  `TrackVisualizer` / New Drop upload path. Bunny already streams large media;
  public zone for post media, secure zone for protected drops. Natural home is
  drop metadata + player banner compositing, not a separate product.
- **Dependencies:**
  - Aspect / crop pipeline (client canvas or Bunny Stream transform) ≡ƒƒí
  - Storage cost + duration caps (short loop vs long video) ≡ƒƒí
  - Shared FFT from `AudioBus` for reactive overlays (already exists) ≡ƒƒó
  - Performance budget on mobile (decode + WebGL/canvas under Soft / Max) ≡ƒƒí
- **Guardrails:**
  - Backdrop must **never** block play/pause, scrub, or Orb control.
  - Listener intensity prefs (Off / Soft / VYBZ Max) must mute or simplify
    reactive layers ΓÇö same contract as Orb.
  - Auto-crop defaults; manual crop is opt-in polish, not required to publish.
  - Watermark / report affordances still apply to uploaded video.
  - Do **not** claim ΓÇ£highest quality visualizers in existenceΓÇ¥ in product copy;
    ship a measurable quality bar (fps, GPU fallback, mobile Soft profile).
- **Rough shape:** moderate. Sequence: (a) upload + fit into banner slot,
  (b) audio-reactive overlay presets, (c) optional editor. Prefer promoting with
  **#2** as one **Reactive Media** phase so Orb + drop banner share one effect
  runtime.
- **Orchestration note:** One compositor API (backdrop layer + reactive layer +
  seeded fallback) used by TrackCard, GlobalPlayer banner, and later Live (#3 / #4).

---

#### 2. V-Dock Orb ΓÇö highest-quality audio-reactive visualization Γ£à **PROMOTED / SHIPPED (WebGL2)**

- **Shipped:** WebGL2 SDF Orb (`orbEngine.ts`) + Canvas2D fallback; DropStage
  compositor for banners; shared `ReactiveRenderContext`; material chrome tokens;
  voice slot lights. Soft/Max + reduce-motion respected.
- **Still open:** WebGPU/WGSL path; video backdrop upload (#1); cosmetic packs
  (Lane B); Live tile reuse (#3).
- **Guardrails:** Orb stays V-Dock identity; creatively open (any drop).

---

#### 3. Live stream windows ΓÇö audio-reactive + high-end visualizers Γ£à **PARTIAL / SHIPPED**

- **Shipped:** Social Top-3 + Live list `LiveTileStage` (DropStage ambient);
  Watch page stage overlay via upgraded `LiveVisualizer` + SFU `onAnalyserStream`;
  Soft/Max/Off; broadcast bezel on watch/tiles.
- **Still open:** Host-chosen live FX packs; HLS-only audio path polish.
- **What:** Live stream UI windows react to audio the same way the player does,
  with deep customization and top-tier visualizers.
- **Fit:** Phase **G** live sessions + H1 DM live audio already touch WebRTC /
  `AudioBus`. Watch page / room live tiles should tap the **same** analyser
  graph as GlobalPlayer when the live source is the audible focus (or a
  dedicated analyser on the live `MediaStream`). Under **#4**, this becomes the
  default aesthetic layer on the **single** public live tier (not a paid FX tier).
- **Dependencies:**
  - Correct audio graph: live `MediaStream` ΓåÆ Analyser ΓåÆ destination sink
    (H1 already taught this lesson) ≡ƒƒó pattern / ≡ƒƒí per surface
  - **#2** runtime quality bar first ΓÇö Live should *reuse*, not invent ≡ƒƒó
  - Scalable fan-out (SFU / Bunny VOD) for 1:N ΓÇö infra-gated ≡ƒƒí
  - TURN for reliable WebRTC ≡ƒƒí
- **Guardrails:**
  - Reactivity follows **what the user is hearing**, not a silent video track.
  - Host customization Γëá forcing heavy FX on all viewers (viewer Soft/Max).
  - High-fidelity audio routing for DAW share stays separate from visualizer
    GPU cost ΓÇö never let shaders starve audio thread.
- **Rough shape:** after #2; smallΓÇômoderate if runtime is shared. Ships as polish
  on #4ΓÇÖs unified live surface once the transport is chosen.
- **Orchestration note:** Depends on #2; optional backdrop from #1 only when
  the live source is a VYBZ drop playback, not webcam.

---

#### 4. Unified Social + Live ΓÇö scrap Clubz tiers; premium V┬ó text/voice rooms ≡ƒö┤≡ƒƒí ΓåÆ Γùæ **PROMOTED**

- **Status:** Promoted to masterplan **Phase O**. **Phase 1ΓÇô2 shipped** (schema +
  LiveKit token pipeline + Bunny VOD offload docs). Phase 3 = Social tab / Orb
  dashboard UI. See `docs/UNIFIED_SOCIAL_LIVE_PHASE1.md` + `PHASE2.md`.
- **V┬ó closed-loop decision (Phase 1):** balance = `profiles.mod_points`; no cash-out;
  5% platform fee withheld from owner share (informational ledger). Full ┬º0 V┬ó
  branding still open; mechanics unblocked for room subs.
- **Fit (evolve, donΓÇÖt parallel):**
  | Blueprint piece | Already on VYBZ |
  |-----------------|-----------------|
  | Go Live / sessions | Phase **G** + `GoLiveSheet` / `live_sessions` |
  | Rooms + Realtime text | Phase **F** ΓÇö `rooms`, `room_messages` |
  | 1:1 WebRTC | **H1** DM live |
  | Group low-latency | **LiveKit** (or equiv SFU) ΓÇö infra-gated |
  | Bunny | Upload + secure CDN; Stream/VOD for recordings |
  | Orb entry | Taskbar Orb ΓÇö extend menu, donΓÇÖt fork chrome |
  | V┬ó / `mod_points` | Cosmetic credits exist; **V┬ó as universal rail** = ┬º V┬ó ≡ƒö┤ |

- **Physics check ΓÇö ΓÇ£zero-delay / uncompressedΓÇ¥:** True zero-delay and fully
  uncompressed multi-viewer audio are **not** the same product. Honest target:
  - **Interactive stage** (host + small set of speakers / screen-share / DAW):
    WebRTC SFU (LiveKit recommended) with **music/producer mode** (minimal
    AGC/NS, stereo, high bitrate).
  - **Large audience**: still SFU or hybrid; latency is ΓÇ£ultra-lowΓÇ¥ not magical
    zero; never promise bit-perfect Ableton over the public internet.
  - **Bunny**: VOD, highlights, recorded VODs, thumbnails ΓÇö not the realtime
    mesh itself.
- **V┬ó recurring deductions (hardest part):** Weekly/monthly auto-debit of V┬ó
  for room membership requires, at minimum:
  1. Owner decisions on the **2026-07-19 V┬ó** entry (amend ┬º0? closed-loop only?).
  2. **Ledger** table (not silent `mod_points` mutation) + idempotent period keys.
  3. Edge Function / cron (pg_cron or scheduled fn) ΓÇö **not** a naive client
     trigger alone; RLS must prevent forging membership without ledger rows.
  4. Grace / dunning when balance insufficient (kick vs soft-lock premium perks).
  5. Creator payout story: if room owners ΓÇ£earnΓÇ¥ V┬ó, confirm **no cash-out**
     (closed-loop) or you re-enter money-transmitter land ΓÇö same V┬ó warning.
- **Mission guardrails:**
  - Public live stays **free to watch** (unified tier Γëá paywall on broadcast).
  - Premium rooms are **optional communities** ΓÇö never required for Studio,
    Repos, Connect, DMs, or dropping.
  - Glass / high-contrast UI must still match VYBZ Smoked-Glass + surface themes
    (avoid generic ΓÇ£AI glassmorphismΓÇ¥ drift).
  - #3 reactive visuals apply to the unified live player ΓÇö not a paid visual tier.
- **Dependencies:** LiveKit (or chosen SFU) + TURN ≡ƒƒí; V┬ó product decision ≡ƒö┤;
  Stripe top-ups already buy cosmetic credits ΓÇö map V┬ó purchase UX; Orb menu
  IA; Social tab vs current Feed/Live/Rooms pins (navigation redesign) ≡ƒö┤.
- **Rough shape:** large. Promote as **Phase G2 / F2 ΓÇö Unified Social Live**
  (name TBD). Internal phases *after* promotion (aligned to owner blueprint,
  Vite not Next):
  1. Schema + RLS + V┬ó subscription ledger/cron sketch
  2. Ultra-low-latency transport (SFU) + Bunny VOD offload
  3. Social landing (Top 3 lives + room discovery)
  4. Orb Go Live ΓåÆ Live Dashboard
  5. Premium text/voice rooms + gating hooks
- **Pre-promotion schema sketch (analysis only ΓÇö not a migration):**
  - `live_streams` / extend `live_sessions`: single quality tier, public-by-
    default, `input_mode` cam|screen, schedule fields, `vod_bunny_path`.
  - `rooms`: `kind` free|premium, `vc_price`, `billing_period` week|month,
    `perks` jsonb (drop_zone, priority_voice, theme).
  - `room_memberships`: `user_id`, `room_id`, `status`, `period_start`,
    `period_end`, `last_ledger_id`.
  - `vc_ledger` (or generalize cosmetic ledger): `debit|credit`, reason
    `room_sub`, amount, idempotency key, actor refs.
  - `room_messages` + voice channel presence (Realtime); voice media via SFU
    tokens from Edge Function.
  - RLS: premium room messages/voice tokens only if membership `status=active`
    and `period_end > now()`; live watch public for `visibility=public`.
- **Open decisions for owner (block promotion until answered):**
  1. Promote/amend **V┬ó** per 2026-07-19 (closed-loop only?) ΓÇö required for #4.
  2. Room owners receive V┬ó into closed balance only (no cash-out) ΓÇö confirm.
  3. SFU choice: **LiveKit** default vs alternate?
  4. Social tab: replace Feed pin, sit beside it, or absorb `/live`+`/rooms`?
  5. ΓÇ£Monetization parametersΓÇ¥ on Live Dashboard ΓÇö tips only, or also V┬ó goals /
     ticketed *events* without bringing back Clubz quality tiers?
  6. Accept **Vite SPA** (reject Next.js rewrite)?
- **On ΓÇ£immediately output Phase 1ΓÇ¥:** Declined as development. Sketch above is
  the orchestration target. Say **ΓÇ£promote Unified Social Live ΓÇö start Phase 1ΓÇ¥**
  after decisions 1ΓÇô6 to get the real additive migration + RLS + ledger/cron
  design, then stop.

---

### 2026-07-24 ΓÇö Orb Joystick Sphere (3D radial menu) ≡ƒƒó ΓåÆ Γ£à **PROMOTED**

#### Orb as top-down joystick + next-gen audio morph Γ£à Phase 1
- **Status:** Promoted ΓÇö Phase 1 (canvas joystick + magnetic sectors + fan a11y
  fallback) building now. Phase 2 WebGL morph remains backlog.
- See masterplan Phase **E** addendum.

---

### 2026-07-24 ΓÇö Voice slot lights + premium polish cluster ≡ƒƒó

#### A. Tricolor voice occupancy lights (rooms) Γ£à **SHIPPED**
- **Shipped:** `VoiceSlotManager` + LiveKit `ActiveSpeakersChanged` ΓåÆ G/Y/P on
  `RoomPage` VoiceBar + message authors; syncs V-Dock `voiceSlots` widget.
- **What:** In voice rooms, glowing status dots beside display names show who is
  speaking and **slot order** (max **3** concurrent voices):
  - **Green** = 1st active speaker (earliest still-talking)
  - **Yellow** = 2nd
  - **Pink** = 3rd (and final allowed simultaneous voice)
  - When a slot frees (user silent for **3s cooldown**), lower slots promote
    (pinkΓåÆyellow, yellowΓåÆgreen). A new entrant always takes the lowest free
    color (so if green+yellow busy, next join is pink). No 4th voice until a
    cooldown opens a slot after someone stops.
- **Fit:** Extends Phase **O** room voice (`joinRoomVoiceSfu` + LiveKit
  `Track` audio levels / `isSpeaking`). Pure UX premium ΓÇö not a hard SFU mute
  gate unless we later enforce server-side (start client-only).
- **Implementation sketch:**
  - LiveKit `participant.isSpeaking` + `audioLevel` ΓåÆ local slot manager
  - Ordered list of active speakers; assign G/Y/P; 3s silence timer per uid
  - Render dot next to presence / message author rows on `RoomPage`
- **Guardrails:** Visual-first; optional later ΓÇ£soft duckΓÇ¥ of 4th publishers.
  Respect reduce-motion (static dots, no pulse). Never imply paid priority
  speak slots (V┬ó rooms stay access-gated, not pay-to-talk-over).
- **Rough shape:** smallΓÇômoderate FE. Promote with ΓÇ£voice slot lights ΓÇö startΓÇ¥.

#### B. Platform-wide premium polish ideas (analysis) ≡ƒƒó
Ways to make VYBZ feel unmistakably high-end without clutter:

| Idea | How (highest quality path) |
|------|----------------------------|
| **1. Material glass system** | One shared `surface` token set (hairline, specular sweep, press depth). Apply to sheets, More drawer, room chrome ΓÇö CSS vars + framer spring, not per-page one-offs. |
| **2. Presence choreography** | Soft avatar ring pulse when online; typed ΓÇ£┬╖┬╖┬╖ΓÇ¥ with Orb-accent hue; join/leave fades. Realtime already exists ΓÇö polish motion only. |
| **3. Sonic micro-feedback** | Optional UI ticks (join voice, send, Orb snap) via tiny WebAudio blips, gated by FX intensity / user mute. Never fight the track. |
| **4. Drop provenance shimmer** | Subtle ledger-verified edge on watermarked assets (trust without badges spam). |
| **5. Match reveal** | Network/Spark: score reveal as a short Orb-palette bloom instead of a flat number. |
| **6. Live Top-3 stage frame** | Social hub: active Top 3 get a shared ΓÇ£broadcast bezelΓÇ¥ (thin reactive stroke from host audio if available). |
| **7. Haptic grammar** | Same vibrate pattern language for Orb sector snap, voice slot grant, DM ping ΓÇö muscle memory. |
| **8. Empty states as stages** | Replace flat EmptyState copy with one atmospheric still (product photography / DAW desk) + single CTA ΓÇö brand-first. |

- **Packaging:** Promote **A** alone as a Social Live polish slice, or bundle
  **A + 1 + 2** as ΓÇ£Premium Rooms Surface.ΓÇ¥ Rest stay backlog until asked.

---

### 2026-07-24 ΓÇö V-Dock Widgets system Γ£à **PROMOTED / SHIPPED**

#### V-Dock widgets beside pins (Orb locked) Γ£à
- **Naming:** Bottom chrome is **V-Dock** (not ΓÇ£taskbarΓÇ¥).
- **What:** Pins navigate; widgets are tools on left/right rails. Orb immovable.
- **Audience:** VYBZ is for **all creators**. Music-related widgets lead the first
  catalog, but widgets are **creatively unbounded** ΓÇö capture, timers, presence,
  licensing, live, V┬ó, and future chips can serve visual, film, games, writing,
  design, performance, and hybrid crafts just as well as audio. Never copy or
  gate widgets as ΓÇ£musicians only.ΓÇ¥
- **Shipped:** Full widget catalog from the concept bank + Now Playing system
  widget + customize tray (pins + widgets). Layout key `vybz.vdockLayout`
  (migrates `vybz.taskbarPins`).
- **Code:** `src/components/vdock/*`, `src/lib/vdock/*`.

##### Widget concept bank (brainstorm 2026-07-24)

Music-led seed set (not an exclusive list). By **job**, tagged **Go** (phone /
transit / couch) vs **Studio** (desk / DAW / any craft station).
Γÿà = highest leverage for VYBZ match + exchange DNA.

**A. Capture & continuity**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Γÿà Quick Capture | ΓùÅ | ΓùÅ | One-tap hum/voice/room tone ΓåÆ draft drop or repo WIP. |
| Session Timer | Γùï | ΓùÅ | Focus block + soft ΓÇ£save / commit?ΓÇ¥ nudge. |
| Clipboard Stem | Γùï | ΓùÅ | Last stem meta (BPM, key, license) one-tap re-share. |
| Idea Scratch | ΓùÅ | ΓùÅ | 1-line hook note tied to current track seed. |

**B. Tuning & craft**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Γÿà Metronome + Tap Tempo | ΓùÅ | ΓùÅ | Pulse + tap BPM stamps captures / commits. |
| Key / Scale Chip | ΓùÅ | ΓùÅ | Active project key; cycle modes; stamp handoffs. |
| Tuning Fork / Ref Tone | ΓùÅ | ΓùÅ | A440 (or project ref) for pitch checks. |
| FX Intensity | ΓùÅ | ΓùÅ | Off / Soft / VYBZ Max without leaving dock. |
| Monitor Cue | Γùï | ΓùÅ | Duck Orb morph / UI blips while tracking. |

**C. Collab & matchmaking**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Γÿà Open to Work pulse | ΓùÅ | ΓùÅ | Toggle seeking/offering without full profile edit. |
| Γÿà Match Radar | ΓùÅ | Γùï | Fresh high-fit match count ΓåÆ Connect/Spark. |
| Collab Invite Queue | ΓùÅ | ΓùÅ | Accept invites from the dock. |
| Role Badge | ΓùÅ | ΓùÅ | ΓÇ£I am / I needΓÇ¥ always visible. |
| Nearby / Scene | ΓùÅ | Γùï | Soft city/scene tag ΓÇö never creepy precision. |

**D. Exchange, repos & Bridge**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Γÿà Bridge Watch | Γùï | ΓùÅ | Folder sync health / last commit / conflict. |
| Repo Pulse | ΓùÅ | ΓùÅ | Unread MR on active Music Repo ΓåÆ Studio. |
| Handoff Ready | Γùï | ΓùÅ | Stems + dawproject package status for partners. |
| License Stamp | ΓùÅ | ΓùÅ | Default license for next share. |
| Watermark Trust | ΓùÅ | Γùï | Verified shimmer on last ledger-signed download. |

**E. Social Live & rooms**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Γÿà Go Live arm | ΓùÅ | ΓùÅ | Preflight ΓåÆ Orb Go Live; on-air pulse. |
| Room Voice slots | ΓùÅ | ΓùÅ | Mini G/Y/P occupancy (ties to voice-slot idea). |
| Top Live peek | ΓùÅ | Γùï | One of Top 3 lives without leaving dock. |
| Listen-together | ΓùÅ | ΓùÅ | Hosting / following chip in room sync. |

**F. Money & closed-loop value**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| V┬ó Balance | ΓùÅ | ΓùÅ | Dock chip + top-up (balance already in More). |
| Tip jar pulse | ΓùÅ | Γùï | Soft tip activity ΓÇö never pay-to-match. |
| Listing heat | ΓùÅ | ΓùÅ | Interest on active repo listing. |

**G. Comms & presence**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Unread stack | ΓùÅ | ΓùÅ | DMs + activity fused; long-press filters. |
| DM Quick Reply | ΓùÅ | Γùï | Opt-in only ΓÇö easy to get wrong. |
| Studio presence | Γùï | ΓùÅ | WhoΓÇÖs in your active project room. |

**H. Session sanity**
| Widget | Go | Studio | Value |
|--------|----|--------|--------|
| Ear Break | Γùï | ΓùÅ | 50/10 timer; gentle Orb dim ΓÇö hearing longevity. |
| Level Guard | Γùï | ΓùÅ | Best-effort hot-output warning (browser-limited). |
| Night craft | ΓùÅ | ΓùÅ | Soft FX + calmer chrome for late sessions. |

##### Recommended first ship slice
1. Metronome + Tap Tempo  
2. Open to Work pulse  
3. Bridge Watch *or* Repo Pulse  
4. V┬ó chip  
5. Keep Now Playing as locked system widget when active  

Defer: Nearby/Scene, DM Quick Reply, Level Guard, Tip jar.

---

### Suggested packaging when promoting

| Package | Ideas | When |
|---------|-------|------|
| **Reactive Media** | #1 + #2 (+ #3) | FE-heavy; shared runtime; unblocks Live aesthetics |
| **Unified Social Live** | #4 ΓåÆ Phase **O** | Phases 1ΓÇô4 Γ£à (schema, SFU, Social hub, room voice) |
| **Orb Joystick** | 2026-07-24 | Γ£à Phase 1 promoted; Phase 2 WebGL later |
| **Voice slot lights** | 2026-07-24 A | Γ£à Shipped with LiveKit ActiveSpeakers |
| **Premium surface** | 2026-07-24 B | Γùæ Material tokens + Social/Spark/More/V-Dock |
| **V-Dock widgets** | 2026-07-24 | Γ£à Shipped catalog + Now Playing; deepen wiring over time |

---

_Unpromoted ideas above remain analysis-only until called into the masterplan._
