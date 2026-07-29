# ADR: VYBZ for Android = Capacitor (shared React)

| Field | Value |
|-------|--------|
| Status | **Accepted** (Suite Genesis multi-platform expansion) |
| Date | 2026-07-28 |
| Products | VYBZ Mobile · VYBZ for Android |

## Context

Verified repo already includes Capacitor 8 dependencies, `capacitor.config.ts`
(`appId: cloud.vybz.app`, `webDir: dist`), and an `android/` Gradle project.

## Decision

Ship **VYBZ for Android** as a Capacitor shell around the shared React application.
Treat it as a first-class client with Platform Bridge adapters — not a packaged
responsive website alone.

**Do not** rewrite to React Native unless a documented spike proves a required
capability impossible or unacceptably degraded under Capacitor.

## Consequences

- Reuse existing `android/` until optional `apps/android` relocation.
- Phase 1.5: bridge stubs + PoC smoke.
- Phase 2.A: Android alpha (APK + AAB validation).
- iOS remains future-extensible via Capacitor but is **out of immediate scope**.

## Alternatives considered

| Option | Why not (now) |
|--------|----------------|
| React Native rewrite | Splits product core; unproven necessity |
| TWA / browser-only | Weakens native import/share/push/session story |
| Separate Android codebase | Duplicates business logic |

## Non-goals

Play Store production listing before Phase R; heavy on-device DSP; iOS alpha.
