# Changelog

All notable platform releases are documented here. Product labels follow
[`VERSIONING.md`](./VERSIONING.md).

> **From 2026-07-31 onward, every entry must declare a delivery state** from
> [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md) §12. "Merged" is not "delivered".

## [Unreleased] – M1 Doctrine refoundation (2026-08-01)

**Documentation only. No application code changed.** Delivery state: `DOCUMENTED ONLY`.

VYBZ is redefined as an **Audio Intelligence and Release Operating System**: truthful
measurement, correction, mastering, translation, release preparation, native publishing,
and verified export — with external DSP distribution as an explicitly gated future
milestone rather than a claim.

**Documentation authority collapsed from seventeen competing claims to five.**
`VYBZ_MASTERPLAN.md` (product doctrine), `AGENTS.md` (operating rules), `ARCHITECTURE.md`
(verified architecture only), the new `STATUS.md` (evidence-backed checkpoint), and
`IDEAS_BACKLOG.md` (backlog). All four existing files were rewritten from scratch.

- Phase numbering retired in favour of milestones **M0–M14**. Nineteen `v1.1.0-beta1A-phase*`
  tags remain as immutable history. There will be no "Phase 20".
- **Seven product laws** adopted, the first being *never fabricate analysis*.
- Dating, romantic and meetup functionality moved to permanently excluded scope.
  Multi-human collaboration frozen. Both are M2 work and no code has changed yet.
- 37 documents archived under `docs/archive/{suite-phases-2026,agent-roles-2026,product-briefs-2026}/`.
  All 50 archived files now carry a HISTORICAL ONLY banner — previously only two did.
- `docs/DOCUMENTATION_MANIFEST.md` deleted; its six-tier hierarchy contradicted the stated
  conflict order and indexed only part of the tree. The document map now lives in
  `ARCHITECTURE.md` §16.
- Nine remaining product briefs demoted from "Authoritative product brief" to reference.
- All inbound links to moved documents repaired across 10 files.

**Recorded but not yet fixed:** fifteen technical-integrity defects, nine of which are
fabricated values reaching users in production today — a hash-derived ISRC suggestion, a
hardcoded true peak that is never computed, a hardcoded artwork DPI, hash-derived genre,
mood, BPM and confidence, a hardcoded cost alert, and a processing endpoint that reports
success for work it never performs. Catalogued in `IDEAS_BACKLOG.md` §3 and owned by M3/M4.

### D1 — e2e fixtures removed from production · `DELIVERED AND PRODUCTION-VERIFIED`

PR [#30](https://github.com/ALaustrup/VYBZ/pull/30) merged out-of-band as a security fix.
Five `/__e2e__/*` routes rendered seeded fixture pages before any authentication or backend
check and were live on `https://vybz.cloud`.

Verified on production at `53ab9ef9`: the served bundle `index-CjRLJawG.js` contains none of
`__e2e__`, `mastering-e2e-fixture`, `collab-e2e`, `cost-sentinel-e2e` or `ai-credits-e2e`.
All five were present in the previous bundle.

PR [#31](https://github.com/ALaustrup/VYBZ/pull/31) (landing CTA) closed as superseded by M3;
branch preserved.

## [Unreleased] – Production Reality Audit + Master Blueprint v2 (2026-07-31)

**Documentation and doctrine only. No application code changed.**
Delivery state: `DOCUMENTED ONLY`.

A strictly read-only audit of live production established that production runs
repository HEAD `a84d984a` exactly — verified by Vercel deployment metadata **and** by
fingerprinting merged-PR strings in the served bundle. There was no deployment problem.

What the audit did find:

- The only surface an anonymous visitor sees is `LandingPage.tsx`, and **no phase or
  polish PR ever modified it**. It links to four places, none of them Suite features.
- Prepare, Credits, Distribution, MasterReady and the Collab panels all work in
  production anonymously, and are reachable only by typing a URL.
- Five `/__e2e__/*` Playwright fixtures bypass authentication and are live on the public
  internet with seeded data — **security defect**.
- Seven of fourteen primary nav entries render a "Suite placeholder" empty state.
- PRs #22–#29 total 17 files and +117/−97 lines of class substitution; the only
  anonymous-visible artifact of the whole sweep is the favicon. (PR #28 does not exist —
  `#28` is an open issue.)
- Six of eighteen phases went primarily to native shells that have distributed zero
  installers to zero users.

Changes:

- **`VYBZ_MASTERPLAN.md` rewritten as v2** — all durable doctrine retained; §0 delivery
  vocabulary added; §2 current state replaced with audit-verified facts; §21 phase
  ledger reconciled against production; §22 delivery integrity gate added; §23 roadmap
  replaced with Track D (delivery correction) → E (earn Beta-1A) → P (product) → N (native).
- **`docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md`** added as the permanent
  evidence baseline.
- **`AGENTS.md`** pickup rewritten to Track D; phase table now states delivery states
  instead of "Complete".
- **`ARCHITECTURE.md`** corrected — it claimed Tauri was absent and that no `apps/` or
  `packages/` existed; documented the real routing/auth gate and four known defects.
- Resolved the phase-numbering collision: execution phases keep integers, product tracks
  (CoverLab, Sentinel, Relay) use names only.

New development is paused until Track D's exit gate passes: a visitor with no account
and no instructions can reach the free readiness scan, complete it, and see Findings.

### D1 — e2e fixtures removed from production builds

Delivery state: `DEPLOYED BUT UNVERIFIED` until the next production deploy.

Five `/__e2e__/*` routes rendered seeded data and returned before any auth or backend
check, and were reachable on `https://vybz.cloud`.

- Fixture shells moved out of `src/App.tsx` into `src/app/e2eFixtures.tsx`, reached only
  when `VITE_E2E_FIXTURES === "on"`. Vite inlines that at build time, so ordinary builds
  fold the branch to `false` and tree-shake the module away.
- `npm run build:e2e` is the only entry point that enables fixtures, and never produces
  a deployable artifact.
- `npm run check:no-fixtures` scans `dist/` for six fixture markers and fails CI if any
  reappear. Wired into the `quality` job right after the production build.
- `lighthouserc.cjs` pointed at `/__e2e__/storefront-orders`, which the CI perf gate
  never used — corrected to the static harness URLs that `scripts/perf-audit.mjs`
  actually audits.

Verified: production bundle contains zero fixture markers; all 26 Playwright specs pass
against the fixture build; `lint` and 141 unit tests green.

## [1.1.0-beta1A] – Phase 19 (iOS Alpha)

**Merged** — tag `v1.1.0-beta1A-phase19` · exit gate
[`PHASE19_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE19_EXIT_GATE.md)
· ADR [`ADR_IOS_ALPHA.md`](./docs/architecture/ADR_IOS_ALPHA.md) (ADR-033)

- Phase 19: iOS Alpha – signed IPA, TestFlight upload workflow, deep links, background uploads, Keychain-sealed prefs
- `ios/App` · `ios.yml` · `IOS_BUILDS.json` · fastlane beta
- `vybz://` + Universal Links · APNs push · background URLSession uploads
- ADR-033 iOS Alpha

### TestFlight / signing — **deferred** (OR-012)

Code + CI wiring shipped; live TestFlight paused until Apple Developer Program + secrets are budgeted.
Resume checklist: [`IOS_RELEASE.md`](./docs/operations/IOS_RELEASE.md) · Opportunity Register **OR-012**.
Leave AASA `TEAMID` placeholder until then.

## [1.1.0-beta1A] – Phase 18 (Cost-Minute Billing)

**Merged** — tag `v1.1.0-beta1A-phase18` · exit gate
[`PHASE18_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE18_EXIT_GATE.md)
· ADR [`ADR_AI_MINUTE_BILLING.md`](./docs/architecture/ADR_AI_MINUTE_BILLING.md) (ADR-032)

- Phase 18: AI processing seconds → billable minutes; Stripe top-up; hard-stop at balance ≤ 0
- Ledger `ai_credit_ledger` · Edge `ai-topup` · webhook `kind=ai_topup` (+6000 s pack)
- `/settings/credits` wallet + Master low-balance banner (&lt;120 s)
- ADR-032 AI minute billing

## [1.1.0-beta1A] – Phase 17 (Desktop macOS & Linux)

**Merged** — tag `v1.1.0-beta1A-phase17` · exit gate
[`PHASE17_DESKTOP_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE17_DESKTOP_EXIT_GATE.md)
· ADR [`ADR_DESKTOP_CROSS.md`](./docs/architecture/ADR_DESKTOP_CROSS.md) (ADR-031)

- Phase 17: macOS DMG & Linux AppImage released, auto-update feeds per OS
- Signed DMG + AppImage targets, CI matrix (`windows-msi` · `mac-dmg` · `linux-appimage`)
- Auto-update channels: `windows/` · `darwin/` · `linux/`
- Notarisation wiring via `MAC_CERT_BASE64` / `MAC_CERT_PWD` (+ optional Apple ID secrets)
- ADR-031 Desktop cross-platform

## [1.1.0-beta1A] – Phase 16 (Collaboration Sessions)

**Merged** — tag `v1.1.0-beta1A-phase16` · exit gate
[`PHASE16_COLLAB_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE16_COLLAB_EXIT_GATE.md)
· ADR [`ADR_COLLAB_SESSIONS.md`](./docs/architecture/ADR_COLLAB_SESSIONS.md) (ADR-030)

- Phase 16: real-time presence, live cursors, comment threads, conflict-safe merge
- Live presence + cursors on Prepare / Credits (Realtime + local session store)
- Anchored comment threads (waveform / metadata / credits)
- Conflict-safe metadata merge (`row_version` + `merge_release_metadata`)
- ADR-030 Collaboration Sessions

## [1.1.0-beta1A] – Phase 15 (Remote AI Processing)

**Merged** — tag `v1.1.0-beta1A-phase15` · exit gate
[`PHASE15_REMOTE_AI_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE15_REMOTE_AI_EXIT_GATE.md)
· ADR [`ADR_AI_MASTERING.md`](./docs/architecture/ADR_AI_MASTERING.md)

- Phase 15: AI mastering & metadata suggestions, remote job billing, free-tier kill-switch
- AI mastering DSP (loudness / peak / width) + optional ONNX weights path
- Metadata AI (genre, mood, BPM, ISRC suggestions) via Groq + fixtures
- `processing_jobs_ai` / `processing_results` · cost hooks · `/release/:id/master`
- ADR-029 AI Mastering

## [1.1.0-beta1A] – Phase 14 (Cost Sentinel)

**Merged** — tag `v1.1.0-beta1A-phase14` · exit gate
[`PHASE14_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE14_EXIT_GATE.md)
· ADR [`ADR_COST_SENTINEL_UI.md`](./docs/architecture/ADR_COST_SENTINEL_UI.md)

- Cost telemetry ledger, soft monthly caps, kill-switch flags, dashboard chart
- Daily `cost-alert` Edge Function (Resend at ≥ 90% cap)
- ADR-028 Cost Sentinel UI

## [1.1.0-beta1A] – Phase 13 (Android Beta)

**Merged** — tag `v1.1.0-beta1A-phase13` · exit gate
[`PHASE13_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE13_EXIT_GATE.md)
· ADR [`ADR_ANDROID_BETA.md`](./docs/architecture/ADR_ANDROID_BETA.md)

- Phase 13: Android Beta — signed AAB, Play Console metadata, upload queue retry, in-app update API, AES-GCM prefs
- Play-ready AAB CI (`bundleRelease`), data-safety form, flexible in-app updates
- Upload-queue UI (retry + progress), `vybz://release/:id`, FCM registration
- AES-GCM prefs via Android KeyStore · ADR-027

## [1.1.0-beta1A] – Phase 12 (Desktop Beta)

**Merged** — tag `v1.1.0-beta1A-phase12` · exit gate
[`PHASE12_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE12_EXIT_GATE.md)
· ADR [`ADR_DESKTOP_UPDATER.md`](./docs/architecture/ADR_DESKTOP_UPDATER.md)

- Desktop Beta signed channel, auto-update feed, multi-window, sealed prefs
- Windows updater feed `https://update.vybz.cloud/windows/stable.json`
- MSI (+ NSIS) CI with Authenticode secrets; WaveformPreview multi-window
- AES-GCM `%APPDATA%\\Vybz\\secrets.bin` + legacy hex migration
- ADR-026 Desktop updater

## [1.1.0-beta1A] – Phase 11 (perf + premium UI)

**Merged** — tag `v1.1.0-beta1A-phase11` · exit gate
[`PHASE11_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE11_EXIT_GATE.md)

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
[`PHASE10_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE10_EXIT_GATE.md).

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
- Exit gate: [`docs/archive/suite-phases-2026/PHASE9_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE9_EXIT_GATE.md)
- ADR: [`docs/architecture/ADR_VISUAL_POLISH.md`](./docs/architecture/ADR_VISUAL_POLISH.md)

### Phase 8 Distribution Readiness (complete — merged + tagged)

- Loudness / ISRC / DPI rules · ZIP + DDP-stub export · `/release/:id/distribution`
- Cost Sentinel free-tier alert (no auto-spend) · export SHA via Playwright
- PR #7 merged to `main`; tag `v1.1.0-beta1A-phase8`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE8_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE8_EXIT_GATE.md)

### Phase 7 Sync & Collaboration (complete — merged + tagged)

- Reconnect mutation flush · field merge · accept mine/theirs conflict UI
- AES-GCM sealed drafts · two-user RLS Playwright (no secrets) · offline/online e2e
- PR #6 merged to `main`; tag `v1.1.0-beta1A-phase7`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE7_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE7_EXIT_GATE.md)

### Phase 6 Android Alpha / 2.A (complete — merged + tagged)

- `cloud.vybz.app` signing workflow · APK smoke hash · upload queue · `vybz://` + FCM stub
- Mobile credits / Findings read-only · sealed prefs · Detox contract (Vitest)
- PR #5 merged to `main`; tag `v1.1.0-beta1A-phase6`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE6_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE6_EXIT_GATE.md)

### Phase 5 Desktop Alpha / 2.D (complete — merged + tagged)

- NSIS installMode both · updater channels JSON · installer smoke hash workflow
- `/desktop/process` batch panel · window prefs · secure session store · crash file log
- PR #4 merged to `main`; tag `v1.1.0-beta1A-phase5`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE5_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE5_EXIT_GATE.md)

### Phase 4 Processing Engine (complete — merged + tagged)

- Portable waveform/FFT/loudness (`@vybz/processing/waveform`, ≤10 MB Worker)
- Tauri `vybz_analyze_audio`; Bridge wiring; Cost Sentinel (log-only alerts)
- `processing_jobs` + Edge `processing-enqueue` skeleton (no paid AI)
- PR #3 merged to `main`; tag `v1.1.0-beta1A-phase4`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE4_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE4_EXIT_GATE.md)

### Phase 3 Credits & Metadata (complete — merged + tagged)

- `release_credits` schema + RLS (`0082`) with up/down SQL
- Domain/data packages; metadata seeding; mutation-queue conflicts
- `/release/:id/credits` in-place edit + Playwright hard-refresh
- PR #2 merged to `main`; tag `v1.1.0-beta1A-phase3`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE3_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE3_EXIT_GATE.md)

### Phase 2 Prepare MVP (complete — merged + tagged)

- Release Project schema + RLS (`0081`) with up/down SQL
- Domain/data/processing packages; Web Worker readiness probes ($0)
- `/releases`, `/releases/new`, `/release/:id` Findings UI + local hard-refresh
- PR #1 merged to `main`; tag `v1.1.0-beta1A-phase2`
- Exit gate: [`docs/archive/suite-phases-2026/PHASE2_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE2_EXIT_GATE.md)

### Phase 1.5 Platform readiness (complete on `suite-genesis`)

- PlatformBridge contract + web/mock/desktop/android stubs
- Capability registry, shell modes, deep-link/cache/mutation contracts
- Tauri Windows PoC scaffold (`apps/desktop/`); Capacitor bridge on existing `android/`
- Workspace Stage A aliases (`@vybz/*`); no source tree moves
- Exit gate: [`docs/archive/suite-phases-2026/PHASE15_EXIT_GATE.md`](./docs/archive/suite-phases-2026/PHASE15_EXIT_GATE.md)

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
