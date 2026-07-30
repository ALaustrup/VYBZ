# ADR-030 — Collaboration Sessions (Phase 16)

**Status:** Accepted  
**Date:** 2026-07-30  
**Branch:** `phase16-collab`

## Context

Phase 7 shipped offline sync + field-level conflict UI. Phase 16 adds **live**
multi-user sessions on Prepare / Credits: presence, cursors, anchored comments,
and optimistic server merge via `row_version`.

## Decision

1. **In-memory session store** for presence/cursors/comments (tests + offline),
   with optional Supabase Realtime channel `release-collab:{releaseId}`
   (presence + broadcast cursors).
2. **Postgres** `release_collaborators`, `release_comment_threads`,
   `row_version` on release projects/credits, RPC `merge_release_metadata`.
3. **UI** presence strip + comment panels on Prepare/Credits; merge panel
   reuses Phase 7 `applyConflictChoice` for mine/theirs resolution.
4. **No new Edge functions** for MVP — Realtime + RPC only.

## Non-goals

- Paid AI minutes (billing) — separate roadmap item
- Full CRDT / Yjs document editing
- Live cursors on every Suite surface

## Consequences

- Collaborators need `is_release_collaborator` for comments/merge RLS
- E2E uses `/__e2e__/collab` seeded fixture (no auth)
- Migration `0088` required before prod smoke of server merge
