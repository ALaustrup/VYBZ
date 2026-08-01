> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 16 Exit Gate — Collaboration Sessions

**Branch:** `phase16-collab`  
**Date:** 2026-07-30  
**Base:** `main` @ `v1.1.0-beta1A-phase15`  
**Authority:** Owner Phase 16 Collaboration Sessions

> **Name collision:** Some backlog notes call “Phase 16” paid AI minutes.
> This gate is **Collaboration Sessions** (presence / comments / merge), not billing.

## Checklist

| Gate | Status | Evidence |
|------|--------|----------|
| Schema `0088` collaborators + comments + merge RPC | **Pass** | migration + `.down.sql` |
| Realtime presence + cursors | **Pass** | `realtimeBridge.ts` + session store |
| Prepare & Credits UI | **Pass** | presence strip + comment panels |
| Conflict-safe merge | **Pass** | domain merge + `CollabMergePanel` |
| Unit ≥ 125 · e2e ≥ 21 | **Pass** | 127 unit · 21 e2e |
| Docs / ADR-030 | **Pass** | this file + `ADR_COLLAB_SESSIONS.md` |
| Unpushed until owner approval | **Pass** | |

## Validation

```text
npm run lint               ✓
npm run test               ✓ 127 tests (≥ 125)
npm run build              ✓
npm run test:e2e           ✓ 21 passed (≥ 21)
npm run perf:audit         ✓ ≥ 90
```

## Deliverables

| Stream | Location |
|--------|----------|
| Migration | `supabase/migrations/20260730_0088_collab_sessions.sql` |
| Domain | `packages/domain/collab/` |
| Platform | `src/platform/collab/` |
| UI | `src/features/collab/` · Prepare + Credits pages |
| E2E | `/__e2e__/collab` · `e2e/collab-sessions.spec.ts` |
| ADR | [`ADR_COLLAB_SESSIONS.md`](./ADR_COLLAB_SESSIONS.md) |

## Owner ops (parallel)

| Action | When | Notes |
|--------|------|-------|
| Apply migration `0088` | before prod smoke | project `xixmneooyufbeftdfpcm` |
| Enable Realtime on `release_comment_threads` | with migrate | publication in migration |
| No new Edge deploy | — | Realtime + RPC only |

## Next

Await owner approval → push → PR **Phase 16 – Collaboration Sessions** → merge →
tag `v1.1.0-beta1A-phase16`.
