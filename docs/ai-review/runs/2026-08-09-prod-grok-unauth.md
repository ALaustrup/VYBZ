---
id: 2026-08-09-prod-grok-unauth
date: 2026-08-09
app_sha: Not measured
status: draft
module: website-review
project_id: vybz-app
artifact_id: 2026-08-09-prod-grok-unauth
session_id: grok-unauth-2026-08-09
surfaces_touched: ["admin","analyzer","codex","correct","discover","home","library","profile","settings","stems"]
---

# Review run: 2026-08-09-prod-grok-unauth

> Observations only. Not implementation instructions. Not authorised work.
> Emitted by Perception Engine module `website-review`. Screenshots: assets/2026-08-09-prod-grok-unauth/ (gitignored)
>
> First official Grok agent pass — signed-out live surfaces

## Context

- projectId: `vybz-app`
- artifactId: `2026-08-09-prod-grok-unauth`
- version: `Not measured`
- sessionId: `grok-unauth-2026-08-09`

## Observations

### `admin.expect-bounce`

- surface: admin
- category: gate
- severity: info
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Admin soft-falls to marketing home with no admin chrome (expectAdminBounce).
- evidence:
  - url: https://vybz.cloud/admin
  - bodySample: "Soft-falls to marketing home (no hard 403 page, no admin chrome). Matches the surface map note expectAdminBounce: true."

### `analyzer.signed-out-dropzone`

- surface: analyzer
- category: chrome
- severity: info
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Signed-out Analyzer shows dropzone (up to 20) and free-scan badge with sign-in CTA.
- evidence:
  - url: https://vybz.cloud/releases
  - bodySample: "“ANALYZER / Check your mix” + “Drop tracks to scan or click to choose · up to 20 · 1 at a time on this machine”. Header badge “Free scan · signed out”. Clear secondary CTA “Sign in for the full suite”."

### `codex.public-document-library`

- surface: codex
- category: chrome
- severity: info
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Codex is publicly reachable with searchable free music-industry documents.
- evidence:
  - url: https://vybz.cloud/codex
  - bodySample: "Searchable list of free music-industry docs (Songwriter Split Sheet, Producer Agreement, Non-Exclusive Beat License, Exclusive Beat License, Featured Artist Agreement, Collaboration Agreement, Work-for-Hire…). Header “Free music-industry documents from Astra Matrix, Inc.” + “Enter VYBZ” button."

### `correct.unauthenticated-fallback`

- surface: correct
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Correct tools path soft-falls to marketing landing while signed out.
- evidence:
  - url: https://vybz.cloud/tools/correct
  - bodySample: "Same marketing landing as home. No Correct-specific UI (DC/peak/balance/silence controls) rendered for anonymous visitors."

### `discover.unauthenticated-fallback`

- surface: discover
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Discover soft-falls to home marketing shell; no public feed while signed out.
- evidence:
  - url: https://vybz.cloud/discover
  - bodySample: "Falls through to home marketing shell. No public Discover feed visible."

### `home.landing-primary-cta`

- surface: home
- category: copy
- severity: info
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Landing shows truth-before-release headline with free scan and sign-in CTAs.
- evidence:
  - url: https://vybz.cloud/
  - bodySample: "Headline “Your music deserves the truth before it goes out.” + dual CTAs “Scan my track — free” / “Sign in”. Top nav shows Codex + Sign in. Dark theme with glowing waveform mark."

### `library.unauthenticated-fallback`

- surface: library
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Library soft-falls to marketing landing while signed out; no library chrome.
- evidence:
  - url: https://vybz.cloud/library
  - bodySample: "Resolves to the same marketing landing shell as / (headline + Scan/Sign-in CTAs). No distinct library chrome visible while signed out."

### `profile.unauthenticated-fallback`

- surface: profile
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Profile edit soft-falls to marketing landing while signed out.
- evidence:
  - url: https://vybz.cloud/profile/edit
  - bodySample: "Marketing landing. Profile edit surface gated."

### `settings.unauthenticated-fallback`

- surface: settings
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Credits/settings soft-falls to marketing landing while signed out.
- evidence:
  - url: https://vybz.cloud/settings/credits
  - bodySample: "Marketing landing. Credits/settings surface not reachable anonymously."

### `stems.unauthenticated-fallback`

- surface: stems
- category: gate
- severity: notice
- confidence: high
- lifecycle: new
- origin: grok.ui-review@1.0.0 (web)
- summary: Stem Maker path soft-falls to marketing landing while signed out.
- evidence:
  - url: https://vybz.cloud/tools/stems
  - bodySample: "Same marketing landing. Stem Maker surface not exposed while signed out."

## Perception Graph

_No edges in this run._

## Candidates (optional ideas — not tasks)

- candidate: clarify which suite surfaces should remain soft-gated vs show a signed-out empty state

## Risks

- Unauthenticated pass only — suite chrome not measured while signed in.
- app_sha Not measured for this Grok session.
