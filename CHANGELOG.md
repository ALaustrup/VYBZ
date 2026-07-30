# Changelog

All notable platform releases are documented here. Product labels follow
[`VERSIONING.md`](./VERSIONING.md).

## [1.1.0-beta1A] – Phase 18 (Cost-Minute Billing)

**Pending push** — branch `phase18-billing` · exit gate
[`PHASE18_EXIT_GATE.md`](./docs/architecture/PHASE18_EXIT_GATE.md)
· ADR [`ADR_AI_MINUTE_BILLING.md`](./docs/architecture/ADR_AI_MINUTE_BILLING.md) (ADR-032)

- Phase 18: AI processing seconds → billable minutes; Stripe top-up; hard-stop at balance ≤ 0
- Ledger `ai_credit_ledger` · Edge `ai-topup` · webhook `kind=ai_topup` (+6000 s pack)
- `/settings/credits` wallet + Master low-balance banner (&lt;120 s)
- ADR-032 AI minute billing

## [1.1.0-beta1A] – Phase 17 (Desktop macOS & Linux)

**Merged** — tag `v1.1.0-beta1A-phase17` · exit gate
[`PHASE17_DESKTOP_EXIT_GATE.md`](./docs/architecture/PHASE17_DESKTOP_EXIT_GATE.md)
· ADR [`ADR_DESKTOP_CROSS.md`](./docs/architecture/ADR_DESKTOP_CROSS.md) (ADR-031)

- Phase 17: macOS DMG & Linux AppImage released, auto-update feeds per OS
- Signed DMG + AppImage targets, CI matrix (`windows-msi` · `mac-dmg` · `linux-appimage`)
- Auto-update channels: `windows/` · `darwin/` · `linux/`
- Notarisation wiring via `MAC_CERT_BASE64` / `MAC_CERT_PWD` (+ optional Apple ID secrets)
- ADR-031 Desktop cross-platform

## [1.1.0-beta1A] – Phase 16 (Collaboration Sessions)

**Merged** — tag `v1.1.0-beta1A-phase16` · exit gate
[`PHASE16_COLLAB_EXIT_GATE.md`](./docs/architecture/PHASE16_COLLAB_EXIT_GATE.md)
· ADR [`ADR_COLLAB_SESSIONS.md`](./docs/architecture/ADR_COLLAB_SESSIONS.md) (ADR-030)

- Phase 16: real-time presence, live cursors, comment threads, conflict-safe merge
- Live presence + cursors on Prepare / Credits (Realtime + local session store)
- Anchored comment threads (waveform / metadata / credits)
- Conflict-safe metadata merge (`row_version` + `merge_release_metadata`)
- ADR-030 Collaboration Sessions

## [1.1.0-beta1A] – Phase 15 (Remote AI Processing)

**Merged** — tag `v1.1.0-beta1A-phase15` · exit gate
[`PHASE15_REMOTE_AI_EXIT_GATE.md`](./docs/architecture/PHASE15_REMOTE_AI_EXIT_GATE.md)
· ADR [`ADR_AI_MASTERING.md`](./docs/architecture/ADR_AI_MASTERING.md)

- Phase 15: AI mastering & metadata suggestions, remote job billing, free-tier kill-switch
- AI mastering DSP (loudness / peak / width) + optional ONNX weights path
- Metadata AI (genre, mood, BPM, ISRC suggestions) via Groq + fixtures
- `processing_jobs_ai` / `processing_results` · cost hooks · `/release/:id/master`
- ADR-029 AI Mastering

## [1.1.0-beta1A] – Phase 14 (Cost Sentinel)

**Merged** — tag `v1.1.0-beta1A-phase14` · exit gate
[`PHASE14_EXIT_GATE.md`](./docs/architecture/PHASE14_EXIT_GATE.md)
· ADR [`ADR_COST_SENTINEL_UI.md`](./docs/architecture/ADR_COST_SENTINEL_UI.md)

- Cost telemetry ledger, soft monthly caps, kill-switch flags, dashboard chart
- Daily `cost-alert` Edge Function (Resend at ≥ 90% cap)
- ADR-028 Cost Sentinel UI

## [1.1.0-beta1A] – Phase 13 (Android Beta)

**Merged** — tag `v1.1.0-beta1A-phase13` · exit gate
[`PHASE13_EXIT_GATE.md`](./docs/architecture/PHASE13_EXIT_GATE.md)
· ADR [`ADR_ANDROID_BETA.md`](./docs/architecture/ADR_ANDROID_BETA.md)

- Phase 13: Android Beta — signed AAB, Play Console metadata, upload queue retry, in-app update API, AES-GCM prefs
- Play-ready AAB CI (`bundleRelease`), data-safety form, flexible in-app updates
- Upload-queue UI (retry + progress), `vybz://release/:id`, FCM registration
- AES-GCM prefs via Android KeyStore · ADR-027

## [1.1.0-beta1A] – Phase 12 (Desktop Beta)

**Merged** — tag `v1.1.0-beta1A-phase12` · exit gate
[`PHASE12_EXIT_GATE.md`](./docs/architecture/PHASE12_EXIT_GATE.md)
· ADR [`ADR_DESKTOP_UPDATER.md`](./docs/architecture/ADR_DESKTOP_UPDATER.md)

- Desktop Beta signed channel, auto-update feed, multi-window, sealed prefs
- Windows updater feed `https://update.vybz.cloud/windows/stable.json`
- MSI (+ NSIS) CI with Authenticode secrets; WaveformPreview multi-window
- AES-GCM `%APPDATA%\\Vybz\\secrets.bin` + legacy hex migration
- ADR-026 Desktop updater

## [1.1.0-beta1A] – Phase 11 (perf + premium UI)

**Merged** — tag `v1.1.0-beta1A-phase11` · exit gate
[`PHASE11_EXIT_GATE.md`](./docs/architecture/PHASE11_EXIT_GATE.md)

- Phase 11: Premium dark/vibrant redesign, Lighthouse ≥ 99, K6 p95 < 200 ms
- Cloudflare WAF template & DB indices hardening

## [1.1.0-beta1A] – Phase 10 (platform checkout)

**Fully deployed** — 2026-07-29 · tags `v1.1.0-beta1A-phase10`,
`v1.1.0-beta1A-phase10-platform` · PR [#11](https://github.com/ALaustrup/VYBZ/pull/11)

- Storefront live in production using platform checkout
- Manual settlement workflow released
- All a11y, unit, e2e, and cost-sentinel checks green

Also in this phase: production flag + secrets; migration `0084`
(`settlement_status`); Edge Checkout without Connect transfer; ADR-023 /
[`PHASE10_EXIT_GATE.md`](./docs/architecture/PHASE10_EXIT_GATE.md).

## Unreleased — Suite Genesis (Beta-1A planned)

**Codename:** Suite Genesis. VYBZ repositioned as a **release operating system**
(“Everything between finished and released”). Music Hub audience surfaces
(artist pages, VDock, tips, live, storefront) preserved as the public layer of a
longer professional lifecycle.

### Phase 10 – Storefront go-live (complete — fully deployed)

- Production `VITE_FEATURE_STOREFRONT=true` on Vercel (`astramatrix/vybz`)
- Platform Checkout (no Connect) + Orders **Settle now** · live `$1` smoke passed
- Secrets: `GROQ_API_KEY`, `FAL_KEY`, live Stripe on Supabase `xixmneooyufbeftdfpcm`
- Tags: `v1.1.0-beta1A-phase10`, `v1.1.0-beta1A-phase10-platform`
- See **[1.1.0-beta1A] – Phase 10** above for the release summary

### Phase 9 Polish & Visual (complete — merged + tagged)

- Storefront + CoverLab visuals wired behind `FLAGS.storefront` · public `/pack/:slug`
- Brand polish tokens (motion / shadow / accent wash) · a11y smoke extensions
- Cost Sentinel read-only UI at `/settings/costs`
- PR #8 merged to `main`; tag `v1.1.0-beta1A-phase9`
- Exit gate: [`docs/architecture/PHASE9_EXIT_GATE.md`](./docs/architecture/PHASE9_EXIT_GATE.md)
- ADR: [`docs/architecture/ADR_VISUAL_POLISH.md`](./docs/architecture/ADR_VISUAL_POLISH.md)

### Phase 8 Distribution Readiness (complete — merged + tagged)

- Loudness / ISRC / DPI rules · ZIP + DDP-stub export · `/release/:id/distribution`
- Cost Sentinel free-tier alert (no auto-spend) · export SHA via Playwright
- PR #7 merged to `main`; tag `v1.1.0-beta1A-phase8`
- Exit gate: [`docs/architecture/PHASE8_EXIT_GATE.md`](./docs/architecture/PHASE8_EXIT_GATE.md)

### Phase 7 Sync & Collaboration (complete — merged + tagged)

- Reconnect mutation flush · field merge · accept mine/theirs conflict UI
- AES-GCM sealed drafts · two-user RLS Playwright (no secrets) · offline/online e2e
- PR #6 merged to `main`; tag `v1.1.0-beta1A-phase7`
- Exit gate: [`docs/architecture/PHASE7_EXIT_GATE.md`](./docs/architecture/PHASE7_EXIT_GATE.md)

### Phase 6 Android Alpha / 2.A (complete — merged + tagged)

- `cloud.vybz.app` signing workflow · APK smoke hash · upload queue · `vybz://` + FCM stub
- Mobile credits / Findings read-only · sealed prefs · Detox contract (Vitest)
- PR #5 merged to `main`; tag `v1.1.0-beta1A-phase6`
- Exit gate: [`docs/architecture/PHASE6_EXIT_GATE.md`](./docs/architecture/PHASE6_EXIT_GATE.md)

### Phase 5 Desktop Alpha / 2.D (complete — merged + tagged)

- NSIS installMode both · updater channels JSON · installer smoke hash workflow
- `/desktop/process` batch panel · window prefs · secure session store · crash file log
- PR #4 merged to `main`; tag `v1.1.0-beta1A-phase5`
- Exit gate: [`docs/architecture/PHASE5_EXIT_GATE.md`](./docs/architecture/PHASE5_EXIT_GATE.md)

### Phase 4 Processing Engine (complete — merged + tagged)

- Portable waveform/FFT/loudness (`@vybz/processing/waveform`, ≤10 MB Worker)
- Tauri `vybz_analyze_audio`; Bridge wiring; Cost Sentinel (log-only alerts)
- `processing_jobs` + Edge `processing-enqueue` skeleton (no paid AI)
- PR #3 merged to `main`; tag `v1.1.0-beta1A-phase4`
- Exit gate: [`docs/architecture/PHASE4_EXIT_GATE.md`](./docs/architecture/PHASE4_EXIT_GATE.md)

### Phase 3 Credits & Metadata (complete — merged + tagged)

- `release_credits` schema + RLS (`0082`) with up/down SQL
- Domain/data packages; metadata seeding; mutation-queue conflicts
- `/release/:id/credits` in-place edit + Playwright hard-refresh
- PR #2 merged to `main`; tag `v1.1.0-beta1A-phase3`
- Exit gate: [`docs/architecture/PHASE3_EXIT_GATE.md`](./docs/architecture/PHASE3_EXIT_GATE.md)

### Phase 2 Prepare MVP (complete — merged + tagged)

- Release Project schema + RLS (`0081`) with up/down SQL
- Domain/data/processing packages; Web Worker readiness probes ($0)
- `/releases`, `/releases/new`, `/release/:id` Findings UI + local hard-refresh
- PR #1 merged to `main`; tag `v1.1.0-beta1A-phase2`
- Exit gate: [`docs/architecture/PHASE2_EXIT_GATE.md`](./docs/architecture/PHASE2_EXIT_GATE.md)

### Phase 1.5 Platform readiness (complete on `suite-genesis`)

- PlatformBridge contract + web/mock/desktop/android stubs
- Capability registry, shell modes, deep-link/cache/mutation contracts
- Tauri Windows PoC scaffold (`apps/desktop/`); Capacitor bridge on existing `android/`
- Workspace Stage A aliases (`@vybz/*`); no source tree moves
- Exit gate: [`docs/architecture/PHASE15_EXIT_GATE.md`](./docs/architecture/PHASE15_EXIT_GATE.md)

### Multi-platform blueprint expansion (docs)

Master Blueprint rewritten for unified **VYBZ Cloud** + **VYBZ Desktop (Tauri 2)** +
**VYBZ for Android (Capacitor)** on one Platform Services backend. Inserted
**Phase 1.5 Platform readiness** before Prepare MVP. ADRs and platform specs added
under `docs/architecture/` (Platform Bridge, workspace plan, auth/deeplinks,
offline/sync).

Phase 0 (doctrine): **complete** on `suite-genesis`.

Phase 1 (engineering + design foundation): **complete** on `suite-genesis`:

- Canonical design tokens + product surface accents
- Shared UI primitives + canonical state views
- SuiteShell (PrimaryRail / MobileNav) with placeholders for every Suite product
- Route manifest + legacy `/studio` → `/projects` preserve
- Job / cost / audit / org / provider-health stubs (Bunny disabled)
- Vitest + Testing Library, Playwright smoke, GitHub Actions CI
- Phase 1.1: deterministic Playwright preview runner
- package metadata remains `1.1.0` / `Beta-1A` (**no git tag yet**)

Still carried from the prior Unreleased Music Hub line (not discarded):

- SEO/logo pack; `@vybz.cloud` email; site-visuals CDN on Supabase Storage
- AI Visualizer stills (`visual-generate`) + Sample Pack Storefront (WIP, uncommitted)
- Bunny retired as media origin; LiveKit for live
- Capacitor Android seed (`cloud.vybz.app`)

## Prior Unreleased notes — 2026-07-28 — Official Launch Reposition (archived doctrine)

Music Hub tip + live + catalog wedge, marketing landing, waitlist, dating/Spark
demotion, Living Home archive. Superseded as **product north star** by Suite Genesis;
historical copy: [`docs/archive/pre-suite-2026/`](./docs/archive/pre-suite-2026/).

## Beta-0B.1 — 2026-07-25 — Elite Reactive Campaign

- **V-Dock** widgets catalog + Now Playing system widget (prior); naming locked
- **WebGL2 Orb** (`orbEngine`) + Canvas2D fallback; snappier analyser; Monitor Cue duck
- **DropStage** compositor for drop banners (TrackVisualizer alias)
- **Drop video/still backdrops** — New Drop upload → `playback_customization.backdropUrl`; Cover/Fit + dim; reactive overlay
- **Live reactive tiles** — Social Top-3 / Live grid `LiveTileStage`; Watch SFU `LiveVisualizer` stage overlay
- **Voice slot lights** G/Y/P on room voice + V-Dock `voiceSlots` sync
- Material chrome: `mat-surface`, `cta-pill`, Social Top-3 `broadcast-bezel`, Spark `match-bloom`
- [`docs/PRODUCTION_HARDENING.md`](./docs/PRODUCTION_HARDENING.md) — gates + Edge inventory

### Also in 0B.1 line
- Music Repos R5 handoff hints; Unified Social Live Phases 1–4 (schema, LiveKit, Social hub, room voice)

## Beta-0B — 2026-07-24 — Music Repos

Studio evolves into a GitHub-like music VCS (flag `VITE_FEATURE_REPOS`, default on).

- Migrations `20260724_0059_music_repos.sql` + `0060_music_repos_collab_market.sql` — CAS blobs/trees/commits/branches, merge requests, tip pull manifest, listings/purchases
- New Repo sheet — directory picker / drag-drop, Ableton/FL ignore rules, SHA-256 dedupe sync
- Repo room tabs — History, Branches (MR + pull tip), Listing (cosmetic credits), Files, Credits
- Studio hub — “Repos for sale” feed via `repo_listed_feed` + purchase with `mod_points`
- Bridge R4 — `tools/vybz-bridge` folder watch + `commit-ready` auto-commit protocol (`repo-watch-v1`)

## Beta-0A.1 — 2026-07-24

Documentation and ops alignment to the live Beta-0A platform.

- Architecture, masterplan, AGENTS, README, SECURITY, VERSIONING, and C2PA worker docs refreshed for full-bleed taskbar, Orb-first FX, Projects/Studio naming, and full Edge Function inventory.
- Infra scripts: `origin`-only Git checks; deploy JWT-exempt list matches live functions (removed ghost `push-send`).
- Minor comment/brand/audio README corrections.

## Beta-0A — 2026-07-24

First Beta baseline. Closes the Alpha era.

### Taskbar & chrome
- Unified full-bleed bottom dock (no desktop side rail); player strip lives inside taskbar glass.
- Pins evenly spaced in a `1fr | orb | 1fr` layout; bar reaches screen edges on all viewports.

### Orb
- Idle: slow neochrome plasma sphere.
- Playing: eases into uploader morph / palette; on playback end, soft return to idle sphere.
- Larger draw surface + silhouette caps so Max intensity no longer clips.

### Stability / display
- Soft / VYBZ Max reactive intensity prefs; session boot failsafe; DEV service-worker unregister.

## Alpha (historical)

Everything prior to tag `Beta-0A` / commit baseline on `main` through
`fa861ff` and earlier — including the platform pivot, passkeys, Projects /
Studio, matchmaking, Stripe Connect tips, weekly digest, New Drop editor, and
Orb-first reactivity — is **Alpha**. No further Alpha labels will be cut.
