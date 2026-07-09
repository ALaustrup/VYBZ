# VYBZ — Master Build Bible

> ## **VYBZ: Find Yours.**

**Product:** VYBZ is the next-generation, **identity-first** platform for finding and
seeking music-production collaborations, and for the frictionless exchange of raw
creative material (samples, stems, one-shots, presets, MIDI, and full DAW project
files). Owner: **Astra Matrix, Inc.** Domain: **`vybz.astramatrix.xyz`**.

**Status:** authoritative and current. This document was fully rewritten to match
the real, shipped codebase after a clean-slate rebuild. If anything you have read
elsewhere (old notes, prior drafts, commit history) conflicts with this file, **this
file wins.**

> ### Correction of record (read once, then move on)
> VYBZ was originally scaffolded by forking an unrelated app ("MYVYB"). That was a
> mistake: **only the visual design/layout was ever meant to carry over — nothing
> else.** The entire inherited functional domain (anonymous/guest accounts,
> confessions, dating, crisis "lifelines," random chat, AI companions/echoes, NSFW,
> games, that app's live/rooms/XR, and its economy) was **removed** in a clean
> rebuild. **VYBZ has no anonymity of any kind** — every account is a real, durable
> creator identity. Any statement to the contrary is obsolete. Do not reintroduce
> those concepts.

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
- **Not "the next SoundCloud."** It is not a streaming/consumption platform and not a
  store. Discovery exists **only** to make a connection or a collaboration happen.
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

---

## 2. Current state — VYBZ v1 (shipped)

The clean rebuild delivered a working, identity-first v1. **This is the baseline; new
work extends it.**

**Shipped:**
- **Identity + auth.** Email + password onboarding → username claim. No guest tier.
  Passkey sign-in is a planned addition on top of this. Anonymous sign-in is disabled
  at the project level.
- **Creator profiles + identity editor.** Roles you *offer* and *seek* (with skill),
  genres, DAWs, plugins, influences, tempo, keys, languages, bio, location,
  open-to-work / remote-ok, and per-facet privacy.
- **Precision matchmaking (`collab_matches`).** Complementary-role model blended with
  genre/DAW/plugin/tempo/language overlap + semantic resonance, returning the "why"
  and a 0–1 fit. Surfaced on **Connect** and as a **Spark** swipe deck.
- **Opportunity board.** Post/browse open roles ("band seeking guitarist"); apply;
  `my_opportunities` ranks openings for the roles you offer.
- **Sound-first feed of drops.** Upload audio (any format, lossless preserved),
  waveform preview, track cards, a **global always-on player** (single shared
  `AudioBus`), seeded audio-reactive visualizers, Vyb/Fail, and embedded star ratings.
- **Connections + 1:1 DMs** between creators who connect.

**Verified end-to-end** against the live database (two complementary creators produced
a 100% mutual match; drop upload → player → rating → connect → DM all persist).

---

## 3. Architecture & conventions

### 3.1 Stack
- **Frontend:** Vite 6 + React 18 + TypeScript 5 (strict), Tailwind 3, `framer-motion`,
  `react-router-dom` 6, `lucide-react`. Path alias `@/` → `src/`. Installable PWA;
  Capacitor (Android) target retained for later native packaging.
- **Backend:** Supabase (Postgres 17 + Auth + Storage + Edge Functions). The client
  uses the anon key + RLS only; privileged logic is `SECURITY DEFINER` RPCs.
- **Audio:** a single global `AudioBus` (`src/lib/audioBus.ts`) — one shared
  `AudioContext` → `AnalyserNode` chain — powers all playback and the reactive visuals.
- **Build/lint:** `npm run build` = `tsc --noEmit && vite build`.

### 3.2 Database (clean VYBZ schema — `supabase/migrations/20260709_*.sql`)
Identity-first tables (RLS on all): `profiles` (+ owner-private `profile` jsonb of
music facets, GIN-indexed; a `public_profiles` view + `public_profile()` RPC expose
only sanitized public fields), `roles`/`genres`/`daws`/`plugins` (controlled
vocabularies), `creator_roles`/`creator_seeks` (the bipartite offer/seek core),
`profile_embeddings` (pgvector, server-written), `drops` + `reactions` (feed + taste,
tallied by trigger), `assets` (+ P2P swarm manifest columns designed in for the future
swarm) + `track_ratings` (+ aggregate trigger) + `asset_downloads` (license chain),
`connections` + `dm_threads`/`dm_messages`, and `collab_posts`/`collab_applications`.
A trigger auto-creates a profile on signup.

**RPCs (definer, `search_path=public`, emit only aggregates/labels — never raw private
facets):** `collab_matches`, `my_opportunities`, `set_creator_roles`,
`my_creator_roles`, `creator_roles_for`, `public_profile`, `rate_track`,
`request_asset_download`, `start_dm`, plus `jsonb_overlap_*` helpers.

### 3.3 Frontend structure
- **State:** `src/store/session.tsx` (`SessionProvider`/`useSession` — auth, profile,
  toast/celebrate). Player state is the `AudioBus` singleton via `usePlayer()`.
- **Data:** `src/lib/api.ts` (all Supabase calls, typed).
- **Design system (preserved from the fork — the one thing kept):** `src/index.css`
  (the "Smoked Glass" tokens, glass panels, glow, buttons), `tailwind.config.js`, the
  responsive shell (side rail / bottom nav) in `src/App.tsx`, and primitives
  (`Brand`, `Toast`, `Confetti`, `EmptyState`, `Handle`, `DynamicBackground`, …).
- **Clean audio modules:** `audioBus`, `waveform`, `TrackCard`, `Waveform`,
  `TrackVisualizer`, `GlobalPlayer`; `profileFields.ts` is the single source of truth
  for the music catalog + the matching-facet shape.
- **Pages:** Feed (drops), Connect, Spark, Opportunities, Profile, Profile Edit,
  User Profile, Messages.

### 3.4 Infrastructure
- **Supabase:** one VYBZ project (`xixmneooyufbeftdfpcm`), us-west-1. Anonymous sign-in
  **off**; email enabled; `mailer_autoconfirm` on for alpha (turn on email
  verification before public launch). Storage buckets: `media-public` (avatars,
  public), `audio-assets` + `project-files` (private, signed-URL access).
- **Domain:** `vybz.astramatrix.xyz` (Vercel). SEO/canonical/manifest target it.
- **Edge Functions:** `embed` computes semantic-resonance vectors using Supabase's
  **built-in Edge inference** (`Supabase.ai`, model `gte-small`, 384-d) — free,
  server-side, no external provider or API key. `passkey` (WebAuthn) wiring pending.
  All MYVYB functions were removed.

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
| **E. Signature reactivity** ✅ | Platform-wide audio-reactive border + seeded per-track visualizer library; user Auto/Full/Reduced effects control. |
| **F. Categorized collab chat** ✅ | Taxonomy-bound rooms (role/genre/DAW), realtime messages + presence. |
| **G. Live (v1)** ✅ | *Synchronized listening sessions* in rooms (Supabase Realtime + AudioBus). LiveKit group rehearsal/XR still gated on SFU infra. |
| **H. The swarm (P2P)** | Encrypted-chunk WebRTC distribution behind a flag (the `assets` manifest columns are already designed in). |
| **I. Mobile + packaging** | Capacitor Android/iOS, PWA polish, native plugin-scanner sync. |
| **J. Monetization** | Pro tier; tasteful, disclosed affiliate gear/plugin links (never influencing match scores). |
| **K. DM real-time collaboration** ◑ | **H1 shipped**: live 1:1 audio in DMs (WebRTC P2P, mic/desktop audio, in-chat player + record). Next: **H3** audio→MIDI (Basic Pitch: melody/harmony/rhythm), **H4** Web-MIDI→DAW bridge (virtual port), **H5** native "VYBZ Bridge" for deep plugin/audio integration + TURN for NAT reliability. |
| **L. Codex (public doc library)** | Free, public, professionally-drafted music-industry document library (contracts→demand letters) with plain-English explainers, jurisdiction tags, and disclaimers. US-first. ~90 document types catalogued. |
| **M. Brand system** | Official VYBZ logo set (mark/wordmark/mono), favicons/PWA icons, OG image, intro animation, email + Codex-doc headers. Drops into `public/brand/`. |

### 4.1 Development findings & environment constraints
- **DM live audio (H1) is implemented and correct**, but cannot be fully exercised in the CI/VM test environment: there is **no microphone**, and `getDisplayMedia` tab-audio capture is **silent** (no real audio output device to capture), so the visualizer/audible path has no signal to show here. Verified in-sandbox: the go-live control + source menu, graceful no-device error handling, `getDisplayMedia` capture → offer → "Calling…" panel + controls, clean build, no console errors. Two real bugs found + fixed during testing: (a) a `MediaStreamSource→Analyser` graph needs a destination sink or Chrome won't process it; (b) the listener needs an `<audio>` element to actually hear the remote stream. **Full 1:1 live audio (audible + visualizer + two-peer connect) should be validated on real devices.**
- **Infra-gated backlog** (all blocked only on hosting/cost, code is ready): C2PA worker live hosting (needs a reachable container host — LAN box unreachable, free Docker hosts now require payment/PRO); **TURN** server for strict-NAT WebRTC reliability; **LiveKit** SFU for group live rehearsal/XR. These flip on the moment infra exists.
- **Testing note:** file-playback visuals (feed/reactive border) work in-VM because they tap the in-graph analyser directly; capture-based audio (mic/tab) does not, due to the VM lacking audio hardware.

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
aggregates + role labels. Weights are hand-tuned today; §5.4 makes them earned.

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

**(h) Learning-to-rank.** Log which matches lead to connections/DMs/collaborations and
train the weights from outcomes over time, replacing hand-tuning — while keeping the
explainable "why" on top.

**(i) Hard filters vs soft boosts.** Let users set non-negotiables (remote-only,
DAW-compatible for project handoff, language) as hard filters, distinct from soft
ranking boosts.

**(j) Fairness & freshness.** Guard against rich-get-richer: surface new/underexposed
creators and diversify results so the network stays vibrant.

**(k) Explainability & confidence.** Always show *why* + a confidence read so creators
trust and act on matches.

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
    edge). Alpha activation = `docker compose up` on the VYBZ server + set the
    `C2PA_WORKER_URL`/`C2PA_WORKER_TOKEN` edge secrets; until then downloads deliver the
    watermarked-only file (safe fallback). Self-signed ES256 cert for alpha; CA-issued
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

The `AudioBus` analyser already exists. Build: (1) **platform-wide audio-reactive
borders** — a calm neon pulse born from low-end energy that radiates around the
viewport during playback (respect `prefers-reduced-motion`; <3ms/frame budget); and
(2) the **seeded per-track visualizer library** — every drop's visualizer derives from
`hash(creator_id + asset_id)` so no two tracks ever look the same (a static seeded
frame at rest, reactive while playing). Both are pure functions of the shared analyser.

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
