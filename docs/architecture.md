# Architecture reference

**Reference, not authority.** [`PRODUCT.md`](../PRODUCT.md) decides what we build; this
describes how the existing system is wired so you can find things. Measured 2026-08-15.

The default product is the pack suite and marketplace (`PRODUCT.md` v2, decision 0003).
Vibes Radio and The Station remain in this inventory as parked surfaces. They are not
deleted and they are not what we build next.

Scale: **714 TypeScript files · 77,321 lines** across `src` and `packages` · **111 migrations**
· **30 edge functions** · 140 test files.

## Stack

Vite 6 · React 18 · TypeScript 5.6 strict · Tailwind 3 · React Router 6 · Supabase
(Postgres + Auth + Storage + Realtime + Edge Functions) · Tauri desktop · Capacitor Android
(iOS preserved, deferred).

## Layout

```
src/
  app/          routing truth, e2e fixtures, AI review portal + machine manifests
  components/   shared UI, VDock player, library, shell chrome
  features/     vertical slices (prepare, correction, translation, stems, packs,
                mastering, storefront, radio, livingMix, tools, alpha)
  lib/          audioBus, api, playback, waveform, cosmetics, utils
  pages/        route-level screens
  perception/   detector → catalog → graph observation engine
  platform/     Platform Bridge: desktop, android, ios, sync, push, costs, jobs
  product/      invariants.ts — the enforceable rules
  shell/        SuiteShell, navigation model, tools launcher, suite app registry
packages/
  domain/       releases, credits, collab (frozen)
  processing/   waveform (DSP + measurement), mastering, metadata, readiness
  data/         repositories + RLS contract tests
supabase/
  migrations/   111 files, additive only
  functions/    30 edge functions
```

## Audio and measurement

`packages/processing/waveform` is the core. `analyzeWavBuffer` decodes WAV PCM and produces
peaks plus a full metric pack.

**Standards-oriented:** `measureBs1770` implements K-weighting with 400 ms / 75% gating for
integrated, momentary and short-term LUFS plus LRA; `measureTruePeakDbtp` uses 4× oversampling.
Validated in `bs1770.test.ts` against a −23 LUFS stereo sine within **±0.5 LU**, a mono variant
near −26, and determinism on re-run. Not a certified meter, and never described as one.

**Derived:** crest factor, PLR, inter-sample overshoot, stereo correlation, mid/side, spectral
balance, clip integrity, edge silence, DC offset, mono compatibility, channel balance. Mains
hum and click/pop are labelled heuristics.

**Correctors** are real PCM transforms, reversible and versioned: DC removal, peak safety,
channel balance, silence trim, mains-hum notching, stereo width, spectral EQ assist, click
attenuation, loudness gain to target, and loudness matching for A/B comparison.

**Honest gaps:** no AI source separation, ONNX mastering is named but never executed, local
genre/mood inference returns null, no real MP3/AAC encode, device and codec previews are
labelled approximate simulations.

## Playback

`src/lib/audioBus.ts` is the single global engine and is deliberately a **dry
`HTMLAudioElement`**. It never calls `createMediaElementSource` or attaches a Web Audio graph
to the play path, because doing so muted CDN playback in Chromium. Consequently visual
reactivity is reconstructed from stored waveform peaks at the playhead rather than live FFT.

`src/lib/vdock/playbackSignal.ts` carries the disclosure contract: `catalog`, `local`,
`ambient` or `simulation`, with human-readable text for the latter two.

**Authorisation:** `audio-play` is the playback ticket authority. It holds service role, checks
`can_user_play_path`, mints an HMAC ticket, and then either streams or redirects to a signed
storage URL. A guest allowlist covers the pre-login featured track. **Migration is incomplete** —
the client still prefers `createSignedUrls` in places and storage read is not owner-locked.

## Data model, by domain

**Catalog:** `assets`, `drops`, `drop_plays`, `drop_feedback`, `drop_wave_comments`,
`reactions`, `track_ratings`, `provenance_ledger`, `vybz_lists*`, `playlists*`

**Social:** `profiles`, `connections`, `artist_profiles`, `artist_members`, `collab_posts`,
`match_feedback`, `matchmaking_learning`, `profile_embeddings`, `social_scores`

**Messaging and rooms:** `dm_threads`, `dm_messages`, `rooms`, `room_messages`,
`room_memberships`

**Live:** `live_sessions`, `live_messages`

**Release workstation:** `release_projects`, `release_assets`, `release_findings`,
`release_credits`, `processing_jobs*`

**Version control (unused by the UI):** `repo_blobs`, `repo_trees`, `repo_commits`,
`repo_branches`, `repo_merge_requests`, `repo_listings`

**Commerce and credits:** `storefront_packs`, `storefront_orders`, `tips`, `credit_topups`,
`vc_ledger`, `vc_tx_ledger`, `cosmetics`

**Radio:** `vibes_radio_pool`, `vibes_radio_queue`, `vibes_radio_broadcast` (singleton, `id = 1`)

**Access:** `invite_keys`, `invite_redemptions`, `alpha_waitlist`

## Edge functions

Playback and media: `audio-play`, `bunny-upload`, `bunny-sign`, `bunny-live`, `watermark`,
`watermark-detect`, `visual-generate`
Money: `stripe-webhook`, `stripe-tip`, `stripe-credit-topup`, `stripe-connect-onboard`,
`storefront-checkout`, `ai-topup`
AI and data: `embed`, `ai-metadata`, `ai-mastering`, `storefront-pack-copy`,
`storefront-pack-art`, `processing-enqueue`
Platform: `vibes-radio`, `livekit-token`, `ice-servers`, `passkey`, `oauth-start`,
`oauth-callback`, `waitlist-join`, `waitlist-notify`, `weekly-digest`, `cost-alert`,
`vc-room-renewals`

## Unusual subsystems worth knowing about

**Vibes Radio** — synchronized broadcast. Clients poll for `startedAt` / `serverNow`, compute
skew, and seek to the shared position. This is the foundation The Station builds on.

**Perception Engine** (`src/perception/`) — detector → catalog → graph producing observations
with lifecycles (`new` → `seen` → `stale` → `regressed`) and typed edges.

**AI review portal** (`src/app/aiReview/`) — a machine-readable manifest of the app's own
surfaces, served over authenticated HTTPS, plus a read-only fixture world for agent walkthroughs.

**Working set and DAW folder link** — a session-level "current track" shared across tool desks,
plus directory detection for Ableton, FL and Logic. Detection only; not DAW sync.

**Reactive visuals** — WebGL SDF engines for the Orb and DropStage, Visualizer Studio with
high-resolution export, and a shared per-frame reactive runtime.

## Platform Bridge

`src/platform/bridge/` defines the contract; `createBridge` selects web, desktop, android, ios
or mock. Domain code must never import `@tauri-apps/*` or `@capacitor/*` directly. Offline
support lives in `src/platform/sync/` (mutation queue, upload queue, field merge,
sync-on-reconnect).

## Frozen, not deleted

Multi-human collaboration (`src/features/collab/`, `src/platform/collab/`,
`packages/domain/collab/`) stays in the tree, imported by nothing. `SuiteAppRail` likewise.
Dating-era schema such as `spark_likes` remains in the database but has no product surface and
never will.
