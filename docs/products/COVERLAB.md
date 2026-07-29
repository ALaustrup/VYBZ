# VYBZ CoverLab

> Authoritative product brief. Accent: **magenta / violet**. fal prepaid only.

## Purpose

Artwork analysis, repair, and visual delivery for releases. Deterministic checks
first; generative stills only when prepaid and reserved.

## Customer

Artists packaging cover art who need dimension/format compliance and optional
AI stills without surprise bills.

## Jobs

- Scan artwork (dimensions, format, color space, safe margins)
- Repair / export compliant assets (prefer browser + Engine)
- Optional generative stills via `visual-generate` (fal)
- Attach approved art to release and Artist presentation

## Data sketch

`artwork_*` · `visual_generation_jobs` · spend events (existing visual generate
ledger) · `release_assets`. Studio adjacency: `/visuals/studio` handoff patterns.

## Cost behavior

Scans and deterministic SVG/art helpers: free. **fal = `prepaid_only` / disabled
by default** — estimate → approval → reserve → execute. Groq pack copy stays
storefront/`free_only`, not CoverLab core. Prefer non-fal pack art when possible.

## Copy one-liner

**Cover art that clears the gate.**

## Design accent

Magenta / violet (`--accent-coverlab`). Preview stage with measured overlays;
no unmetered decorative generation.

## DoD

- [ ] Free artwork scan/repair path without fal
- [ ] fal stills only behind prepaid reservation
- [ ] Degraded provider state with clear copy
- [ ] Attach-to-release flow; no silent publish of generated art
