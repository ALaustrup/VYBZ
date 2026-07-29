# ADR Index

Architecture Decision Records for Suite Genesis.

| ID | Title | Status |
|----|-------|--------|
| ADR-001 | Single-root SPA; no Next.js rewrite / no early monorepo | Accepted |
| ADR-002 | One Supabase project; additive migrations only | Accepted |
| ADR-003 | Supabase Storage as sole media origin; Bunny dormant | Accepted |
| ADR-004 | LiveKit for live; hard-cap degrade, no auto-upgrade | Accepted |
| ADR-005 | Browser + Engine before paid cloud compute | Accepted |
| ADR-006 | Feature flags stay in-repo (`src/lib/flags.ts`) | Accepted |
| ADR-007 | Vercel remains production until Cloudflare canary verified | Accepted |
| ADR-008 | Beta-1A untagged until shell + cost kernel + Prepare scan | Accepted |
| ADR-009 | AI may not approve rights, splits, or distribution submit | Accepted |
| ADR-010 | Multi-client: one core · Tauri Desktop · Capacitor Android | Accepted — see linked ADRs |
| ADR-011 | Desktop shell = Tauri 2 (Windows first) | Accepted — [`ADR_DESKTOP_TAURI.md`](./ADR_DESKTOP_TAURI.md) |
| ADR-012 | Android shell = Capacitor (no RN without proof) | Accepted — [`ADR_ANDROID_CAPACITOR.md`](./ADR_ANDROID_CAPACITOR.md) |
| ADR-013 | Platform Bridge mandatory; no scattered platform checks | Accepted — [`PLATFORM_BRIDGE.md`](./PLATFORM_BRIDGE.md) |
| ADR-014 | Incremental workspace; no big-bang monorepo | Accepted — [`REPO_WORKSPACE_PLAN.md`](./REPO_WORKSPACE_PLAN.md) |
| ADR-015 | Release Project schema for Prepare MVP | Accepted — [`ADR_RELEASE_PROJECT_SCHEMA.md`](./ADR_RELEASE_PROJECT_SCHEMA.md) |
| ADR-016 | Release Credits schema for Credits MVP | Accepted — [`ADR_RELEASE_CREDITS.md`](./ADR_RELEASE_CREDITS.md) |
| ADR-017 | Processing Engine (portable · native · remote) | Accepted — [`ADR_PROCESSING_ENGINE.md`](./ADR_PROCESSING_ENGINE.md) |
| ADR-018 | Desktop Windows alpha (Phase 5 / 2.D) | Accepted — see [`PHASE5_EXIT_GATE.md`](./PHASE5_EXIT_GATE.md) + [`DESKTOP_RELEASE.md`](../operations/DESKTOP_RELEASE.md) |

**Note:** ADR-001’s “no early monorepo” remains: workspace extraction is **staged**
(Stage A–F). Do not interpret multi-platform as permission for a destructive rewrite.

Add new ADRs as linked docs above or `docs/architecture/adr/ADR-NNN-title.md`.
