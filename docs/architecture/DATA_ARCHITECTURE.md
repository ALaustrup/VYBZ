# Data Architecture

## Principles

- One Postgres database; additive migrations; RLS everywhere.
- Explicit ownership columns; soft-delete or immutable audit where money/security matter.
- Idempotency keys on external operations (Stripe, providers, distribution).

## Existing domains (keep)

Profiles, posts/drops, tips/Vc ledger, live streams, projects, Music Repos CAS
(blobs/trees/commits/branches/MRs/listings), cosmetics, waitlist, storefront packs/orders,
visual generate spend events, watermark/provenance ledger events.

## Suite domains (planned additive)

| Domain | Tables (planned) |
|--------|------------------|
| Orgs / projects | `organizations`, `organization_members`, `music_projects`, `project_members` |
| Releases | `release_projects`, `release_tracks`, `release_assets`, `release_versions`, `release_destinations`, `release_requirements`, `release_findings`, `release_approvals` |
| Credits | `contributor_passports`, `contributor_aliases`, `release_contributors`, `credit_roles`, `credit_approvals`, `split_proposals`, `split_approvals`, `credit_exports` |
| MasterReady | `audio_analysis_*`, `mastering_jobs`, `mastering_presets`, `mastering_outputs`, `album_analysis_runs` |
| CoverLab | `artwork_*`, `visual_generation_jobs` |
| Sentinel | `secure_rooms`, `secure_*`, `watermark_manifests`, `provenance_manifests` |
| Relay | `distribution_*` |
| Ops | `automation_jobs`, `cost_reservations`, `usage_events`, `budget_*`, `audit_events`, `provider_*` |

Details: [`DATABASE_REGISTRY.md`](./DATABASE_REGISTRY.md).
