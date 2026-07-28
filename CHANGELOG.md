# Changelog

All notable platform releases are documented here. Product labels follow
[`VERSIONING.md`](./VERSIONING.md).

## Unreleased — 2026-07-28 — Official Launch Reposition

Music Hub **tip + live + catalog** wedge for indie artists. Public marketing landing,
alpha waitlist (Resend notify-on-launch), legal + docs rewrite, music-first onboarding.
Dating / Spark demoted behind Connection Lab; Living Home product docs archived.
Signup remains open via **Enter VYBZ**. See masterplan GTM section.

Also in this line:
- SEO/logo pack on `main` (`8e5060c`): favicon.ico, sitemap `/enter` + `/legal/vc`, PWA manifest, `@vybz.cloud` contacts.
- Email defaults → `noreply@vybz.cloud`; Resend domain verified.
- **Site visuals on Supabase Storage** (bucket `site-visuals`, not Git LFS): CDN resolver
  `src/lib/siteVisuals.ts`, upload script `npm run visuals:upload`, loops on CDN; `AGENTS.md` pickup handoff.

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
- `bunny-upload` `kind=repo-blob`; secure paths include `repo-blobs/` for `bunny-sign`
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
