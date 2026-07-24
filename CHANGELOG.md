# Changelog

All notable platform releases are documented here. Product labels follow
[`VERSIONING.md`](./VERSIONING.md).

## Beta-0B.1 (in progress) — Music Repos R5

- DAWproject / stem-pack / bounce detection on folder walk; commit `meta` flags
- History **Handoff** panel — honest export hints (no bit-perfect `.als` merge claims)
- File tree highlights for `.dawproject`, `Stems/`, and bounce paths

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
