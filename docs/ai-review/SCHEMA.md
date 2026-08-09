# AI review artifact schema

**Artifacts are observations, not implementation instructions.**

Website review is a **Perception Engine** module (`website-review`). Full engine contracts: [`docs/perception/SCHEMA.md`](../perception/SCHEMA.md).

A run file answers “what did we see?” It must **not** answer “go change X this way.”

## Required fields

| Field | Meaning |
|---|---|
| `id` | Stable slug, e.g. `2026-08-09-prod-live` |
| `date` | ISO date of the review |
| `app_sha` | Git SHA (or branch tip) of the build inspected |
| `surfaces_touched` | Surface ids from the website-review module |
| `observations` | Factual UI/flow notes with stable observation IDs |
| `status` | `draft` \| `accepted_for_planning` \| `parked` |
| `module` | `website-review` when emitted by the prod walker |

## Observation identity (required per finding)

| Field | Meaning |
|---|---|
| `id` | Human-readable `{surface}.{slug}` (e.g. `library.live-snapshot`) — not `finding-42` |
| `origin` | `{ detector, version, sourceType }` |
| `lifecycle` | `new` \| `seen` \| `regressed` \| `resolved` \| `stale` |
| `evidence` | Screenshot path / truncated body / URL refs |
| context | `projectId`, `artifactId`, `version`, `sessionId` on the run |

Optional Perception Graph edges may appear under **Perception Graph** in the run file / sidecar JSON.

Catalog history: [`observations/catalog.json`](./observations/catalog.json).

## Optional fields

| Field | Meaning |
|---|---|
| `candidates` | Short idea labels (“candidate: …”). **Not** tasks or authorised work |
| `risks` | Security / Law 3 / fixture-leak notes |

## Forbidden in artifacts

- Step-by-step implementation instructions  
- File patches or “edit `Foo.tsx` to…”  
- Tickets, PR checklists, or “do this next” imperatives  
- Secrets, passwords, invite codes, production PII dumps  
- Unverified numeric claims (Law 1 — say “Not measured” if unknown)

## Language guide

| Use (observation) | Avoid (instruction) |
|---|---|
| Analyzer dropzone shows “up to 20” | Change Analyzer copy to… |
| Dock toast appears when CDN URL fails | Fix the CDN toast by… |
| candidate: clearer Library empty state | Ticket: implement Library empty state |

## Status meanings

- `draft` — raw notes  
- `accepted_for_planning` — owner may allow Cursor to draft a **plan** from these observations (still not authorisation to code)  
- `parked` — keep for history; do not plan from this run  

Plans and code require **explicit owner approval** after Stage 3 planning. See [README.md](./README.md).
