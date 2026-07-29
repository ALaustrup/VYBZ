# ADR: Release Credits schema (Credits MVP)

| Field | Value |
|-------|--------|
| Status | **Accepted** |
| Date | 2026-07-28 |
| Phase | 3 — Credits & Metadata |

## Context

Prepare releases need durable credit rows (artist, producer, composer, splits)
shared across Cloud / Desktop / Android later, without inventing multi-account
approval in v1.

## Decision

Additive table on Supabase project `xixmneooyufbeftdfpcm`:

- `release_credits` — bound to `release_projects`, owner-scoped
- Roles constrained by check; optional `split_bps` (0–10000)
- Status: `draft` | `confirmed` | `disputed`
- Source: `manual` | `audio_metadata` | `import`

Owner-only RLS: `owner_id = auth.uid()`. Inserts require parent release ownership.

Domain package `@vybz/domain/credits` owns validation + metadata seeding rules.
Data package `@vybz/data/credits` owns local KV + Supabase adapters.
Optimistic writes use Platform Bridge mutation queue (`credit.*` ops).

## Consequences

- Migration up: `20260728_0082_release_credits.sql`
- Migration down: `20260728_0082_release_credits.down.sql`
- UI: `/release/:id/credits` (Cloud); desktop/Android remain placeholders
- Audio metadata / release artist fields seed missing primary_artist / composer

## Non-goals

Multi-account split approval · paid rights APIs · desktop/Android editors
