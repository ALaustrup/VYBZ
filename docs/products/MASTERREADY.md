# VYBZ MasterReady

> Product brief — reference only. Not authoritative; see `VYBZ_MASTERPLAN.md`. Accent: **amber / green**. Three compute tiers.

## Purpose

Analyze audio, prepare masters, and produce deliverables without forcing cloud
compute as the default path.

## Customer

Artists and engineers who need loudness, peak, and deliverable clarity before
release — preferably local or browser-first.

## Jobs

- Analyze tracks (header, peak, silence, spectrum; then full loudness)
- Apply presets / prepare mastering jobs when entitled
- Export masters and album analysis runs into the release package
- Surface findings back into Prepare

## Data sketch

`audio_analysis_*` · `mastering_jobs` · `mastering_presets` · `mastering_outputs` ·
`album_analysis_runs` · links to `release_tracks` / `release_assets`.

## Cost behavior

Three tiers (prefer lowest that meets the job):

1. **Browser** — free basic analysis
2. **VYBZ Engine** — full loudness / FFmpeg / batch; $0 platform compute
3. **Managed / paid** — estimate → user approval → reserve → execute → reconcile

Never auto-upgrade to paid.

## Copy one-liner

**Masters that are ready — measured, not guessed.**

## Design accent

Amber for analysis in progress; green for pass / deliverable ready
(`--accent-master`). Waveform and meters over marketing visuals.

## DoD

- [ ] Browser analysis without cloud
- [ ] Engine path for full-track compute when available
- [ ] Paid path gated by cost reservation
- [ ] Loading / empty / Engine-offline / provider-degraded states
