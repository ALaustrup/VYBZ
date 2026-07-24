# VYBZ — Master Build Bible

> ## **VYBZ: Find Yours.**

**Product:** VYBZ is the next-generation, **identity-first** platform for **music
collaboration** and precision matchmaking — plus frictionless exchange of raw creative
material (samples, stems, one-shots, presets, MIDI, and full DAW / project files).
Art, video, and games remain optional secondary crafts. Owner: **Astra Matrix, Inc.**
Canonical domain: **`vybz.cloud`** (legacy alias: `vybz.astramatrix.xyz`).

**Status:** authoritative for product trajectory. **Current release: Beta-0B**
(see [`VERSIONING.md`](./VERSIONING.md) + [`CHANGELOG.md`](./CHANGELOG.md)).
Technical map of the live tree: [`ARCHITECTURE.md`](./ARCHITECTURE.md). If this
file conflicts with older notes or commit history, prefer this file + ARCHITECTURE
for “what we are building,” and ARCHITECTURE / CHANGELOG for “what is shipped now.”

> ### Correction of record (read once, then move on)
> Early scaffolding briefly carried over unrelated product concepts from a prior
> experiment. That was a mistake: **only a thin visual layout sketch was ever meant
> to carry over — nothing else.** Anonymous/guest accounts, confessions, dating,
> crisis "lifelines," random chat, AI companions, unrelated economies, and similar
> off-mission domains were **removed** in a clean rebuild. **VYBZ has no anonymity
> of any kind** — every account is a real, durable creator identity. Any statement
> to the contrary is obsolete. Do not reintroduce those concepts. The legacy
> `myvybsocial` remote is **eradicated** — `origin` is `ALaustrup/VYBZ` only.

**Two promises define every decision:** (1) **matchmaking precision no other
platform can touch**, and (2) **the creative-expression + exchange unlock every
creator has dreamed of** — delivered professionally, never childishly. If a feature
doesn't serve one of those two promises, it doesn't ship.

---

## 0. What VYBZ IS (and is NOT)

**VYBZ is a next-generation social + collaboration network for musicians and
producers.** Its single reason to exist is **precision matchmaking between creators
and whatever they are looking for**, plus a **protected, frictionless exchange of
raw creative materials**.

**It IS:**
- **Identity-first.** Every creator is a real, named account (email + passkey). Your
  username, roles, catalog, and reputation are your identity across VYBZ.
- **Open to the whole creative economy — as real identities with intent.** Alongside
  creators, VYBZ admits **creator-adjacent** accounts via a first-class **Role Class**
  axis: supporters/patrons, bookers/managers, curators, brands, and educators/students.
  They are *not* a passive consumer tier — every account carries structured **intent**
  and feeds matchmaking (a booker seeking a vocalist ↔ a vocalist open-to-work is the
  engine's existing shape). Admitting the demand side widens matchmaking surface area
  for creators; it never dilutes creator↔creator collab quality (see §12.20).
- A **complementary-role matching engine.** A drummer seeking a pianist is matched to
  pianists seeking drummers; a vocalist seeking a band to bands seeking a vocalist; a
  rapper seeking a beatmaker to beatmakers seeking a rapper — **every direction of
  every pairing, in both directions, with high precision.** Matchmaking is always the
  first-class citizen: every data point, upload, and interaction should feed it.
- A **workbench exchange.** Trade samples, stems, MIDI, presets, and **project files
  for every major DAW** (Ableton `.als`, FL Studio `.flp`, Logic `.logicx`, Pro Tools
  `.ptx`, Reaper `.rpp`, Studio One `.song`, Bitwig `.bwproject`, Cubase `.cpr`,
  Reason, GarageBand) — to *build together*, not to sell.
- A **sound-first social feed of "drops"** — sample/clip/stem/track uploads with
  public review, comments, Vyb/Fail taste signals, and an embedded star rating.
- A **collaboration graph:** connections, 1:1 DMs, opportunity boards, and (roadmap)
  collab rooms, versioned project handoffs, split sheets, and credits.
- A **protected exchange** (roadmap): audio safeguarded against theft via encrypted
  transport, per-recipient forensic watermarking, and a provenance registry.
- A **living, audio-reactive canvas** (roadmap): the UI reacts in real time to
  playback, plus per-track generative visualizers unique to every drop.
- A **VST-aware network:** plugins are a first-class profile facet and matchmaking
  signal — the tools creators use become the vocabulary they connect through.

**It is NOT:**
- **Not anonymous.** There is no guest tier, no ephemeral alias, no "post anonymously."
- **Not "the next SoundCloud."** It is not a passive streaming/consumption platform and
  not a store. Discovery exists **only** to make a connection or a collaboration happen —
  including with creator-adjacent participants (patrons, bookers, curators), who join to
  *act* (support, book, commission, curate), never merely to scroll.
- Not a label, DSP, beat marketplace, dating app, or social-feed-for-its-own-sake.

**Brand voice:** copy is **minimal**, always geared to *finding collabs and sharing
material with the creators seeking them*. The tagline **"VYBZ: Find Yours."** is the
standard of economy for every string. Metadata/SEO uses **"Find Yours."** (no
`VYBZ:` prefix). Corporate line: `© <year> Astra Matrix, Inc. All rights reserved.`

---

## 1. How to use this document

1. Read §0, §2 (current state), and §3 (architecture) before writing code.
2. The matchmaking engine (§5) is the heart of the product — highest value, highest
   rigor. §5.4 is the standing enhancement roadmap.
3. Obey the **Development Rules** (§9) on every change.
4. Everything is **additive and reversible**. Never break a working feature to add one.
5. `npm run build` (which runs `tsc --noEmit`) must pass with zero errors before commit.
6. **Idea save points:** raw owner ideas are banked in `IDEAS_BACKLOG.md` between
   phases (the agent asks for new ideas at each phase boundary). Ideas graduate
   into a sequenced phase here only when promoted — the backlog never blocks the
   active plan.

---

## 2. Current state — Beta-0B (shipped)

**Beta-0B** extends the Beta-0A baseline with **Music Repos** (Studio → GitHub-like
music VCS). Labels follow the Beta-NL[.P] scheme in [`VERSIONING.md`](./VERSIONING.md).

**Shipped (high level):**
- **Identity + auth.** Passkey-first WebAuthn + email/password; username claim;
  role + intent (+ role class) onboarding. Anonymous sign-in disabled.
- **Creator profiles + Projects** (on-profile microblogs / hubs) + **Studio /
  Music Repos** (CAS commits, branches/MRs, credit listings, Bridge watch,
  splits, verified credits, release batches).
- **Precision matchmaking** on Connect + Spark; opportunities + commissions;
  learning-to-rank weights.
- **Sound-first feed**, New Drop editor, global player in the **full-bleed
  bottom taskbar**, **Orb-first** reactivity (idle neochrome → uploader morph).
- **Connections, DMs, Rooms, Live**, Bunny secure media (incl. `repo-blobs`),
  watermark + C2PA worker path, Stripe Connect tips + credit top-ups, cosmetic
  store, weekly digest, Codex/Legal.

Verified end-to-end paths are documented in §4.1 and §12.x. For the live route /
Edge Function inventory, prefer [`ARCHITECTURE.md`](./ARCHITECTURE.md).

---

## 3. Architecture & conventions

### 3.1 Stack
- **Frontend:** Vite 6 + React 18 + TypeScript 5 (strict), Tailwind 3, `framer-motion`,
  `react-router-dom` 6, `lucide-react`. Path alias `@/` → `src/`. Installable PWA;
  Capacitor (Android) project present for Phase I packaging.
- **Backend:** Supabase project `xixmneooyufbeftdfpcm` (Postgres + Auth + Storage +
  Edge Functions). Client uses anon key + RLS only; privileged logic is
  `SECURITY DEFINER` RPCs and Edge Functions.
- **Audio:** a single global `AudioBus` (`src/lib/audioBus.ts`) — one shared
  `AudioContext` → `AnalyserNode` chain — powers playback, Orb FFT, and visuals.
- **Build/lint:** `npm run build` = `tsc --noEmit && vite build`.

### 3.2 Database (clean VYBZ schema — `supabase/migrations/`)
Identity-first tables (RLS on all): `profiles` (+ owner-private `profile` jsonb of
music facets, GIN-indexed; a `public_profiles` view + `public_profile()` RPC expose
only sanitized public fields), `roles`/`genres`/`daws`/`plugins` (controlled
vocabularies), `creator_roles`/`creator_seeks` (the bipartite offer/seek core),
`profile_embeddings` (pgvector, server-written), `drops` + `reactions` (feed + taste,
tallied by trigger), `assets` (+ P2P swarm manifest columns designed in for the future
swarm) + `track_ratings` (+ aggregate trigger) + `asset_downloads` (license chain),
`connections` + `dm_threads`/`dm_messages`, and `collab_posts`/`collab_applications`.
A trigger auto-creates a profile on signup. Later migrations add Projects/widgets,
Studio versions, playback customization, live streams, tips, digests, OAuth, etc.
(see `ARCHITECTURE.md`).

**RPCs (definer, `search_path=public`, emit only aggregates/labels — never raw private
facets):** `collab_matches`, `my_opportunities`, `set_creator_roles`,
`my_creator_roles`, `creator_roles_for`, `public_profile`, `rate_track`,
`request_asset_download`, `start_dm`, `digest_week_bundle`, plus `jsonb_overlap_*`
helpers and staff/admin RPCs.

### 3.3 Frontend structure
- **State:** `src/store/session.tsx` (`SessionProvider`/`useSession` — auth, profile,
  toast/celebrate). Player state is the `AudioBus` singleton via `usePlayer()`.
- **Data:** `src/lib/api.ts` (all Supabase calls, typed).
- **Shell & design:** `src/index.css` (Smoked Glass tokens), `tailwind.config.js`,
  **full-bleed bottom dock** (`AppChrome` + `Taskbar` + `GlobalPlayer` + `OrbSphere`)
  on every viewport — **no side rail**. Primitives: `Brand`, `Toast`, `Confetti`,
  `EmptyState`, `Handle`, `DynamicBackground`, `GrainOverlay`, …
- **Audio UI:** `audioBus`, waveform helpers, `TrackCard`, `Waveform`,
  `TrackVisualizer`, `GlobalPlayer`, Orb morph via `playbackCustomization` /
  uploader FX; `profileFields.ts` is the catalog + matching-facet source of truth.
- **Pages:** Feed, Discover, Connect, Spark, Opportunities, Studio, Live, Messages,
  Rooms, Profile (+ edit), User/Artist profiles, Store, Admin/Mod, Codex/Legal.

### 3.4 Infrastructure
- **Supabase:** VYBZ project `xixmneooyufbeftdfpcm`, us-west-1. Anonymous sign-in
  **off**; email enabled. Prefer verified email + Resend custom SMTP before broad
  public launch (`scripts/configure-resend-smtp.sh`). Avatars use `media-public`;
  protected drops + Studio versions use **Bunny secure**; Project/feed post media
  uses Bunny public CDN. Legacy `audio-assets` / `project-files` remain readable.
- **Domain:** **`vybz.cloud`** on Vercel (`astramatrix/vybz`). Legacy alias
  `vybz.astramatrix.xyz` kept on the passkey host list during cutover.
- **Edge Functions:** see full inventory in [`ARCHITECTURE.md`](./ARCHITECTURE.md)
  (passkey, Bunny, watermark, embed, Stripe, OAuth, ICE, weekly-digest, …).
- **Git:** `origin` = `ALaustrup/VYBZ` only. No `upstream` remote.

---

## 4. Feature roadmap (sequenced from v1)

Each phase is additive and has an implicit Definition of Done: builds green, RLS-safe,
manually verified, and it strengthens matchmaking or the exchange.

| Phase | Deliverable |
|---|---|
| **A. Reliability & polish** ✅ | Realtime feed/DMs, notifications, search & discovery, profile hero, onboarding role-setup. |
| **B. Matchmaking depth** ✅ | Role-affinity graph, skill-tier proximity, reputation, free `gte-small` resonance, production/agency matching. |
| **C. Exchange + protection** ✅ | Download gating, per-recipient forensic watermarking (desync-tolerant), hash-chained provenance ledger, license chain. C2PA worker built + verified; live hosting pending a reachable container host. |
| **D. Projects & collab rooms** ✅ | Private project rooms, versioned handoffs, split sheets, release gate, **verified credits**. Next: discography surface + threaded per-project chat. |
| **E. Signature reactivity** ✅ | Taskbar **Orb** (idle neochrome → uploader morph) + visualizers; **Off / Soft / VYBZ Max**. **Orb Joystick Phase 1** ✅ — hover calms to default sphere; hold+drag stick selects Drop/Live/Spark/Messages; magnetic snap + haptics; fan chips remain for reduced-motion. Phase 2 WebGL morph later. |
| **F. Categorized collab chat** ✅ | Taxonomy-bound rooms (role/genre/DAW), realtime messages + presence. |
| **G. Live (v1)** ✅ | *Synchronized listening sessions* in rooms (Supabase Realtime + AudioBus). LiveKit group rehearsal/XR still gated on SFU infra. |
| **O. Unified Social Live** ✅ | One public ultra-low-latency live tier + premium V¢ text/voice rooms. Phases 1–3 ✅. **Phase 4** room voice UI (LiveKit) + V¢ renewals cron ops ✅. |
| **H. The swarm (P2P)** | Encrypted-chunk WebRTC distribution behind a flag (the `assets` manifest columns are already designed in). |
| **I. Mobile + packaging** | Capacitor Android/iOS, PWA polish, native plugin-scanner sync. |
| **J. Monetization** | Pro tier; tasteful, disclosed affiliate gear/plugin links (never influencing match scores). |
| **N. Music Repos** ✅ | GitHub-like music VCS on Studio: CAS blobs/trees/commits, folder sync, History + Branches (MR / pull tip), Listing marketplace, Bridge watch, **R5 DAWproject/stems handoff hints**. Flag: `VITE_FEATURE_REPOS`. |
| **L. Codex (public doc library)** | Free, public, professionally-drafted music-industry document library (contracts→demand letters) with plain-English explainers, jurisdiction tags, and disclaimers. US-first. ~90 document types catalogued. |
| **M. Brand system** | Official VYBZ logo set (mark/wordmark/mono), favicons/PWA icons, OG image, intro animation, email + Codex-doc headers. Drops into `public/brand/`. |

### 4.1 Development findings & environment constraints
- **Seed cleanup (2026-07):** the demo/test accounts that seeded early matchmaking
  (bulk `@vybztest.com` + `@example.com` demo profiles) were **purged from the live
  DB** — cascading their drops, Projects, roles/seeks, connections and DMs — so VYBZ
  now carries only real creator identities. The owner account (`vybz`) was promoted
  to **admin**. Orphaned Bunny objects (not publicly reachable) can be swept later.
- **DM live audio (H1) is implemented and correct**, but cannot be fully exercised in the CI/VM test environment: there is **no microphone**, and `getDisplayMedia` tab-audio capture is **silent** (no real audio output device to capture), so the visualizer/audible path has no signal to show here. Verified in-sandbox: the go-live control + source menu, graceful no-device error handling, `getDisplayMedia` capture → offer → "Calling…" panel + controls, clean build, no console errors. Two real bugs found + fixed during testing: (a) a `MediaStreamSource→Analyser` graph needs a destination sink or Chrome won't process it; (b) the listener needs an `<audio>` element to actually hear the remote stream. **Full 1:1 live audio (audible + visualizer + two-peer connect) should be validated on real devices.**
- **Infra-gated backlog** (all blocked only on hosting/cost, code is ready): C2PA worker live hosting (needs a reachable container host — LAN box unreachable, free Docker hosts now require payment/PRO); **TURN** server for strict-NAT WebRTC reliability; **LiveKit** SFU for group live rehearsal/XR. These flip on the moment infra exists.
- **Media hosting & cost (2026-07):** user media is offloaded to **Bunny.net** to protect the Supabase free tier (5 GB egress / 1 GB storage).
  - *Public post media* → open Bunny pull zone `vybz-cdn-e8684f` (returns a CDN URL). Unchanged.
  - *Protected drop originals* (§8 exchange) → **isolated** Bunny storage zone `vybz-secure-6d606c` behind a **token-authenticated** pull zone (`vybz-secure-6d606c.b-cdn.net`). Raw objects are **not** publicly reachable (unsigned → 403); previews are short-lived token-signed URLs minted by the `bunny-sign` fn; downloads are fetched **server-side** (AccessKey) by the `watermark` fn for per-recipient watermarking. Legacy Supabase-path assets still work (paths are detected by the `drops/`|`projects/`|`repo-blobs/` prefix). Secrets: `BUNNY_SECURE_*`.
  - *Known caveat:* Bunny serves `.wav` as `application/octet-stream`; the watermarked **download** is correctly `audio/wav`, but WAV **previews** may need a pull-zone Content-Type edge rule for the WebAudio analyser. Compressed formats (mp3/m4a) are unaffected. Follow-up: video → **Bunny Stream** (HLS/transcode).
- **Email (2026-07):** Supabase's built-in mailer is throttled (~few/hour) and will break sign-up/passkey-recovery at launch. `scripts/configure-resend-smtp.sh` wires **Resend** (free 3k/mo) as custom SMTP via the Management API — run once the `RESEND_API_KEY` + verified sender are in place.
- **Monetization (planned, no gating):** Lane A — **Stripe Connect** creator tips + a small exchange transaction fee (mission-aligned; gates nothing). Lane B — a **cosmetic store** (profile/Project skins, accent gradients, audio-reactive frame/visualizer packs, custom cursors, animated flair, founder badge) via one-time Stripe purchases. No ads, no popups, nothing functional behind a paywall.
- **audio→MIDI (H3) is verified in-VM** (converting a track produced a valid 426-note MIDI, parsed back with `@tonejs/midi`) — it runs on files, so no capture hardware is needed. TensorFlow.js falls back to CPU where WebGL is unavailable.
- **Web MIDI → DAW (H4) is implemented + degrades gracefully**, but the headless VM has no MIDI subsystem (`requestMIDIAccess` → `InvalidStateError`), so live streaming into a DAW must be validated on a real desktop with a virtual MIDI port (IAC/loopMIDI) in Chrome/Edge. Verified in-VM: support detection, permission flow, and the graceful "MIDI unavailable / set up a virtual port" messaging.
- **Testing note:** file-playback visuals + audio→MIDI work in-VM (they tap in-graph/file audio); capture-based audio (mic/tab) and Web MIDI do not, because the VM lacks audio + MIDI hardware.

---

## 5. The matchmaking engine (the core of VYBZ)

### 5.1 Principle — complementarity, both directions
For caller **me** and candidate **u**: **forward** = `|me.seeks ∩ u.offers|` (they have
what I want); **backward** = `|u.seeks ∩ me.offers|` (I have what they want); a **mutual
bonus** when both > 0 (the gold standard). Generic role math means every pairing works
in both directions with no hardcoded special cases.

### 5.2 Current blended signals (`collab_matches`)
Forward/backward complement (×3 each) + mutual bonus (+4), genre overlap (×1.4), DAW
overlap (×1.2), plugin overlap (×0.9, capped), language overlap (×0.5), tempo-range
fit (+0.6), semantic resonance from influences/bio (×3, pgvector cosine),
open-to-work (+1). Normalized to 0–1 `fit`; returns the human "why." Candidate pools
are UNION'd from offer/seek joins + vector-nearest, so thin/new profiles still match.

### 5.3 Design discipline
Definer functions read private facets to sharpen *your* results but emit only
aggregates + role labels. Weights start hand-tuned and are then **earned from outcomes**
via learning-to-rank (§5.4h) — admin overrides always win, learned weights refine the
rest, and coded defaults remain the floor.

### 5.4 Enhancement roadmap — best matches across musicianship *and* production/agency types
This is the standing brief for making matches world-class. Grouped by lever:

**(a) A role-affinity graph (beyond exact declared pairs).**
Model curated "affinity edges" between roles so strong complements surface even when a
creator hasn't explicitly declared them — e.g. rapper↔beatmaker, topliner↔producer,
singer-songwriter↔instrumentalist, artist↔mix/master engineer, band↔session musician,
composer↔arranger. Each edge carries a weight; the engine blends declared complements
with graph-inferred ones (at lower weight) so discovery isn't limited to perfectly
declared seeks.

**(b) Musicianship-type nuance.** Instrumentalists match on instrument + genre +
tempo/key + skill; vocalists (lead/backing/rapper/topliner) match to the production
and instrumental roles that complete a record; performers/session players match on
availability + locality + genre; bands match to the specific member role they lack.

**(c) Production/agency-type nuance.** Producers/beatmakers match to artists/topliners
by sonic + genre fit; mix/master engineers match to artists with finished-but-unmixed
material (and are ranked by craft reputation); A&R/managers match to artists by genre,
stage, and momentum; sync/licensing matches to catalog owners; studio owners match to
local artists needing space. These are asymmetric relationships — model them as typed
edges, not just symmetric overlap.

**(d) Skill-tier proximity.** Match comparable experience with a tunable tolerance so a
seasoned engineer isn't buried in beginners (and newcomers still find peers). Skill is
already captured per offered role.

**(e) Semantic + sonic embeddings.** Text resonance is **live and free**: the `embed`
Edge Function embeds each creator's identity (influences, genres, DAWs, plugins, intent)
with Supabase's built-in `gte-small` model (384-d, no external key/cost) into
`profile_embeddings`, and the resonance term in `collab_matches` uses it. Next upgrade:
*audio* embeddings from uploaded drops for a true "your sounds actually fit" / "find
creators who sound like this" signal.

**(f) Reputation & reliability.** A trust layer built from completed collaborations,
post-collab ratings, response rate, and on-time delivery. Boosts high-signal creators
and improves match quality as the graph matures.

**(g) Behavioral / collaborative filtering.** Co-Vyb on drops (shared taste),
connect/message/Spark history → "creators like the ones you connect with." Feed these
as soft signals.

**(h) Learning-to-rank.** ✅ *Shipped (0029).* Every `connect`/`pass`/`accept`/`decline`
now snapshots a normalized 0–1 **signal vector** for the pair (`match_signal_vector`).
`tune_matchmaking_weights()` compares each signal's average strength among positive vs
negative outcomes and scales that signal's weight — **support-shrunk** (thin data barely
moves) and **clamped to [0.4×, 2.0×]** of the hand-tuned base, so no signal is ever zeroed
or runs away. `mm_w()` resolves **admin override → learned → coded default**, so learning
never fights a manual setting and the defaults stay the floor. Runs nightly via `pg_cron`
when available, or on demand from **/admin → Matchmaking → Run learning** (which shows the
per-signal base→learned report). The explainable "why" is preserved on every card.

**(i) Hard filters vs soft boosts.** Let users set non-negotiables (remote-only,
DAW-compatible for project handoff, language) as hard filters, distinct from soft
ranking boosts.

**(j) Fairness & freshness.** Guard against rich-get-richer: surface new/underexposed
creators and diversify results so the network stays vibrant.

**(k) Explainability & confidence.** ◑ Always show *why* + a confidence read so creators
trust and act on matches. *Confidence shipped (0029):* `collab_matches` returns a 0–1
`confidence` built from how many independent evidence types corroborate a match blended
with fit, surfaced as a labelled read (High / Solid / Emerging / Exploratory) on Connect
and Spark alongside the existing "why" (has-what-you-seek / wants-what-you-bring / shared
disciplines / shared genres+DAWs).

---

## 6. Domain model roadmap — drops, exchange, protection

- **Drops** (shipped): repurpose-free, purpose-named `drops` + `assets`. Reactions and
  ratings feed taste matching.
- **Exchange** (Phase C): download gating through `request_asset_download` (records the
  license accepted); previews stream at capped quality, originals never get a public URL.
- **Protection & provenance (§8.7)** — deliberately **not a blockchain**. VYBZ is the
  trusted operator, so a self-run chain would be a slow, complex database with none of
  the decentralization benefits, immutable-PII/GDPR liabilities, and no added
  anti-piracy power. Instead:
  - **Content hashing + acoustic signature on upload** (SHA-256 of the original +
    a lightweight peaks-derived signature; chromaprint-class fingerprint is a later
    upgrade) → the "first seen on VYBZ" provenance record (`assets.sha256`/`fingerprint`).
    *Shipped.*
  - **Hash-chained, append-only audit ledger** (`provenance_ledger`): every mint,
    download, and license grant is chained by hash to the previous row, so tampering is
    detectable (`verify_ledger()`), and `asset_provenance()` reports first-seen +
    download count. Deny-all to clients; append via definer only. *Shipped.*
  - **Per-recipient forensic watermarking** on delivery — the real anti-piracy teeth.
    A **direct-sequence spread-spectrum** watermark (current DSSS approach per
    oximedia-watermark / VoiceSign, 2026), keyed by `HMAC(WM_SECRET, recipient|asset|
    wm_id)`, is embedded server-side (the `watermark` Edge Function) into each
    delivered WAV at ~34 dB SNR (inaudible) and logged as a `watermark` ledger event;
    a blind correlation detector (`watermark-detect`, admin-only) traces a leaked file
    to the recipient who received it. *Shipped* (WAV; verified ~35× attribution
    separation, robust to requantization/gain/noise). Known limits: it's PROVENANCE +
    ATTRIBUTION, not DRM (defeatable by a determined adversary); the desync-robust,
    transcode-surviving upgrade is the frequency-domain segmented variant (2–6 kHz PN
    per ~100 ms segment) + MP3/FLAC support via decode.
  - **C2PA Content Credentials** attached to delivered files (industry-standard signed
    provenance; audio WAV/MP3 supported by Adobe/CAI's `c2patool`). The signing worker
    (`worker/c2pa/`) is *containerized and verified end-to-end locally*: the `watermark`
    edge fn watermarks a WAV → forwards it to the worker's `POST /sign` → the delivered
    file validates (`validation_state: "Valid"`) with the VYBZ assertions (creator,
    asset id, watermark id, license) **and the forensic watermark survives byte-for-byte**
    (C2PA writes a metadata chunk, not PCM). It runs in **Node/a container** (not the Deno
    edge). Staging activation = `docker compose up` on the VYBZ server + set the
    `C2PA_WORKER_URL`/`C2PA_WORKER_TOKEN` edge secrets; until then downloads deliver the
    watermarked-only file (safe fallback). Self-signed ES256 cert for staging; CA-issued
    for production.
  - **Optional public anchoring** — periodically publish the ledger's Merkle root to a
    public timestamping service (RFC-3161 / OpenTimestamps) for independent,
    third-party-verifiable proof-of-existence-at-time, without running a chain.
  - Market it as **protection + provenance, not unbreakable DRM** (the analog hole
    always exists) — still more than any mainstream platform offers creators.
- **Projects** (Phase D, *shipped*): `projects`/`project_collaborators`/`project_versions`/
  `split_sheets` power private, versioned handoffs, per-member split agreement, a release
  gate, and verified credits (`creator_credits`) that feed `creator_reputation`. Access is
  through member-gated `SECURITY DEFINER` RPCs (tables are deny-all to clients).
- **Swarm** (Phase H): encrypted-chunk WebRTC distribution; the `assets` table already
  carries the manifest columns (`cipher_algo`, `chunk_size`, `chunk_hashes`,
  `content_key_envelope`) so it's purely additive — keys flow only through the
  permission-checked server path; peers exchange opaque encrypted chunks only.

---

## 7. Signature reactivity (Phase E)

The `AudioBus` analyser drives:

1. **Taskbar Orb** — primary reactive surface. Idle: slow neochrome plasma sphere.
   Playing: eases into the drop’s `playback_customization` (palette + morph:
   sphere / blob / bars / ring / liquid). On playback end, soft-blends back to idle.
   Listener intensity **Off / Soft / VYBZ Max** (`display.ts`) scales amplitude +
   chroma. Respect `prefers-reduced-motion`.
   **Joystick (Phase 1):** hover/aim calms morph to the default sphere; hold and
   drag like a top-down gamepad stick toward cardinal actions (Drop / Live /
   Spark / Messages); magnetic sector snap + optional haptic; release to run.
   Reduced-motion keeps the legacy fan chip tray (`OrbFan`).
2. **Seeded per-track visualizers** — every drop’s visualizer derives from
   `hash(creator_id + asset_id)` so tracks stay unique (static seeded frame at rest,
   reactive while playing).
3. **Living background** — `DynamicBackground` still scales with FX intensity
   (0 when Off / reduced).

Viewport-wide neon borders (`ReactiveFrame`) are **retired** (stub remains for
import stability only).

---

## 8. Profiles — expression with a professional edge

A VYBZ profile is a creator's storefront-of-self: featured drop with its visualizer,
pinned drops, taste badges (genres/DAWs/plugins), and expressive-but-curated theming
that can never produce a childish or broken result. **Matchmaking-first tiebreaker:**
when design choices compete, the one that feeds or showcases matchmaking wins — roles
offered/sought and the "why we match" always get prime real estate.

---

## 9. Development rules

1. **No anonymity, ever.** Every account is a real identity. Never reintroduce guest/
   anonymous auth or ephemeral aliases.
2. **Secrets never touch the client.** OpenAI/Resend/service-role keys live only in Edge
   Functions / server env. Client uses the anon key + RLS.
3. **RLS on by default.** Sensitive tables get no direct client write policies — access
   flows through `SECURITY DEFINER` RPCs that re-check `auth.uid()` and emit only what's
   allowed. Definer functions always `set search_path = public`.
4. **Idempotent, timestamped migrations** (`create ... if not exists`, `create or
   replace`, `add column if not exists`). Never edit an applied migration to change live
   behavior — add a new one.
5. **Validate & sanitize** all input; check file type/size/mime on upload; treat
   uploaded audio/project files as untrusted.
6. **TypeScript strict; `npm run build` green (zero errors) before commit.** Modular,
   small units. Additive & non-breaking; lazy-load heavy modules; feature-flag risk.
7. **Latest stable deps** (Node LTS ≥20). Comments only for non-obvious intent.
8. **Mobile-first + PWA parity.** Keep the glass aesthetic + accessibility
   (labels, focus, `prefers-reduced-motion`).
9. Prepare changes PR-style. Confirm before destructive/irreversible actions.

---

## 10. Legal & brand

- Product/service name in all copy → **VYBZ**; tagline **"VYBZ: Find Yours."** Owner:
  **Astra Matrix, Inc.**
- Legal (Terms, Privacy, Community, DMCA) must reflect: **identity-first** accounts
  (email; passkey), user-uploaded audio + project files, an **exchange/collaboration**
  model (not sales), per-asset **license tiers** (`collab-only`/`credit-required`/
  `free`), split-sheet/credit agreements, forensic-watermarking + provenance disclosure
  (Phase C), P2P seeding disclosure (Phase H), affiliate-link disclosure (Phase J), and
  a DMCA/takedown process. There is **no** anonymity clause — remove any such language.

---

## 11. Proposed platform additions (brainstorm — for discussion)

Beyond the phased roadmap, high-value additions that serve the two promises:

- **Matchmaking (see §5.4 for the deep list):** role-affinity graph, skill-tier
  proximity, reputation/reliability layer, sonic embeddings, learning-to-rank,
  production/agency-typed edges, hard-filter vs soft-boost controls, fairness/freshness.
- **Discovery:** faceted search (role/genre/DAW/plugin/BPM/key/location), "creators near
  you," "sounds like this" (audio similarity), weekly best-fit digest.
- **Collaboration ops:** in-app project rooms with versioned handoffs, split sheets,
  and **verified credits/discography** that become reputation inputs — closing the loop
  from match → collab → trust → better matches.
- **Creator tooling (first-party, additive):** auto BPM/key detection on upload,
  stem-splitter, mastering-preview, and a desktop/native **plugin-scanner** that syncs a
  creator's real plugin arsenal into their profile (a strong matchmaking signal).
- **Signals & trust:** response-rate + reliability badges, "open to work" spotlights,
  endorsement from past collaborators.
- **Engagement:** notifications (match/application/message), realtime feed + DMs,
  featured-drop profile hero, curated "top-fit in <genre> this week" surfaces (always in
  service of connection, never vanity charts).
- **Reach:** mobile (Capacitor) + installable PWA; later, categorized collab chat and
  live rehearsal rooms.
- **Business (tasteful):** Pro tier (higher upload/exchange tiers, advanced filters);
  disclosed affiliate gear/plugin links that **never** influence match ranking.

**North star:** the **next-generation, elite** platform for finding and seeking
production collabs — matchmaking with a precision no other platform can touch, and the
protected creative-exchange every creator has dreamed of, on one identity-first
platform. **VYBZ: Find Yours.**

---

## 12. Active redesign & product direction (2026-07)

### 12.1 Shipped (redesign slice)
- Onboarding simplified to **role** ("Choose your role" — typed → closest-match confirm →
  or custom via trigram canonicalization) + **intent** ("What are you here for?").
- **Disciplines removed** from the UX; a single **role** is the creative identity.
- Home feed is the curated landing (intent heading, comfortable/grid layout toggle, roomier).
- Audio-reactive frame toned to a **subtle, colourful** glow that only shows during playback.

### 12.18 Unify Spaces + Projects ✅ (shipped 2026-07)
"Spaces" and "Projects/Studio" collapsed into ONE concept: **Projects** =
the on-profile creative projects (`profile_projects`). Each Project now carries
content (posts/links) **plus a widget dashboard** (`project_page_widgets`,
migration `0036`; embed widgets live + gated OAuth connectors) rendered in
`ProjectView` on the profile and `/p/:id`. The private collaboration rooms
(`projects`) are rebranded **"Collabs"** (versions/splits/credits) so nothing is
named "Projects" twice. No data migration — additive. Showcase is native
(Projects are always on the profile). _Verified end-to-end: create a Project,
add a Spotify widget, it renders on the profile; nav shows "Collabs", profile
shows "Projects"._

### 12.19 Professions — music-first crafts (Phase A ✅; re-centered 2026-07)
VYBZ's **primary product lane is Music** (`music`). Three optional secondary
crafts remain available: **Visual art** (`visual_art`), **Video** (`film_video`),
**Games** (`game_dev`). They never outrank music in defaults, SEO, onboarding, or
soft-scoped Find/Spark.
- **Identity:** onboarding leads with **"Make music with the right people"** —
  Music selected by default; other crafts sit behind an optional expander.
  Stored on the profile (`profession` + `professions[]`, validated;
  `apply_role_intent_onboarding`). Shown as profile **badges**. Unset craft
  soft-scopes as Music (`craftScope()` / `PRIMARY_PROFESSION`).
- **Feed:** unset / Music → **Sounds**; Visual→art, Video→video, Game→mixed.
  Scope chips put Sounds/Music ahead of Art/Video/Writing.
- **Widgets:** Spotify / SoundCloud / Bandcamp / Apple Music / YouTube first;
  ArtStation / Behance / Steam / itch demoted under “other crafts.”
- **Phase B ✅ (2026-07):** per-craft content tools remain (art gallery, Vimeo/
  Steam embeds, itch/ArtStation/Behance link cards). Bunny Stream gated.
- **Phase C1 ✅ (2026-07):** profession-aware matchmaking + Discover craft filter.
  `collab_matches` scores primary/secondary overlap, soft-scopes Find/Spark/
  FeedHero/Collab-add by caller craft (Music when unset). `search_creators`
  gains `p_profession`.
- **Role Class (§12.20)** stays demand-side around **music** collabs (bookers,
  patrons, curators) — not a multi-vertical pivot.
- **Roadmap:** deepen music tools (stems, DAW exchange, Bridge); secondary crafts
  stay available but never the product center of gravity.

### 12.20 Open Platform — creator-adjacent Role Class (Phase O)
**Thesis:** creators don't only want other creators — they want the manager, the
sync/booker, the curator, and the patron who funds the work. Those are demand-side
signals VYBZ currently discards. Admitting them **as real identities with structured
intent** widens matchmaking surface area without turning VYBZ into a consumption feed
(§0 amended accordingly). This is *additive and reversible* (§9): zero changes to
existing creator flows, feature-flagged, guardrails first.

**Role Class axis** (sits beside the `professions` axis; `src/lib/profileFields.ts`):
- **Creator** — today's default; offers/seeks creative roles.
- **Creator-adjacent** — supporter/patron, booker/manager, curator/playlister,
  brand/marketing, educator/student. Each carries **intent** ("Support creators",
  "Book talent", "Hire a creative", "Commission work", "Curate", "Learn") mapped onto
  the existing onboarding intent → feed-curation seam (`RoleIntentOnboarding.tsx`).

**Guardrails (non-negotiable):**
- Same real-identity/passkey standard — **no lurker/guest tier** (§0).
- Match quality: role-class is a **filter/weight**; non-pro→creator matches never
  outrank creator↔creator collab matches on a creator's Connect/Spark deck.
- Feed separation: the sound-first drops feed stays creator-authored; adjacent
  accounts consume **contextually** (to book/support/commission), never as a passive
  scroll.
- Monetization stays on-mission: patrons route into the **existing Stripe Connect
  tips** rail (§4.1 Lane A) — no ads, no paywalls.

**Staging:**
- **O1 ✅ (shipped 2026-07)** — Role Class as identity axis: schema (migration
  `20260709_0038_role_class.sql` — `apply_role_intent_onboarding` v4 persists
  `roleClass`; `set_role_class` + `_is_role_class` allowlist), a **"How do you
  fit in?"** first onboarding step, adjacent users skip the profession/role
  steps and get adjacent intents + a **"Which creators are you looking for?"**
  step (their seeks feed `creator_seeks` via `sync_creator_graph`), a
  `RoleClassBadge` on profiles, and feed separation (adjacent classes default to
  the mixed "For you" feed; drops stay creator-authored). Behind
  `VITE_FEATURE_ROLE_CLASS` (default on, instantly reversible). _E2E verified:
  fresh Supporter + Booker signups skip profession/role, land on "For you", show
  the correct badge, and persist `roleClass` + seeks in the live DB._
- **O2 ✅ (shipped 2026-07)** — demand-side matchmaking. `collab_matches` **v7**
  (migration `20260709_0039_roleclass_matchmaking.sql`) emits each candidate's
  `role_class`, adds a modest `roleclass` demand-alignment signal (feeds fit +
  confidence via `mm_w`, so LTR is undisturbed), and enforces the **guardrail**:
  on a creator's deck, adjacent candidates are demoted below every creator
  candidate — a demand-side match can never outrank a creator↔creator collab.
  Adjacent callers still rank creators by fit. Connect + Spark badge demand-side
  matches. _Verified: simulated + live UI — a booker seeking "Lead Vocalist"
  surfaces on the vocalist's Connect ("Wants what you bring: Lead Vocalist",
  Booker / Manager badge) ranked below a mutual producer collab; the booker's own
  deck surfaces the vocalist._
- **O3 ✅ (shipped 2026-07)** — **commissions board**: paid work requests on the
  opportunity board. `collab_posts` gains `kind` (`collab` | `commission`) +
  `budget` (migration `20260709_0040_commissions.sql`); Opportunities gets
  Collabs / Commissions tabs, a commission post form (budget field), budget
  badges, and a "Pitch" action reusing `collab_applications`. This is the paid
  brand/booker/patron → creator loop, needing no payment keys. _E2E verified: a
  Brand posts a "$300 fixed" commission → it appears under Commissions with the
  budget badge → an illustrator sees it and pitches → correctly filtered out of
  Collabs._
- **O3b ✅ live (2026-07)** — native **Stripe Connect tips** (patron → creator,
  on-mission per §4.1 Lane A). Shipped: `creator_payouts` + `tips` ledger with read
  RPCs (migration `0041`); three edge functions — `stripe-connect-onboard` (Express
  account + hosted onboarding link + a `refresh` status re-sync), `stripe-tip`
  (destination-charge Checkout so funds settle to the creator), `stripe-webhook`
  (signature-verified: marks tips paid on `checkout.session.completed`, syncs
  readiness on `account.updated`); frontend `PayoutSetup` (Enable tips) + `TipButton`
  (amount sheet → hosted Checkout). Stripe keys + webhook registered on Edge;
  `VITE_FEATURE_TIPS=on` for production / preview / development (Vercel) and local
  `.env.local`. **Owner smoke:** You → Settings ⋯ → Enable tips (Express onboard) →
  second account Tips on `/u/{id}` → Checkout → `tips.status=paid`. Platform Connect
  must stay enabled at [dashboard.stripe.com/settings/connect](https://dashboard.stripe.com/settings/connect)
  (Express). Fee: `STRIPE_TIP_FEE_BPS=0`. No ads, no paywalls, no external payment links.

### 12.21 Universal report/flag button ✅ (shipped 2026-07)
Trust & Safety: a reusable `ReportButton` puts a simple, optional flag on **every**
piece of user-generated content — audio **drops** (`TrackCard`), **project posts**
and **gallery images** (`ProjectView`, non-owner), and the home feed
(`FeedPostCard`, standardized on it). It feeds the existing moderation backbone
(`report_content` → `content_reports` → `mod_report_queue`/`mod_resolve_report`),
whose reasons already include **Illegal** — no schema change. _E2E verified: a
drop flagged "Illegal" persists to `content_reports` (`reason='illegal'`, status
`open`) and shows the reporter a confirmation._ (Promoted from `IDEAS_BACKLOG.md` #5.)

### 12.2 Spaces → Projects (profile creative projects) ✅ — schema: `profile_projects`

Shipped: public Space tabs on profiles, post kinds (audio/image/video/text/link),
follows → feed + match boosts, `/p/:id` deep links. Private collab rooms remain
**Studio** (`projects` / `/projects`). Discipline-module *UX* stays out of nav;
onboarding maps Role+Intent into modules via `apply_role_intent_onboarding`.

_Historical heading retained for continuity:_
One solid profile; users add unlimited **Projects** (aliases, bands, works) as profile
tabs. Each Project is an in-profile **micro-blog**: the creator posts content + updates
(music, artwork, ebooks, voice clips, links). Viewers open a Project tab to see its posts,
and can **like/follow individual Projects** — those follows feed matchmaking and track the
viewer's interests. The home feed becomes truly multi-content, curated by intent
(music→music, art→artwork, connect→mixed) with content-type + layout filters.
- **Data model:** `profile_projects` (tabs), `project_posts` (kinded posts), `project_follows`,
  `project_post_likes`. RPCs for create/list/post/follow/like + a unified content feed.

### 12.3 Passkey-first unified auth ✅ (shipped 2026-07)
**Goal:** one seamless, secure entry that unifies sign-up & sign-in via **passkeys**, with
email/password as a fallback, and a **tap-your-avatar** entry (default avatar if new).

**Shipped:**
- **Storage:** `20260709_0025_passkeys.sql` creates `passkeys` + `webauthn_challenges`
  (these were referenced by the function but never existed — passkeys were dead).
  RLS: owners read/rename/revoke their own; the challenge table is service-role only;
  challenges auto-prune hourly.
- **Passkey-first sign-up:** new `signup-options`/`signup-verify` actions create an
  email-anchored account and register a passkey as the **primary** credential in one
  ceremony, then mint a session. Duplicate email → `account_exists` (client pivots to sign-in).
- **Usernameless sign-in + tap-your-avatar:** discoverable-credential `get()` behind a
  round avatar affordance; **conditional UI** (`useBrowserAutofill`) armed when an
  anchored email input is present.
- **Profile management:** `PasskeysCard` — add (upgrades password accounts), rename, revoke.
- **Passkey RP ID:** `RP_NAME="VYBZ"`, allow-list = `vybz.cloud` + `vybz.*` +
  `astramatrix.xyz` + `*.vercel.app` + `localhost`; RP ID now bound to the **registrable
  domain** so a passkey roams across subdomains.
- **Fallback:** full email/password path with graceful WebAuthn error handling
  (cancel/`NotAllowedError`/`InvalidStateError` treated as benign).
- **Verified:** deployed function + migration; server paths smoke-tested; full browser
  sign-up→sign-out→sign-in exercised against the live backend via a virtual authenticator.

**Still open (non-blocking):** for distinct apex domains (e.g. `vybz.cloud` + redirect
apexes), publish `/.well-known/webauthn` **related origins** so one credential spans
them; optional silent **conditional create** to auto-upgrade password users post-login.
Provision the Vercel DNS zone for `vybz.cloud` if not already live.

### 12.7 Closing the Loop ✅ (alignment sprint)
Video playback in feed/Space cards; `apply_role_intent_onboarding` + embed intents;
Spaces vs Studio copy; `vybz.cloud` canon in docs/legal; packaging cleanup
(`vybz-app`, `cloud.vybz.app`); connection Accept/Decline + `match_feedback`;
avatar upload UI; Studio uploads → Bunny secure; orphan purge + `NotFoundPage`.

### 12.5 Staff system — admin, moderators, rewards ✅ (shipped 2026-07)
Role tiers **member < moderator < admin** (`profiles.platform_role`, `is_admin` kept in
sync; `is_platform_admin()` / `is_platform_mod()` guards). Every privileged path is a
SECURITY DEFINER RPC re-checking `auth.uid()` — privilege cannot self-escalate, and
demotion revokes access immediately (verified).
- **Admin console** (`/admin`): Members (member/mod/admin **role picker** + ban), **Staff**
  (roster, role changes, **audit log**), **Applications** (review moderator applications),
  plus the existing Disciplines / Matchmaking / Bug-reports tabs.
- **Moderator console** (`/mod`): a **report queue** (dismiss / warn / hide / remove /
  escalate — hide/remove pull the post from feeds, warn/escalate notify the author/admins)
  and a **rewards** tab (credits, rank, leaderboard, recent actions).
- **Rewards = cosmetic-store credits** (`mod_points`): actions pay 1–4 credits, tying mod
  work to the Lane B cosmetic store — a no-cash-cost incentive.
- **Application portal** (`/apply-mod`): members pitch to join; admins approve → moderator.
- **Reporting**: `content_reports` (post/drop/user/message) with a report affordance on feed
  posts + profiles; deduped, feeds the queue.
- **Audit**: every staff action logged to `staff_actions` (actor, action, target, points).
- Scope guardrails: moderators can triage/act on content but **cannot** see the member
  roster, appoint staff, or permanently ban — those stay admin-only (ban power via escalate).

### 12.6 Cosmetic store (Lane B) ✅ (shipped 2026-07) + desktop width
Purely-aesthetic store — **nothing functional is ever gated**. Items are unlocked with
**credits** (`mod_points` earned by moderating; Stripe top-ups arrive with Lane A).
- **Catalog** (`cosmetics`) + ownership (`user_cosmetics`) + `profiles.equipped_cosmetics`;
  RPCs `list_cosmetics` / `purchase_cosmetic` / `equip_cosmetic` / `unequip_cosmetic`
  (server enforces price vs. balance). `public_profile` now returns equipped cosmetics.
- **accent** = a two-stop gradient on the creator's avatar + name; **flair** = a small
  badge by the username. Applied on own + others' profiles (`lib/cosmetics` + `Flair`).
- **`/store`** page: buy / equip / unequip, credit balance, live previews.
- This closes the loop with the moderator rewards: mod work → credits → cosmetics.
- **Lane A credit top-ups ✅ (2026-07):** platform Checkout packs (`stripe-credit-topup` +
  `credit_topups` ledger + `fulfill_credit_topup` on webhook) — Starter $5/50, Plus $10/120,
  Pro $25/350 → `mod_points`. No Connect KYC required. Tips remain O3b (Express).
- **Weekly best-fit digest ✅ (2026-07):** opt-in (`profiles.digest_opt_in`, default off) email
  via edge `weekly-digest` + Resend (`RESEND_API_KEY`, `DIGEST_CRON_SECRET`).
  `digest_week_bundle` packs week stats (listens/feels/tips/credits), new opportunities,
  and top Connect matches. You → Settings toggle. Mondays 15:00 UTC (or `?dry_run=1`).

**Desktop layout:** the main content shell was widened from `max-w-2xl` (672px) to
`max-w-5xl` / `xl:max-w-6xl`, and the feed grid now spans full width (2-col → 3-col on
xl) so wide monitors are properly used instead of a narrow centered column.

### 12.9 Visual identity system — Phase 1 ✅ (shipped 2026-07)
Made every surface feel like its own place without touching the mission or data:
- **Per-surface theming** (`lib/surfaceTheme`): wires the intended-but-unused
  `--accent-rgb` per route so the whole token system (`veil-*` utilities, title
  glow, buttons, nav glow, shadows) + the living-background variant recolour per
  surface — Feed=violet, Connect=pink, Discover=cyan, Studio=teal, Store=gold,
  Staff=emerald, You=amber — with a smooth accent crossfade.
- **`PageHeader`** primitive: haloed surface icon + accent title + "why this page"
  subtitle + accent hairline (applied to Feed/Connect/Discover/Studio).
- **Depth:** whisper-quiet film-grain overlay (`GrainOverlay`).
- **Motion:** staggered card reveals (`.reveal`) on Feed + Connect.
- **Audio-reactive polish:** **Off / Soft / VYBZ Max** intensity in profile
  settings. Viewport/card outlines retired — reactivity concentrates on the
  **taskbar Orb** (morph modes from uploader `playback_customization` + FFT bands).
  `DynamicBackground` still scales by intensity (0 when effects Off / reduced).
  _Env note (§4.1): validate on a real device._
- **Residue:** purged off-mission wording (legacy economy / confession domains) in touched files.

### 12.11 Uploads/Library dashboard — Phase 3 ✅ (shipped 2026-07)
The profile's read-only "Your drops" became a **manager**: each drop shows stats
(plays · Vyb · Fail · rating) with inline **rename**, **set-featured**, and
**delete** (confirm). Edit/delete are owner-scoped via existing `drops` RLS
(`author_id = auth.uid()`); featuring is a guarded RPC (`set_featured_drop`,
migration `0031` + `profiles.featured_drop_id`) that verifies ownership and
headlines the chosen drop on the profile. Component: `UploadsLibrary`.
_Verified end-to-end against the live DB (feature → rename → delete all persist)._
_Follow-ups: purge the Bunny object on delete (edge `bunny-delete`); extend the
Library to Project posts + Studio versions; surface the featured drop publicly._

### 12.10 Media pipeline — Phase 2 ✅ (shipped 2026-07)
Instant posting + large, high-quality media:
- **Realtime feed** (migration `0030`): `drops` + `project_posts` added to the
  `supabase_realtime` publication; `FeedPage` subscribes to INSERTs and silently
  reloads (debounced), so new drops/Project posts appear the instant they're posted —
  yours and others'. RLS still governs delivery (drops `using(true)`; posts gated
  on the non-archived parent project). _Verified: a server-side insert surfaced at
  the top of an idle feed with no refresh._
- **Streamed uploads** (`bunny-upload`): the Edge Function now **streams the request
  body straight to Bunny** (`duplex: "half"`) instead of buffering the whole file,
  so memory stays flat and large masters/video go through; cap raised **200 MB → 1 GB**
  (enforced via `Content-Length`). Objects serve with `accept-ranges: bytes` for
  range-based streaming playback. _Verified end-to-end: exact-byte upload to both the
  secure (drop) and public (post) zones._
- **Upload progress + validation**: `uploadAudio` reports real progress (XHR); the
  drop composer shows a progress bar + size and rejects >1 GB with a clear message.
- **Deferred (documented):** Bunny **Stream/HLS** transcoding for adaptive video —
  needs a provisioned Stream library + keys (not available in the build env); large
  video already streams as progressive MP4 via Bunny CDN range requests until then.

### 12.12 Onboarding explicit seeks — "who are you looking for?" ✅ (shipped 2026-07, P0 #3)
Closed the biggest cold-start gap: a new onboarding step (role → intent →
**who are you looking for?** → avatar) captures the roles a creator explicitly
wants, feeding `creator_seeks` directly so `collab_matches` surfaces
exactly-wanted collaborators from day one (not just role-affinity inference).
- **UX:** quick-pick roles sampled across families + live catalog search
  (`suggestDisciplines`); selected roles show as removable chips. Skippable.
- **Durable (migration `0032`):** explicit picks persist on
  `profiles.profile.seekRoles`; `sync_creator_graph` builds `creator_seeks` from
  **module `wants_roles` ∪ explicit `seekRoles`**, so they survive module
  re-syncs and work for custom (non-catalog) roles too. `apply_role_intent_onboarding`
  gained `p_seek_roles`. Manual editor (`set_creator_roles`) still overrides.
- **Verified:** UI selection (Producer/Drums/Mix Engineer/Lead Vocalist) →
  `creator_seeks` = those + affinity-inferred (band, bass). End-to-end on live DB.

### 12.13 "For you" feed blend ✅ (shipped 2026-07, P0 #4)
The default home feed is now **personalized**, not newest-first. `feed_for_you`
scores each Space post by follow (+5), complement-fit author (+3), accepted
connection (+2), and intent/content-type match (+1), decayed by recency; cold
users fall back to recency gracefully. Anti-popularity **"Undiscovered"**
(`feed_undiscovered`: fresh, least-liked first) is a separate toggle on the home
feed, so new/under-exposed work still surfaces. Visibility was also hardened
across `feed_posts`/`feed_for_you`/`feed_undiscovered` (hidden/scheduled/
followers-only posts filtered). Migration `0033`.
_Verified on live DB: a viewer who follows+complements creator B saw B's post
ranked above unrelated C in For-you, and least-liked-first in Undiscovered._

### 12.14 Auto BPM + key detection ✅ (shipped 2026-07, P1 #9)
Drop uploads are analyzed **client-side** (no deps, no network, no cost) to
auto-fill tempo + key: onset-flux autocorrelation for BPM, and an FFT chromagram
+ Krumhansl-Schmuckler correlation for key (`src/lib/audioAnalysis.ts`), run on
the existing single decode in `computeWaveform`. The composer pre-fills both
(user-overridable, with an "auto-detected" hint), strengthening the matchmaking
tempo/key signals. _Verified: a known 120 BPM file detects 120 BPM / A minor._
BPM is highly reliable; key is a best-effort suggestion.

### 12.15 Faceted discovery ✅ (shipped 2026-07, P1 #5)
Discover became a real finder: beyond name/role/genre, a filter panel adds
**DAW, plugin, musical key, BPM (tempo-range fit), location, and remote-only**
(`search_creators` migration `0034`, definer over public facets; BPM matches
when the creator's `tempoMin..tempoMax` covers the target). Pairs with the
auto-detected BPM/key signals. _Verified on live DB: each facet returned the
right creator; BPM outside a creator's range correctly excluded them._

### 12.16 Landing hero ✅ (shipped 2026-07)
The post-login home feed opens with a personalized **hero**: a greeting, your
strongest fresh matches (avatar, % fit, explainable **confidence read**) for
one-tap Connect/Message, a "see all matches" link, and a finish-your-profile
nudge (seeks/avatar) when relevant. Pure frontend (`FeedHero`, reuses
`collab_matches`); dismissible. Ties matchmaking into the first screen.

### 12.4 Premium feel, mobile-first, modular & customizable UI
Direction to move beyond "AI cookie-cutter" theming toward a bespoke, premium surface:
- **Mobile-first & modular:** larger touch targets, thumb-reachable actions, and a profile/
  home built from rearrangeable **modules** (cards/tabs) the user can reorder/show-hide to
  taste; per-user layout + accent preferences (persisted).
- **Intricate, subtle ambience:** cohesive motion language (spring easing, staggered reveals),
  soft depth (layered glass, grain/noise, gradient meshes), and micro-interactions on every
  control — nothing static, nothing loud.
- **Alive icons:** nav/action icons gain a soft hover/active glow and gentle activity pulses
  (unread, live, new match) that are **obvious but never overwhelming** — an accent halo, not
  a klaxon.
- **Signature, not template:** a distinct type/space rhythm, a custom icon treatment, and
  brand-specific empty states/loaders so the app reads as VYBZ, not a starter kit.
- **Accessibility & performance:** honour reduced-motion, keep 60fps, respect safe areas.
