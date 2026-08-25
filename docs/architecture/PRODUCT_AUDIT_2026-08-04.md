# VYBZ Current-State Product Audit

> **HISTORICAL SNAPSHOT — NOT PRODUCT IDENTITY.** Dated 2026-08-04 (Suite initiative). VYBZ is a social network. Read [`PRODUCT.md`](../../PRODUCT.md). Do not sequence Suite visual work from this file.

**Date:** 2026-08-04
**Baseline:** branch `feat/m2-purge-dating-and-nonaudio` @ `8972eaa6` (production `main` @ `c79948b6` plus the dating removal in PR #52)
**Purpose:** Deliverable 1 of the premium suite initiative — establish exactly what exists before any visual work begins.

> **Evidence standard.** Every status below is derived from reading source. Claims carry
> `file:line` citations. Anything not verified is marked **Unknown — not verified** rather than
> assumed. No status is inferred from a document, a commit message, or a previous phase plan.

---

## 1. Repository facts

| Metric | Value | How counted |
|---|---|---|
| React components (`.tsx`) | 207 | `src/**/*.tsx` |
| TypeScript modules (`.ts`) | 172 | `src/**/*.ts` |
| Page components | 41 | `src/pages/*.tsx` |
| Supabase migrations | 99 | `supabase/migrations/*.sql` |
| Supabase edge functions | 30 | `supabase/functions/*/` |
| Unit test files | 44 | `**/*.test.ts(x)` |
| E2E specs | 14 | `e2e/*.spec.ts` |
| Feature flags | 11 | `src/lib/flags.ts:7-30` |

Gate on this baseline: `lint` PASS · `test` 149/149 PASS · `build` PASS · `test:e2e` 26/26 PASS · `check:no-fixtures` PASS.

---

## 2. Route map

Signed-in routes are declared in `src/App.tsx:166-211` plus `src/app/suitePlaceholderRoutes.tsx`.

### 2.1 Real, reachable surfaces

| Path | Component | Domain |
|---|---|---|
| `/` | `ProfilePage` (dashboard, tabbed) | Home |
| `/feed` | `FeedPage` | Discovery |
| `/discover` | `DiscoverPage` | Discovery |
| `/connect` | `ConnectPage` | Collaboration |
| `/opportunities` | `OpportunitiesPage` | Collaboration |
| `/projects`, `/projects/:id` | `ProjectsPage`, `ProjectRoomPage` | Studio |
| `/social` | `SocialPage` | Social (flagged) |
| `/live`, `/live/:id` | `LivePage`, `LiveWatchPage` | Live |
| `/messages`, `/messages/:id` | `MessagesPage` | Messaging |
| `/rooms`, `/rooms/:id` | `RoomsPage`, `RoomPage` | Rooms |
| `/profile/edit` | `ProfileEditPage` | Identity |
| `/library` | `LibraryPage` | Media |
| `/visuals/tutorial`, `/visuals/studio` | Visualizer pages | Visuals |
| `/releases`, `/releases/new`, `/release/:id` | Prepare | Release |
| `/release/:id/credits` | `ReleaseCreditsPage` | Release |
| `/release/:id/distribution` | `DistributionReportPage` | Release |
| `/release/:id/master` | `ReleaseMasterPane` | Mastering |
| `/tools/packs`, `/tools/packs/new`, `/tools/packs/:id/edit`, `/pack/:slug` | Storefront (flagged) | Commerce |
| `/store` | `StorePage` (Vc / cosmetics) | Commerce |
| `/settings/costs`, `/settings/credits` | Cost Sentinel, AI minutes | Account |
| `/admin`, `/mod`, `/apply-mod` | Staff | Staff |
| `/u/:id`, `/artist/:slug`, `/p/:id` | Public profiles | Public |
| `/codex`, `/codex/:slug`, `/legal/:slug` | Codex + legal | Public |
| `/desktop/process`, `/desktop/waveform` | Desktop batch, waveform | Desktop |
| `/mobile/uploads`, `/android/beta` | Android queue, beta | Mobile |

### 2.2 Placeholder routes — reachable but non-functional

Declared in `src/app/suitePlaceholderRoutes.tsx:38-163`, all rendering `SuitePlaceholderPage`:

`/credits` · `/master` · `/coverlab` · `/release/:id/artwork` · `/sentinel` · `/sentinel/:id` · `/relay` · `/release/:id/delivery` · `/wallet` · `/settings`

**Status: Mock or placeholder.** These are honest placeholders (they say which phase they belong to), but under the new direction `/settings` and `/wallet` being placeholders is a real gap — both are in the target navigation.

### 2.3 Route manifest drift

`src/app/routeManifest.ts:12-56` declares 30 canonical `SUITE_ROUTES` with a `nav` flag, consumed by `suiteNavRoutes()` (`:90-92`). **Its only consumers are dead components** (§6). The manifest is therefore aspirational documentation, not the live routing table. It lists `/studio`, `/market`, `/wallet`, `/settings`, `/relay`, `/sentinel`, `/coverlab` as nav destinations; several are placeholders.

**Status: Obsolete as a navigation source; useful as a target IA reference.**

---

## 3. Feature inventory

### 3.1 Media, playback, visuals

| Feature | Status | Evidence |
|---|---|---|
| **Audio playback engine** | **Production-ready** | `src/lib/audioBus.ts:62,89-119` — single module-singleton `HTMLAudioElement`. Persists across navigation because `VDock` mounts in `SuiteShell` outside `<Routes>` (`App.tsx:223-235`) |
| **Player controls** | **Partially implemented** | Present: play/pause, prev/next, seek, time, volume/mute, queue, favourite, expand/collapse, waveform progress (`vdock/widgets/DockWidgets.tsx`, `NowPlayingStage.tsx:481-577`). **Absent: repeat and shuffle UI** — `loadQueue` accepts `loop` but nothing sets it (`audioBus.ts:259`). **Absent: artwork in player** |
| **Media library** | **Functional but visually unfinished** | `src/pages/LibraryPage.tsx:29-98` — three tabs (Drops/Posts/Stages), fixed fetch of 80 items, 2-col grid or list. **No search, no filters, no sort, no grouping, no virtualization, no pagination** |
| **Library multi-select / batch** | **Absent** | No selection state anywhere in `LibraryPage` or `UploadsLibrary` |
| **Track contextual actions** | **Partially implemented** | `TrackCard.tsx:66-266` exposes inline buttons only (play, seek, open artist, react, download, report, rate). Library overlay adds feature/rename/delete (`UploadsLibrary.tsx:99-107`). **No hover affordance, no right-click menu, no long-press sheet, no anchored context menu** |
| **Upload — ComposeSheet** | **Partially implemented** | `ComposeSheet.tsx` — single file, 1 GB cap, real XHR progress (`:271-273`). **No drag-and-drop, no multi-file, no resume, no cancel, no pre-upload duplicate block.** Copy advertises "Trim" (`:349`) but the full range is always used (`:261-268`) and `AudioTrimBar` is never imported |
| **Upload — BulkUploadSheet** | **Partially implemented** | Up to 24 files (`:19,243`), sequenced release creation (`:159-198`). Progress is "i / n" only, no byte progress, no cancel |
| **Upload queue (mobile/desktop)** | **UI implemented but backend incomplete** | Engine and persistence real (`platform/sync/uploadQueue.ts:51-175`, `uploadQueueController.ts:22-41`) but **the uploader is a stub that simulates progress** (`uploadQueueController.ts:46-53`) |
| **Visualizer — Studio** | **Functional but visually unfinished** | `VisualizerStudioPage.tsx:142-167` — genuine `AnalyserNode` + `MediaElementAudioSource` on a local preview element. 6 reactive styles (`visualizerStudio.ts:51-62`) |
| **Visualizer — player / dock / cards** | **Partially implemented — not live audio** | `DockVisualizer.tsx:55-56` and `DropStage.tsx:171` render from `readBands()`/`readFrequencies()`, which **synthesise bands from stored peak data plus playback time** (`audioBus.ts:148-217`), not from an FFT of the playing signal. Deliberate: `audioBus.ts:4-7` records that no `MediaElementSource` is attached to the playback element |
| **Waveform generation** | **Production-ready** | `src/lib/waveform.ts:109-139` (browser decode at upload) and `packages/processing/waveform/` (offline WAV peaks/loudness/FFT) |

### 3.2 Release preparation and processing

| Feature | Status | Evidence |
|---|---|---|
| **Prepare workflow** | **Functional but visually unfinished** | `src/features/prepare/` — upload → scan → score → breakdown. Hybrid persistence: localStorage first, Supabase when signed in, mutation queue on failure (`service.ts:56-179`) |
| **Readiness findings** | **Partially implemented** | 18 readiness codes (`packages/domain/releases/src/readiness.ts`) + 12 distribution codes (`distributionRules.ts`). All fire from real probe data |
| **Audio analysis** | **Partially implemented** | WAV only, ≤10 MB: PCM 16/24/32 + float32 (`pcm.ts:23-96`), peak, RMS, gated LUFS-approx (`loudness.ts:8-46`). **Cannot measure: true peak, certified LUFS, BPM, key, artwork DPI. Cannot decode: MP3, FLAC, M4A, AIFF, OGG** |
| **Mastering** | **Partially implemented — real DSP, not AI** | `packages/processing/mastering/src/master.ts:62-134` — mono RMS measurement → gain to target RMS → optional mid/side width → hard peak limit at 0.95 → 16-bit WAV. The `ai-mastering` edge function checks for ONNX but **does not execute it** (`supabase/functions/ai-mastering/index.ts:189-209`) |
| **Processing jobs (remote)** | **Backend implemented but UI missing** | `processing-enqueue` inserts a row with `state: "queued"` (`index.ts:57-84`). **No worker consumer exists in this repository, and no client code calls the function.** Whether a worker runs in production: **Unknown — not verified** |
| **Processing (desktop batch)** | **Functional but visually unfinished** | `DesktopBatchPanel.tsx:48-57` — synchronous portable FFT, or Tauri native when a local path exists. Web shows a placeholder (`:95-108`) |
| **Distribution export** | **Mock or placeholder** | The ZIP contains `DISTRIBUTION_REPORT.json` + `README.txt` **and no audio or artwork** (`buildReport.ts:55-58`). DDP is a marker file (`:70-77`) |
| **Credits** | **Functional but visually unfinished** | Full add/edit/delete with split validation (`ReleaseCreditsPage.tsx:73-80`); hybrid persistence; domain rules never invent names (`packages/domain/credits/src/rules.ts:110-113`) |

### 3.3 Commerce, discovery, social

| Feature | Status | Evidence |
|---|---|---|
| **Storefront (creator)** | **Functional but visually unfinished** | Real Supabase CRUD, ZIP + preview upload, price $1–$5000, publish gate requires ZIP (`StorefrontEditorPage.tsx:95-136`). Flagged `FLAGS.storefront`, default ON |
| **Checkout / payments** | **Partially implemented** | Real Stripe Checkout (`supabase/functions/storefront-checkout/index.ts:42-67`) and webhook fulfilment with signed ZIP email (`stripe-webhook/index.ts:22-146`). Settlement is **manual by design** — orders carry `settlement: "pending_manual"` (`:64`, `prepareOrderInsert.ts:36`). Live vs test Stripe key: **Unknown — not verified** |
| **V¢ economy** | **Partially implemented** | Real ledger RPCs `vc_award`, `vc_transfer_username`, `vc_list_ledger` (`api.ts:3564-3601`); balance from `profiles.mod_points`. Stripe top-up real |
| **AI credits** | **Partially implemented** | DB path `get_ai_credit_balance` + `ai_credit_ledger` (`api.ts:1071-1096`), **with an in-memory fallback when the RPC fails** (`platform/costs/aiCredits.ts:36-58`) |
| **Cost Sentinel** | **Partially implemented** | Client-side accumulation with optional RPC (`recordCost.ts:29-48`). Not server-authoritative billing telemetry |
| **Discovery / feed** | **Functional but visually unfinished** | Real RPCs: `discovery_feed`, `list_visible_drops`, `for_you_drops`, `search_creators`, `collab_matches`, `top_live_sessions`, `list_social_rooms` |
| **Public profiles** | **Production-ready** | `public_profile`, `creator_profile_stats`, `get_artist_by_slug`, `profile_project_detail` |
| **Live streaming** | **Partially implemented** | Real LiveKit SFU via `livekit-token` edge function (`livekitSfu.ts:37-59`); **degrades to local preview when secrets are missing** (`LiveWatchPage.tsx:92-98`) |
| **Messaging / cam** | **Partially implemented** | Real threads and messages (`api.ts:2307-2367`); WebRTC cam/voice over Supabase broadcast (`camCall.tsx:65-76`) |
| **Cosmetics store** | **Production-ready** | Real RPCs `list_cosmetics`, `purchase_cosmetic`, `equip_cosmetic` (`api.ts:722-754`); spends V¢, not card |

### 3.4 Platform layer

| Feature | Status | Evidence |
|---|---|---|
| **Platform Bridge** | **Partially implemented** | Contract at `platform/bridge/types.ts:21-60`. Web implements files/auth/processing/notifications. Desktop pick/save/reveal/openExternal are **stubs returning null/false** that fall back to web (`tauriInvoke.ts:16-30`); `selectFolder` throws (`desktop.ts:35-37`) |
| **Desktop native audio** | **Functional** | Tauri command `vybz_analyze_audio` (`apps/desktop/src-tauri/src/lib.rs:29-32`), used when a local path exists (`desktop.ts:87-105`) |
| **Desktop auto-update** | **Backend implemented but UI missing** | Feed logic exists (`platform/desktop/updateCheck.ts:36-71`); no UI calls it |
| **Desktop window prefs** | **Partially implemented** | Rust persists geometry (`lib.rs:35-44`) but the TS restore applies theme only (`restoreWindowPrefs.ts:7-17`) |
| **Android** | **Partially implemented** | KeyStore-backed secure prefs (`keystorePreferences.ts:22-68`), Play Core in-app update (`inAppUpdate.ts:35-56`), upload queue UI — but the uploader is the stub noted above |
| **iOS** | **Hidden or feature-flagged** (preserved, deferred) | Bridge mirrors Android with Keychain (`ios.ts:14-118`); CI builds an IPA when secrets exist. `platform/ios/backgroundUpload.ts` has zero importers |
| **Offline sync** | **Partially implemented** | `fieldMerge.ts:26-46` is solid; conflict UI exists (`SyncConflictPanel.tsx` mounted at `ReleaseCreditsPage.tsx:128`). **The mutation queue is in-memory only** (`mutationQueue.ts:36-66`) so queued work is lost on reload |
| **CI build targets** | **Production-ready (pipelines)** | `desktop.yml` (MSI/DMG/AppImage), `android.yml` (AAB), `ios.yml` (IPA), `ci.yml` (web gate) |

### 3.5 Shell and navigation

| Feature | Status | Evidence |
|---|---|---|
| **Signed-in shell** | **Functional but visually unfinished** | `SuiteShell.tsx:31-58` — app bar + stage + inspector + dock + orb |
| **Navigation** | **Partially implemented** | `OrbMenu` is the single nav surface (`SuiteShell.tsx:54-56`), hover-to-open on fine pointers, tap on touch (`OrbMenu.tsx:10-21`) |
| **Command palette** | **Absent** | `CommandBar.tsx:3-14` is a read-only stub and `showCommandBar` defaults `false` (`SuiteShell.tsx:17,41`), so it never renders |
| **Context inspector** | **Functional but visually unfinished** | Mounted but collapsed by default and `hidden lg:flex` (`ContextInspector.tsx:22`) |
| **Responsive behaviour** | **Functional but visually unfinished** | Shell-mode classes (`index.css:247-283`); on narrow viewports navigation is the orb plus the bottom dock. `.suite-rail` CSS exists but the rail is never mounted |
| **Design tokens** | **Partially implemented** | `src/design/tokens.ts` provides product accents, z-index, motion, shadow, accent wash — but typography, spacing and surface scales live in `index.css` and Tailwind config, not in tokens |

---

## 4. Law 1 register — measurement honesty

Law 1 forbids presenting any value as measured unless it was measured.

### 4.1 Open defect

| # | Defect | Location | Note |
|---|---|---|---|
| 1 | **Sample peak is presented as true peak.** `probe.peakDbfs` is assigned to `truePeakDb` and can trigger `DIST_TRUE_PEAK_HIGH` — "True peak … dBTP" — with a sample-peak number. True peak requires oversampling and is not implemented | `DistributionReportPage.tsx:73`, `distributionRules.ts:189-199` | **A fix already exists** on the parked branch `feat/audio-loudness-mp3-flac` (adds a separate `samplePeakDbfs` field and a distinct finding) |

### 4.2 Dormant rule — cannot fire

| # | Issue | Location |
|---|---|---|
| 2 | `DIST_ARTWORK_DPI_LOW` requires `artwork.dpi`, but the PNG and JPEG probes never extract DPI, so the rule can never fire. Not fabrication, but a check that silently does nothing | `distributionRules.ts:209-217`, `packages/processing/readiness/src/fixtures.ts:64-98` |

### 4.3 Estimates that are labelled — acceptable

| Item | Location | Labelling |
|---|---|---|
| Integrated loudness is a gated-RMS approximation without K-weighting | `packages/processing/waveform/src/loudness.ts:5-6,39-40` | Type doc says "Not a certified BS.1770 meter" (`types.ts:19-21`); UI says "estimated, not standards-certified" |
| Readiness display score is a weighted formula, not a measurement | `src/features/prepare/readinessScore.ts:27-31` | Presented as a readiness score, not a technical measurement |
| AI mastering billing duration estimated from byte length | `src/features/mastering/aiMasterService.ts:110` | Internal billing estimate; should be labelled if surfaced |

### 4.4 Previously reported, now verified fixed

| Backlog item | Finding |
|---|---|
| §3 #1, #5 — hash-derived ISRC, genre, mood, BPM | **Fixed.** `inferMetadataLocal` returns `source: "unavailable"` with nulls (`packages/processing/metadata/src/infer.ts:19-27`) |
| §3 #2, #3 — hardcoded true peak `−1.5`, loudness `−14` | **Fixed.** No literals remain in `DistributionReportPage` |
| §3 #4 — artwork DPI defaulted to 300 | **Partly fixed** — now `?? null`, which makes the rule dormant rather than fabricated (see 4.2) |
| §3 #6 — hardcoded `remoteMinutes = 31` | **Fixed.** Not present |
| §3 #12 — undisclosed `stereoWidth` 1.05 default | **Fixed.** Default is now `1` (`master.ts:70`) |
| §3 #15 — expose a build identifier | **Fixed.** `BuildStamp` on landing footer and menu drawer, verified in the live bundle |

### 4.5 Fixture data — correctly isolated

| Item | Location | Reaches users? |
|---|---|---|
| Demo AI credit ledger (`seedDemo`) | `AiCreditsPage.tsx:65-75` | Fixture path only |
| Demo cost events | `CostSentinelDashboardPage.tsx:71-79` | Fixture path only |
| Storefront order fixture | `StorefrontOrdersE2EFixturePage.tsx:5-19` | `/__e2e__/` only; `check:no-fixtures` proves absence from `dist/` |
| Metadata fixture | `packages/processing/metadata/src/infer.ts:8-13` | Gated on `input.fixture`; comment states "Never returned to a real user" |

---

## 5. Feature flags

| Flag | Env var | Default | Gates |
|---|---|---|---|
| `roleClass` | `VITE_FEATURE_ROLE_CLASS` | ON | Role-class badges, feed split |
| `tips` | `VITE_FEATURE_TIPS` | **OFF** | Stripe Connect tips |
| `liveBoost` | `VITE_FEATURE_LIVE_BOOST` | **OFF** | Paid live visibility (stub; forbidden as core model) |
| `oauthSpotify` | `VITE_FEATURE_OAUTH_SPOTIFY` | **OFF** | Spotify for Artists connector |
| `swarm` | `VITE_FEATURE_SWARM` | **OFF** | WebRTC chunk swarm |
| `pro` | `VITE_FEATURE_PRO` | ON | Pro soft entitlement UI |
| `repos` | `VITE_FEATURE_REPOS` | ON | Music Repos (CAS VCS) on Studio |
| `socialLive` | `VITE_FEATURE_SOCIAL_LIVE` | ON | Social hub + SFU |
| `bunnyAudio` | `VITE_FEATURE_BUNNY_AUDIO` | **OFF** | Bunny CDN audio origin — prohibited by `AGENTS.md` |
| `storefront` | `VITE_FEATURE_STOREFRONT` | ON | Sample pack storefront |
| `prepare` | `VITE_FEATURE_PREPARE` | ON | Prepare MVP |

---

## 6. Dead code and dormant components

Present in the tree, imported by nothing or never rendered.

| Path | Reason | Disposition |
|---|---|---|
| `src/shell/PrimaryRail.tsx` | Zero importers | **Revive** — a collapsible sidebar is required by the new direction |
| `src/shell/MobileNav.tsx` | Zero importers | **Revive or replace** — bottom nav for high-frequency destinations |
| `src/shell/SuiteSwitcher.tsx` | Only imported by dead `PrimaryRail` | Decide with the rail |
| `src/shell/CommandBar.tsx` | Imported but `showCommandBar` is always false; read-only stub | **Replace** with a real command palette |
| `src/components/AudioTrimBar.tsx` | Zero importers, though Compose advertises trimming | **Repair and wire** |
| `src/platform/ios/backgroundUpload.ts` | Zero importers | Keep frozen |
| `src/app/routeManifest.ts` `suiteNavRoutes()` | Only dead consumers | **Repurpose** as the IA source of truth |
| `shellMode.ts` `isDenseShell` / `isTouchShell` | Test-only consumers | Wire into responsive logic |
| RPCs `feed_posts`, `feed_for_you`, `feed_undiscovered` | Backend exists, no UI consumer (`api.ts:511-530`) | **Backend implemented but UI missing** — candidate for the discovery module |

---

## 7. Platform parity matrix — current state

| Capability | Web | Desktop | Android | iOS |
|---|---|---|---|---|
| Signed-in shell | Yes | Yes (same shell) | Yes (same shell) | Shared web shell |
| File picker | Yes | Falls back to web (stub) | Web | Web |
| Folder import | — | **Throws** | — | — |
| Reveal in file manager | — | **Throws on failure** | Throws | Throws |
| Native audio analysis | — | **Yes** | — | — |
| Batch processing UI | Placeholder | **Yes** | — | — |
| Secure storage | localStorage | Tauri secure + fallback | KeyStore | Keychain |
| Push / deep links | — | — | Yes | Yes |
| In-app update | — | Logic only, no UI | Play Core banner | — |
| Offline queue persistence | Upload queue persisted; mutation queue in-memory | Same | Same | Same |
| Keyboard shortcuts | **Unknown — not verified** | Tauri menu has one item | — | — |

**Assessment:** the three clients already share one shell, one design language and one data layer — the foundation the directive asks for exists. What is missing is genuine platform advantage on desktop (folder import, reveal, real native pickers) and a mobile-appropriate layout rather than the desktop shell compressed.

---

## 8. Gap analysis against the target direction

| Requirement | Current state | Gap size |
|---|---|---|
| Command dashboard answering "what needs my attention" | `/` is a tabbed profile page (hub/listen/live/you/wallet) | **Large** — no action centre, no processing monitor, no release pipeline view |
| Persistent player with full controls | Engine production-ready; repeat/shuffle/artwork missing | **Small** |
| Library: grid/list/table/version-stack views | One tabbed grid/list | **Large** |
| Library search, filter, sort, grouping | None | **Large** |
| Contextual track action menu | Inline buttons only | **Large** — this is the single most-requested item and does not exist |
| Multi-select and batch operations | Absent in library | **Large** |
| Track detail experience | No dedicated track detail route | **Large** |
| Audio-reactive visualizer connected to playback | Live FFT only in Visualizer Studio; player visuals synthesised from peaks | **Medium** — needs an `AnalyserNode` on the playback graph |
| Design system with tokens | Partial: accents/motion/z-index in tokens, type/space in CSS | **Medium** |
| Command palette | Stub, never rendered | **Medium** |
| Release workspace as staged flow | Detail hub + separate pages | **Medium** |
| Upload: drag-and-drop, resume, dedupe | None of the three | **Medium** |
| Empty / loading / error / offline states | Partial (`StateView`, `EmptyState` exist) | **Small** |
| Accessibility | Some a11y E2E coverage; focus states inconsistent | **Medium** |
| Performance budgets | None defined; main bundle 848 kB, vendor 1,046 kB, audio-midi 1,784 kB | **Medium** |

---

## 9. Preservation plan

### 9.1 Retain unchanged — load-bearing and correct

| System | Why |
|---|---|
| `src/lib/audioBus.ts` | Correct single-element architecture; route-stable playback. Extend, never rewrite |
| `packages/processing/*` | Pure, deterministic, golden-tested DSP and probes |
| `packages/domain/*`, `packages/data/*` | Clean domain rules and repositories with RLS policy tests |
| Platform Bridge contract | Correct abstraction; fill in implementations rather than redesign |
| Supabase schema and RLS | 99 additive migrations. **No destructive migration will be proposed** |
| Stripe checkout + webhook + manual settlement | Working commerce path; preserve as-is unless separately authorised |
| Cosmetics / V¢ ledger RPCs | Production-ready |
| `fieldMerge`, `syncOnReconnect` | Solid sync primitives |

### 9.2 Repair — real bugs and honesty defects

| Item | Action |
|---|---|
| Sample peak mislabelled as true peak | Land the parked fix; reserve `truePeakDb` for a real oversampling meter |
| Mutation queue is in-memory | Persist to IndexedDB or localStorage so offline edits survive reload |
| Upload queue uploader is a stub | Wire to real Supabase Storage upload |
| Artwork DPI rule is dormant | Either extract DPI from PNG/JPEG headers or remove the rule |
| Compose advertises trimming that does not happen | Wire `AudioTrimBar` or remove the claim |
| Desktop pickers, folder import, reveal | Implement the Tauri commands behind the existing stubs |
| Desktop window geometry not restored | Apply the persisted geometry |

### 9.3 Extend — build on what exists

| Item | Action |
|---|---|
| Player | Add repeat, shuffle, artwork, queue UI |
| Visualizer | Attach an `AnalyserNode` to the playback graph for genuine live reactivity, keeping the peak-synthesis path as the fallback |
| Library | Add search, filters, sort, grouping, virtualization, multi-select, view switching |
| Track actions | Build the contextual action system: hover affordance, right-click, long-press sheet, batch |
| Track detail | New route reusing existing waveform, findings, credits and mastering components |
| Non-WAV analysis | Land the parked MP3/FLAC decode work so most uploads get real loudness |
| Dead shell components | Revive `PrimaryRail` and `MobileNav`; replace `CommandBar` with a real palette |
| Unused feed RPCs | Wire `feed_for_you` / `feed_undiscovered` into the discovery module |

### 9.4 Visually modernise — keep behaviour, upgrade surface

Dashboard · Library · Prepare · Release detail · Credits · Distribution · Storefront · Discover · Live · Messages — all have working data paths and need presentation work, not rewrites.

### 9.5 Carefully deprecate — with owner approval only

| Item | Recommendation | Blocked on |
|---|---|---|
| Placeholder routes `/coverlab`, `/sentinel`, `/relay`, `/release/:id/delivery`, `/release/:id/artwork` | Hide from navigation until real; keep routes for deep links | Owner decision |
| `/credits` and `/master` product-level placeholders | Redirect to the release-scoped equivalents | Safe to do |
| `/wallet` and `/settings` placeholders | **Must become real** — both are in the target IA | Scope decision |
| `routeManifest.ts` | Repurpose as the IA source rather than delete | Safe |
| Orphaned dating RPCs `vibe_matches`, `spark_act`, `feed_vibe_cards` and their columns | No client calls them after PR #52. Dropping requires a migration | **Owner approval required — irreversible** |

### 9.6 Explicitly not touched

Per the standing instruction to leave the rest alone: messaging, rooms, live, opportunities, cosmetics and the social feed are **retained as-is**. They are recorded here for completeness, not queued for removal.

---

## 10. What I did not verify

Stated plainly rather than implied:

1. **Whether a production worker consumes `processing_jobs`.** No consumer exists in this repository. If none runs, remote jobs stay `queued` forever.
2. **Whether the deployed Stripe key is live or test.** Determined by a deployed secret, not by code.
3. **Whether CI is green on `main` right now.** Verified green on PR #51 and locally on this baseline.
4. **Keyboard shortcut coverage** in the web app.
5. **Real-device behaviour** on Android and desktop builds. All platform claims come from source, not from running the apps.
6. **Actual database contents** — table shapes come from migrations, not from querying production.
7. **Runtime performance** with a large library. No profiling has been done; the bundle sizes above are build output, not measured load times.

---

## 11. Recommended execution order

The directive's Phase 1 is this document. For Phase 2 onward, ordered by user-visible value per unit of risk:

1. **Contextual track action system** — the largest explicit gap, and it unlocks most other workflows.
2. **Library search, filter, sort, virtualization, multi-select** — makes a catalogue usable.
3. **Command dashboard** — assemble from data paths that already exist.
4. **Design token consolidation** — must precede broad visual work or it will be redone.
5. **Player completion + live `AnalyserNode` visualizer.**
6. **Track detail route.**
7. **MP3/FLAC analysis** (already written, parked).
8. **Upload: drag-and-drop, dedupe, resume.**
9. **Command palette.**
10. **Desktop platform advantage** (pickers, folder import, reveal, geometry).
11. **Performance budgets and enforcement.**

---

*Audit produced by reading source at the stated baseline. Statuses reflect code, not intent.*
