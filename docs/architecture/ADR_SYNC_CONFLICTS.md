# ADR-020 — Sync conflicts (accept mine / theirs)

**Status:** Accepted  
**Date:** 2026-07-28  
**Phase:** 7 — Sync & Collaboration

## Context

Offline edits enqueue `PendingMutation`s. On reconnect, independent field changes can auto-merge; same-field races need an explicit user choice. Repo collab already uses take-theirs / keep-ours language.

## Decision

1. **Field merge** (`src/platform/sync/fieldMerge.ts`) — diff, auto-merge independent fields, `accept mine` / `accept theirs`.
2. **Reconnect orchestrator** (`syncOnReconnect.ts`) — flush queue on `online`; surface `SyncConflict`s; resolve removes the pending mutation.
3. **UI** — `SyncConflictPanel` on credits (metadata reuse same control).
4. **Draft seals** — AES-GCM per-device key in secure preferences (not reversible hex).
5. **Two-user RLS e2e** — Playwright dual context + `vybz.e2e.ownerId` proves owner isolation without paid auth infra. Live JWT RLS remains OR-011 follow-up when test credentials exist.

## Consequences

- Sync is optimistic-local; remote apply still hybrid when Supabase is configured.
- Conflict UI is credits-first; Prepare metadata can mount the same panel.
- No CRDT / realtime co-editing while offline (see `OFFLINE_AND_SYNC.md` non-goals).

## Non-goals

Realtime multi-caret editing; server-authoritative OT; Play Integrity; paid CI secrets for dual JWT.
