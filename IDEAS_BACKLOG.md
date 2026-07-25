# VYBZ — Ideas Backlog (save points between phases)

> **Purpose.** A low-friction place to capture the owner's ideas *as they happen*
> without detouring the active development plan. Ideas land here for analysis;
> when one is ready, it graduates into a sequenced phase in `VYBZ_MASTERPLAN.md`.
>
> **Current platform release:** **Beta-0B** — see `VERSIONING.md` / `CHANGELOG.md`.
> This backlog is not versioned per label; promote ideas into the masterplan when ready.
>
> **Ritual.** At each phase boundary (before starting the next phase) the agent
> asks: *"Any new ideas to bank before we continue?"* New ideas are appended
> below with a short analysis (fit / dependencies / guardrails / rough shape).
> Nothing here is committed to build until it's promoted into the masterplan.
>
> **Legend:** 🟢 ready to plan · 🟡 needs infra/keys · 🔴 needs research/decision.

---

## Idea log

### 2026-07-19 — "Live & Video" cluster
Five related ideas, captured together. They split cleanly across three buckets:
things that reuse what we have (do soon), things gated on infra/cost, and one
Trust & Safety must-have.

#### 1. Private 1:1 cam-to-cam in chat 🟡
- **What:** optional, high-quality, private video call between two connected
  creators inside DMs.
- **Fit:** extends the shipped **H1 live 1:1 audio** WebRTC path (§K) — add a
  camera `MediaStream` (video track) to the existing peer connection + local/
  remote video tiles. Signaling + connection model already exist.
- **Security/privacy:** WebRTC is P2P and encrypted (DTLS-SRTP) — no server sees
  the stream. Identity-first: both sides are real, connected creators; both must
  explicitly opt in to go live; no recording by default.
- **Dependency:** **TURN** server for NAT traversal reliability (already on the
  infra-gated backlog, §4.1). Works on good networks without it; unreliable on
  strict NAT until TURN exists.
- **Guardrails:** consent-to-connect, in-call "end/report", camera off by default.
- **Rough shape:** moderate FE work on top of existing WebRTC; unblock fully with TURN.

#### 2. Live Streams feed — "minimalist Twitch, built in" 🟡🔴
- **What:** creators broadcast what they're working on to the world (or a filtered
  audience); its own high-quality feed + a home in the dashboard.
- **Fit:** audience filtering maps to our existing **professions / role-class**
  axes + audience-restricted visibility (already in `feed_posts`). A `/live` tab
  slots beside the feed.
- **Hard part (decision needed 🔴):** 1-to-many does **not** work over P2P. Two
  viable paths:
  - **A) Bunny Stream live ingest → HLS** (RTMP/SRT in, adaptive HLS out). Cheapest,
    aligns with our existing Bunny.net media strategy; needs confirmation Bunny
    supports live ingest on our plan (VOD is confirmed; live must be verified).
  - **B) LiveKit SFU** (already infra-gated on our backlog) — lower latency, more
    infra + cost.
- **Monetization:** live tips via **Stripe Connect** (Lane A) — on-mission (tips,
  never paywalls/ads). Per-creator, disclosed.
- **Guardrails:** identity-first broadcasters; audience scoping in stream settings;
  report affordance on every stream (see #5); no anonymous viewers.
- **Rough shape:** largest item; gated on the A-vs-B decision + infra/cost.

#### 3. Full 8K video upload support 🟡
- **What:** ensure very-high-res video uploads are fully supported end-to-end.
- **Fit:** we already **stream** large uploads (≤1 GB) via `bunny-upload`. 8K
  masters are multi-GB, so: raise the cap, move to **resumable/chunked** upload
  (Bunny TUS), and transcode to **adaptive HLS via Bunny Stream** for playable
  delivery (raw 8K is unplayable for most viewers).
- **Dependency:** Bunny Stream library (already noted as gated in §4.1).
- **Guardrails:** per-uploader storage awareness (cost); format/size validation.

#### 4. Uploader-managed content library (all media) 🟢
- **What:** original uploader can manage everything they've uploaded.
- **Fit:** the **Uploads/Library dashboard** (Phase 3) already does this for drops
  (rename / feature / delete). Generalize it to video + all content kinds — mostly
  an extension, not new infra.
- **Rough shape:** small–moderate; do alongside #3's video work.

#### 5. Universal one-tap "report illegal content" flag 🟢 ⚑ ✅ SHIPPED 2026-07
- **What:** a simple, optional flag/report button on **every** piece of uploaded
  content (drops, project posts, video, streams).
- **Fit:** the **reporting + staff/moderation backbone already exists**
  (`ReportModal`, reports, mod/staff system §12.5). This is mostly surfacing the
  affordance consistently everywhere + a fast path for "illegal content."
- **Why prioritize:** legal / DMCA / Trust & Safety obligation (see masterplan
  Legal §). Low effort, high protection — strong candidate to pull forward as a
  small standalone item rather than waiting on the full Live cluster.
- **Rough shape:** small; can ship independently and early.
- **✅ Shipped (2026-07):** promoted and delivered as a reusable `ReportButton`
  on drops (`TrackCard`), project posts + gallery images (`ProjectView`), and the
  home feed (`FeedPostCard`) — feeding the existing `content_reports` → mod queue
  (reasons incl. "Illegal"). See masterplan §12.21. E2E-verified end to end.

**Suggested grouping when promoted:**
- Pull **#5** forward as a small, independent T&S item (not infra-gated).
- Bundle **#3 + #4** into a "Video pipeline" phase once a Bunny Stream library exists.
- Treat **#1 + #2** as a "Live" phase, unblocked by TURN (#1) and the Bunny-live /
  LiveKit decision (#2).

### 2026-07-19 — "V¢ (VYBZ Credit)" — a platform value unit 🔴 (needs decision + legal)
- **What (owner):** introduce **V¢ = "VYBZ Credit"** as the platform's transacting
  unit that facilitates *all* value exchange — tips, paid services, commissions,
  user-to-user payments. **Never required for anything**; purely an *optional* way
  to support creators and pay for services rendered.
- **Why it's compelling:** one coherent vocabulary + rail for every money moment
  (tips O3b, commissions O3, cosmetics Lane B) instead of separate one-off Stripe
  flows. A single "wallet" UX is friendlier and unifies the economy.
- **⚠️ Two things to resolve before this can be promoted:**
  1. **It revives a scrapped concept.** The clean rebuild explicitly *removed*
     unrelated platform-economy units (masterplan §0 Correction of record).
     Reintroducing V¢ is an owner-level mission decision, not a routine feature.
     It can be done — but §0 must be amended deliberately.
  2. **Money-transmission / regulatory exposure.** The design hinges on ONE
     question: **can V¢ be cashed OUT?**
     - **Closed-loop, spend-only** (buy V¢ with Stripe → spend on
       tips/commissions/cosmetics; creators receive **real money via Stripe
       Connect**, never a withdrawable V¢ balance): lowest risk, cleanest, most
       on-mission. V¢ is essentially prepaid credit the *payer* holds.
     - **V¢ balance that creators cash out** (stored value + payout): this is
       **money transmission / stored value** → likely triggers licensing, KYC/AML,
       escrow, chargeback handling, and tax reporting (1099-K). Do **not** build
       without legal counsel.
     - **Crypto/on-chain token**: off-mission (§0), highest regulatory risk —
       recommend hard no.
- **Recommended framing (my take):** promote V¢ **only** as a **thin, closed-loop
  layer over Stripe Connect** — a branded unit (fix a ratio, e.g. `100 V¢ = $1`)
  that the *payer* prepurchases or spends inline, while creator earnings always
  settle as real money through Stripe Connect (never a withdrawable in-app
  balance). That keeps the "no ads / no paywalls / not required for anything"
  guardrails intact and sidesteps the money-transmitter problem, while still
  giving the unified "V¢ everywhere" experience.
- **Dependencies:** Stripe keys (same block as O3b). Best sequenced as the
  *presentation + accounting layer* built on top of O3b's Stripe Connect rails —
  i.e. do O3b first (real-money tips), then optionally wrap it in V¢.
- **Open decisions for owner:** (a) amend §0 to allow V¢? (b) closed-loop
  spend-only vs. cash-out? (c) fixed ratio + pricing? (d) does V¢ replace or sit
  beside direct-dollar tipping?

### 2026-07-24 — Visual reactivity cluster + unified Social / Live

Three visual concepts (**#1–#3**) plus a sharp Live/Rooms pivot (**#4**).
**#1–#3** share one reactive FX runtime. **#4** replaces fragmented Live tiers /
scrapped “Clubz” with one ultra-low-latency broadcast standard and **premium
text+voice rooms** monetized via recurring **V¢** — analysis only until promoted.

> **Hard gate:** nothing below is promoted or coded until it lands in
> `VYBZ_MASTERPLAN.md` with explicit sequencing. Analysis only.
> The “output Phase 1 schema now” ask is **not** development — see #4 sketch.

---

#### 1. High-quality visualizer backdrops on New Drop (upload + crop + reactive editor) 🟡🟢

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
  - Aspect / crop pipeline (client canvas or Bunny Stream transform) 🟡
  - Storage cost + duration caps (short loop vs long video) 🟡
  - Shared FFT from `AudioBus` for reactive overlays (already exists) 🟢
  - Performance budget on mobile (decode + WebGL/canvas under Soft / Max) 🟡
- **Guardrails:**
  - Backdrop must **never** block play/pause, scrub, or Orb control.
  - Listener intensity prefs (Off / Soft / VYBZ Max) must mute or simplify
    reactive layers — same contract as Orb.
  - Auto-crop defaults; manual crop is opt-in polish, not required to publish.
  - Watermark / report affordances still apply to uploaded video.
  - Do **not** claim “highest quality visualizers in existence” in product copy;
    ship a measurable quality bar (fps, GPU fallback, mobile Soft profile).
- **Rough shape:** moderate. Sequence: (a) upload + fit into banner slot,
  (b) audio-reactive overlay presets, (c) optional editor. Prefer promoting with
  **#2** as one **Reactive Media** phase so Orb + drop banner share one effect
  runtime.
- **Orchestration note:** One compositor API (backdrop layer + reactive layer +
  seeded fallback) used by TrackCard, GlobalPlayer banner, and later Live (#3 / #4).

---

#### 2. Taskbar Orb — highest-quality audio-reactive visualization 🟢🟡

- **What:** Raise Orb visual stimulation and **true audio reactivity** far above
  today’s mediocre customization options (idle plasma + morph/palette are a
  start; FFT coupling feels weak).
- **Fit:** Core Phase **E** surface (`OrbSphere` + `AudioBus` analyser). Cosmetics
  store already contemplates “audio-reactive frame/visualizer packs” (Lane B).
  **#4** also wants “Go Live” from an Orb pop-out — Orb stays identity + entry,
  not a second player.
- **Dependencies:**
  - Richer band mapping (bass / mid / high / onset / beat proxy) from existing
    analyser — no new infra 🟢
  - Optional GPU path (WebGL/WebGPU) with canvas2d fallback 🟡
  - Thermal/battery Soft profile on mobile 🟢 (prefs exist)
  - Cosmetic pack SKUs later (Lane B) — not required for quality jump 🟢
- **Guardrails:**
  - Orb remains the **taskbar identity** — never a second player chrome.
  - Idle state stays beautiful when nothing plays; playing state must *obviously*
    track the current drop (side-by-side A/B with today’s morph).
  - Accessibility: reduce-motion / Off intensity still respected.
  - Avoid purple-glow / “AI default” aesthetics; stay on VYBZ glass + uploader
    palette when a track is playing.
- **Rough shape:** moderate FE-only first (analyser → shader/params). Promote
  with **#1** as shared reactive runtime; Orb is the flagship proving ground
  before Live (#3 / #4) reuses the same engine.
- **Orchestration note:** Define a single `ReactiveVisualRuntime` contract
  (bands, energy, beat, seed, palette) consumed by Orb, drop backdrop, Live
  tiles — prevents three divergent visualizers.

---

#### 3. Live stream windows — audio-reactive + high-end visualizers 🟡

- **What:** Live stream UI windows react to audio the same way the player does,
  with deep customization and top-tier visualizers.
- **Fit:** Phase **G** live sessions + H1 DM live audio already touch WebRTC /
  `AudioBus`. Watch page / room live tiles should tap the **same** analyser
  graph as GlobalPlayer when the live source is the audible focus (or a
  dedicated analyser on the live `MediaStream`). Under **#4**, this becomes the
  default aesthetic layer on the **single** public live tier (not a paid FX tier).
- **Dependencies:**
  - Correct audio graph: live `MediaStream` → Analyser → destination sink
    (H1 already taught this lesson) 🟢 pattern / 🟡 per surface
  - **#2** runtime quality bar first — Live should *reuse*, not invent 🟢
  - Scalable fan-out (SFU / Bunny VOD) for 1:N — infra-gated 🟡
  - TURN for reliable WebRTC 🟡
- **Guardrails:**
  - Reactivity follows **what the user is hearing**, not a silent video track.
  - Host customization ≠ forcing heavy FX on all viewers (viewer Soft/Max).
  - High-fidelity audio routing for DAW share stays separate from visualizer
    GPU cost — never let shaders starve audio thread.
- **Rough shape:** after #2; small–moderate if runtime is shared. Ships as polish
  on #4’s unified live surface once the transport is chosen.
- **Orchestration note:** Depends on #2; optional backdrop from #1 only when
  the live source is a VYBZ drop playback, not webcam.

---

#### 4. Unified Social + Live — scrap Clubz tiers; premium V¢ text/voice rooms 🔴🟡 → ◑ **PROMOTED**

- **Status:** Promoted to masterplan **Phase O**. **Phase 1–2 shipped** (schema +
  LiveKit token pipeline + Bunny VOD offload docs). Phase 3 = Social tab / Orb
  dashboard UI. See `docs/UNIFIED_SOCIAL_LIVE_PHASE1.md` + `PHASE2.md`.
- **V¢ closed-loop decision (Phase 1):** balance = `profiles.mod_points`; no cash-out;
  5% platform fee withheld from owner share (informational ledger). Full §0 V¢
  branding still open; mechanics unblocked for room subs.
- **Fit (evolve, don’t parallel):**
  | Blueprint piece | Already on VYBZ |
  |-----------------|-----------------|
  | Go Live / sessions | Phase **G** + `GoLiveSheet` / `live_sessions` |
  | Rooms + Realtime text | Phase **F** — `rooms`, `room_messages` |
  | 1:1 WebRTC | **H1** DM live |
  | Group low-latency | **LiveKit** (or equiv SFU) — infra-gated |
  | Bunny | Upload + secure CDN; Stream/VOD for recordings |
  | Orb entry | Taskbar Orb — extend menu, don’t fork chrome |
  | V¢ / `mod_points` | Cosmetic credits exist; **V¢ as universal rail** = § V¢ 🔴 |

- **Physics check — “zero-delay / uncompressed”:** True zero-delay and fully
  uncompressed multi-viewer audio are **not** the same product. Honest target:
  - **Interactive stage** (host + small set of speakers / screen-share / DAW):
    WebRTC SFU (LiveKit recommended) with **music/producer mode** (minimal
    AGC/NS, stereo, high bitrate).
  - **Large audience**: still SFU or hybrid; latency is “ultra-low” not magical
    zero; never promise bit-perfect Ableton over the public internet.
  - **Bunny**: VOD, highlights, recorded VODs, thumbnails — not the realtime
    mesh itself.
- **V¢ recurring deductions (hardest part):** Weekly/monthly auto-debit of V¢
  for room membership requires, at minimum:
  1. Owner decisions on the **2026-07-19 V¢** entry (amend §0? closed-loop only?).
  2. **Ledger** table (not silent `mod_points` mutation) + idempotent period keys.
  3. Edge Function / cron (pg_cron or scheduled fn) — **not** a naive client
     trigger alone; RLS must prevent forging membership without ledger rows.
  4. Grace / dunning when balance insufficient (kick vs soft-lock premium perks).
  5. Creator payout story: if room owners “earn” V¢, confirm **no cash-out**
     (closed-loop) or you re-enter money-transmitter land — same V¢ warning.
- **Mission guardrails:**
  - Public live stays **free to watch** (unified tier ≠ paywall on broadcast).
  - Premium rooms are **optional communities** — never required for Studio,
    Repos, Connect, DMs, or dropping.
  - Glass / high-contrast UI must still match VYBZ Smoked-Glass + surface themes
    (avoid generic “AI glassmorphism” drift).
  - #3 reactive visuals apply to the unified live player — not a paid visual tier.
- **Dependencies:** LiveKit (or chosen SFU) + TURN 🟡; V¢ product decision 🔴;
  Stripe top-ups already buy cosmetic credits — map V¢ purchase UX; Orb menu
  IA; Social tab vs current Feed/Live/Rooms pins (navigation redesign) 🔴.
- **Rough shape:** large. Promote as **Phase G2 / F2 — Unified Social Live**
  (name TBD). Internal phases *after* promotion (aligned to owner blueprint,
  Vite not Next):
  1. Schema + RLS + V¢ subscription ledger/cron sketch
  2. Ultra-low-latency transport (SFU) + Bunny VOD offload
  3. Social landing (Top 3 lives + room discovery)
  4. Orb Go Live → Live Dashboard
  5. Premium text/voice rooms + gating hooks
- **Pre-promotion schema sketch (analysis only — not a migration):**
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
  1. Promote/amend **V¢** per 2026-07-19 (closed-loop only?) — required for #4.
  2. Room owners receive V¢ into closed balance only (no cash-out) — confirm.
  3. SFU choice: **LiveKit** default vs alternate?
  4. Social tab: replace Feed pin, sit beside it, or absorb `/live`+`/rooms`?
  5. “Monetization parameters” on Live Dashboard — tips only, or also V¢ goals /
     ticketed *events* without bringing back Clubz quality tiers?
  6. Accept **Vite SPA** (reject Next.js rewrite)?
- **On “immediately output Phase 1”:** Declined as development. Sketch above is
  the orchestration target. Say **“promote Unified Social Live — start Phase 1”**
  after decisions 1–6 to get the real additive migration + RLS + ledger/cron
  design, then stop.

---

### 2026-07-24 — Orb Joystick Sphere (3D radial menu) 🟢 → ✅ **PROMOTED**

#### Orb as top-down joystick + next-gen audio morph ✅ Phase 1
- **Status:** Promoted — Phase 1 (canvas joystick + magnetic sectors + fan a11y
  fallback) building now. Phase 2 WebGL morph remains backlog.
- See masterplan Phase **E** addendum.

---

### 2026-07-24 — Voice slot lights + premium polish cluster 🟢

#### A. Tricolor voice occupancy lights (rooms) 🟢
- **What:** In voice rooms, glowing status dots beside display names show who is
  speaking and **slot order** (max **3** concurrent voices):
  - **Green** = 1st active speaker (earliest still-talking)
  - **Yellow** = 2nd
  - **Pink** = 3rd (and final allowed simultaneous voice)
  - When a slot frees (user silent for **3s cooldown**), lower slots promote
    (pink→yellow, yellow→green). A new entrant always takes the lowest free
    color (so if green+yellow busy, next join is pink). No 4th voice until a
    cooldown opens a slot after someone stops.
- **Fit:** Extends Phase **O** room voice (`joinRoomVoiceSfu` + LiveKit
  `Track` audio levels / `isSpeaking`). Pure UX premium — not a hard SFU mute
  gate unless we later enforce server-side (start client-only).
- **Implementation sketch:**
  - LiveKit `participant.isSpeaking` + `audioLevel` → local slot manager
  - Ordered list of active speakers; assign G/Y/P; 3s silence timer per uid
  - Render dot next to presence / message author rows on `RoomPage`
- **Guardrails:** Visual-first; optional later “soft duck” of 4th publishers.
  Respect reduce-motion (static dots, no pulse). Never imply paid priority
  speak slots (V¢ rooms stay access-gated, not pay-to-talk-over).
- **Rough shape:** small–moderate FE. Promote with “voice slot lights — start”.

#### B. Platform-wide premium polish ideas (analysis) 🟢
Ways to make VYBZ feel unmistakably high-end without clutter:

| Idea | How (highest quality path) |
|------|----------------------------|
| **1. Material glass system** | One shared `surface` token set (hairline, specular sweep, press depth). Apply to sheets, More drawer, room chrome — CSS vars + framer spring, not per-page one-offs. |
| **2. Presence choreography** | Soft avatar ring pulse when online; typed “···” with Orb-accent hue; join/leave fades. Realtime already exists — polish motion only. |
| **3. Sonic micro-feedback** | Optional UI ticks (join voice, send, Orb snap) via tiny WebAudio blips, gated by FX intensity / user mute. Never fight the track. |
| **4. Drop provenance shimmer** | Subtle ledger-verified edge on watermarked assets (trust without badges spam). |
| **5. Match reveal** | Network/Spark: score reveal as a short Orb-palette bloom instead of a flat number. |
| **6. Live Top-3 stage frame** | Social hub: active Top 3 get a shared “broadcast bezel” (thin reactive stroke from host audio if available). |
| **7. Haptic grammar** | Same vibrate pattern language for Orb sector snap, voice slot grant, DM ping — muscle memory. |
| **8. Empty states as stages** | Replace flat EmptyState copy with one atmospheric still (product photography / DAW desk) + single CTA — brand-first. |

- **Packaging:** Promote **A** alone as a Social Live polish slice, or bundle
  **A + 1 + 2** as “Premium Rooms Surface.” Rest stay backlog until asked.

---

### 2026-07-24 — Taskbar Widgets system 🟢🟡

#### Dock widgets beside pins (Orb locked) 🟢🟡
- **What:** Beyond app pins, users place **widgets** on the left/right taskbar
  rails — compact utilities (volume/FX, V¢ chip, unread, quick-record, Bridge
  sync status, metronome, etc.) that expand on tap. Pins = navigation; widgets =
  tools. **Orb is immovable** and never a pin/widget slot.
- **Shipped seed:** **Now Playing** is the first system widget — fused into the
  single unified dock row (no second player bar). Appears when a track is queued;
  expands to full-screen now-playing. Not user-removable while active.
- **Fit:** Extends today’s pin customize (long-press jiggle + catalog tray).
  Widget defs would live beside `PIN_CATALOG` with a `kind: "pin" | "widget"`
  union and stricter size budgets (1–2 slot widths).
- **Dependencies:** Pin edit UX ✅. Now Playing widget ✅. Other widget data
  sources (AudioBus FX, session, repos Bridge) 🟡. Persist layout later.

- **Guardrails:** No pay-to-win widgets; Off/Soft/Max still caps motion; widgets
  must not steal Orb hit target; max density so rails stay tappable (44px).
- **Rough shape:** moderate. Promote with **“taskbar widgets — start”** after
  pin edit UX is validated.

---

### Suggested packaging when promoting

| Package | Ideas | When |
|---------|-------|------|
| **Reactive Media** | #1 + #2 (+ #3) | FE-heavy; shared runtime; unblocks Live aesthetics |
| **Unified Social Live** | #4 → Phase **O** | Phases 1–4 ✅ (schema, SFU, Social hub, room voice) |
| **Orb Joystick** | 2026-07-24 | ✅ Phase 1 promoted; Phase 2 WebGL later |
| **Voice slot lights** | 2026-07-24 A | After Orb P1; LiveKit speaking events |
| **Premium surface** | 2026-07-24 B | Incremental polish slices |
| **Taskbar widgets** | 2026-07-24 | After pin edit UX; Orb stays locked |

---

_Unpromoted ideas above remain analysis-only until called into the masterplan._
