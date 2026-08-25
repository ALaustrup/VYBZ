# VYBZ Home

> **NOT AUTHORITY.** Home is **My VYBZ**, not a Suite command center. See [`PRODUCT.md`](../../PRODUCT.md). This brief is Suite-era history.

## Purpose

Command center for projects, releases, and audience activity. Surfaces readiness,
next actions, and the path from unfinished work to public presentation.

## Customer

Independent artists and small teams who need one place to see what moves a release
forward — not a social feed as the home screen.

## Jobs

- Open a project or start a release
- See readiness blockers across Prepare / Credits / Master / Cover / Relay
- Jump to Studio, Live, Market, or Artist page
- Review recent activity without leaving the release context

## Data sketch

`music_projects` · `release_projects` · `release_findings` (rollup) · entitlements ·
notifications · lightweight audience stats (plays, tips, live) from existing domains.

## Cost behavior

Free. Home never triggers paid providers. Badges and rollups read cached findings;
no unbounded scans on load.

## Copy one-liner

**Your music, moving forward.**

## Design accent

Cyan (`--accent-home` / brand cyan). Readiness dashboard: status chips, clear next
CTA, denser chrome than audience surfaces. No hero marketing clutter in signed-in Home.

## DoD

- [ ] Suite shell Home route with release/project readiness summary
- [ ] Empty, loading, and error states
- [ ] Deep links into Prepare, Credits, Studio, Live, Market, `/u/:id`
- [ ] No social-hub-only framing; no paid jobs from Home itself
