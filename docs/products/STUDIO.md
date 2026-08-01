# VYBZ Studio

> Product brief — reference only. Not authoritative; see `VYBZ_MASTERPLAN.md`. Accent: **orange**. Preserve Music Repos + Engine.

## Purpose

Versioned creative workspace for audio and project files. Music Repos (CAS) stay
the source of truth; VYBZ Engine (Bridge) handles local watch and heavy compute.

## Customer

Producers and artists who need branches, commits, and collaboration without
flattening DAW / folder process into a single upload blob.

## Jobs

- Create / open a Music Repo project
- Sync local folders via Engine; hash and commit trees
- Branch, review, merge (MR-style flows already seeded)
- Attach repo assets into a release without discarding history

## Data sketch

Existing: Music Repos CAS (`blobs` / `trees` / `commits` / `branches` / MRs /
listings) via migrations `0059`/`0060`. Planned: link `music_projects` ↔
`release_projects` / `release_assets`.

## Cost behavior

Platform compute $0 for local Engine work. Cloud cost = Storage egress / storage
only. No paid AI required for versioning.

## Copy one-liner

**Version your music without flattening the process.**

## Design accent

Orange (`--accent-studio`). Dense professional chrome; repo trees and diff-like
clarity over atmospheric audience UI.

## DoD

- [ ] `/studio` and `/studio/:id` (or redirects from `/projects`)
- [ ] Music Repos CAS paths preserved — no rewrite from scratch
- [ ] Engine connection status + capability report
- [ ] Empty / offline / sync-error states; no silent cloud rewrite of history
