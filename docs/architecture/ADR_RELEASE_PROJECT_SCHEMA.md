# ADR: Release Project schema (Prepare MVP)

| Field | Value |
|-------|--------|
| Status | **Accepted** |
| Date | 2026-07-28 |
| Phase | 2 — Prepare MVP |

## Context

Prepare needs a cross-client Release Project with Findings, without conflating
Studio `release_batches` or audience `profile_projects`.

## Decision

Additive tables on Supabase project `xixmneooyufbeftdfpcm`:

- `release_projects` — owner-scoped release, soft delete, idempotency key
- `release_assets` — audio/artwork metadata + client probe JSON
- `release_findings` — severity/category findings

Owner-only RLS: `owner_id = auth.uid()` for select/insert/update/delete.
Child inserts require parent ownership via `exists (...)`.

Client compute remains free (Web Workers). Cloud tables store results only.

## Consequences

- Domain package `@vybz/domain/releases` owns pure rules
- Data package `@vybz/data/releases` owns local + Supabase adapters
- Migration up: `20260728_0081_release_projects.sql`
- Migration down: `20260728_0081_release_projects.down.sql`

## Non-goals

Paid scan providers · collaborative multi-writer editing · desktop/Android adapters
