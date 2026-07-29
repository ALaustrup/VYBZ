# VYBZ Prepare

> Authoritative product brief. Accent: **ice cyan**. Phase 2 MVP target.

## Purpose

Distribution-readiness workspace. Tell the artist what is ready, what blocks
release, and what to fix — before money or DSP partners enter the loop.

## Customer

Artists packaging a release who need a checklist they can trust, not a mystery
rejection after upload to a distributor.

## Jobs

- Run free browser readiness scans (metadata, basic audio/art checks)
- Categorize findings: blocking / warning / info
- Deep-link into Credits, MasterReady, CoverLab, Sentinel, Relay to resolve
- Export or freeze a readiness report for a release version

## Data sketch

`release_projects` · `release_tracks` · `release_assets` · `release_requirements` ·
`release_findings` · `release_versions` · `release_approvals`.

## Cost behavior

Free browser scans by default. No paid provider on scan. Escalation to Engine /
managed services only with estimate → approval → reserve.

## Copy one-liner

**Know what is ready. Fix what is not.**

## Design accent

Ice cyan (`--accent-prepare`). Category panels, severity color on findings only —
not decorative glow. Flat, scannable report layout.

## DoD

- [x] Free readiness report for a release (browser rules)
- [x] Categories with clear severity and fix paths
- [x] Loading / empty / degraded-scan states
- [x] Human gate before any paid remediation path (no paid path in MVP)
