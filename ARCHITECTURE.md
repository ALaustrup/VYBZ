# ARCHITECTURE.md

> Platform map for **VYBZ Suite** (Beta-1A / Suite Genesis) including
> **multi-client** topology. Product doctrine: [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md).
> Pre-suite snapshot: [`docs/archive/pre-suite-2026/ARCHITECTURE.md`](./docs/archive/pre-suite-2026/ARCHITECTURE.md).

## Summary

**One product core · one Platform Services backend · three application shells.**

| Layer | Technology |
|-------|------------|
| **VYBZ Cloud** | Vite 6 + React 18 + TypeScript SPA/PWA (canonical web; complete app) |
| **VYBZ Desktop** | Tauri 2 packaging shared UI (Windows first) — Phase 1.5 PoC |
| **VYBZ Mobile** | Capacitor 8 + Android project (`cloud.vybz.app`) — expand in 1.5 / 2.A |
| **VYBZ Platform Services** | Supabase Auth, Postgres+RLS, Storage, Realtime, Edge Functions; Stripe; LiveKit; Resend |

**Media origin is Supabase Storage only.** Dormant `bunny-*` Edge functions must not be
re-enabled as doctrine. Live voice/SFU = LiveKit.

```text
                         VYBZ PLATFORM SERVICES
                              │
            ┌─────────────────┼─────────────────┐
       VYBZ Cloud        VYBZ Desktop      VYBZ Mobile
       Vite + React         Tauri 2          Capacitor
```

## Verified layout today

Single-root SPA under `src/` — **no** `apps/` or `packages/` workspace yet.
Capacitor wraps `dist/`; `android/` present. Tauri **not** present.

Staged workspace target: [`docs/architecture/REPO_WORKSPACE_PLAN.md`](./docs/architecture/REPO_WORKSPACE_PLAN.md).

## Frontend layout (Phase 1+)

```text
src/
  app/          routeManifest, providers, entitlements, commands
  shell/        SuiteShell (+ future desktop/android composition modes)
  features/     home, studio, prepare, credits, mastering, coverlab,
                sentinel, relay, artist, live, market, wallet
  domain/       use cases (Phase 1.5+) — no platform imports
  platform/     bridge, api, auth, jobs, costs, storage, audit,
                notifications, providers, telemetry, security
  design/       tokens
  components/   ui, states, …
```

Today: SuiteShell wired; flat routes in [`src/App.tsx`](./src/App.tsx);
`src/features/storefront/` exists. Platform Bridge lands in Phase 1.5 —
[`docs/architecture/PLATFORM_BRIDGE.md`](./docs/architecture/PLATFORM_BRIDGE.md).

## Platform kernel

Session · organizations (planned) · project membership · permissions · release identity ·
assets · Findings · Processing Jobs · provider credentials · cost reservations · audit ·
notifications · entitlements · feature flags ([`src/lib/flags.ts`](./src/lib/flags.ts)) ·
quotas · storage access · **Platform Bridge** · offline mutation queue (contracts in 1.5).

## Existing foundations to preserve

| Layer | Location |
|-------|----------|
| Music Repos (CAS) | migrations `0059`/`0060`, `src/lib/repoSync.ts`, `src/lib/api.ts`, `src/components/repos/` |
| Local watch companion | `tools/vybz-bridge/` → **VYBZ Engine** (≠ Platform Bridge) |
| Playback | AudioBus, VDock, OverlayPortal |
| Watermark / provenance | `watermark`, `watermark-detect`, ledger migrations |
| Market (packs) | `src/features/storefront/`, EFs `storefront-*` |
| AI stills | EF `visual-generate` (fal; prepaid / Vc debit) |
| Auth | Supabase Auth + passkeys |
| Payments | Stripe Checkout + Connect Express |
| Live | LiveKit token EF + client |
| Android shell seed | `capacitor.config.ts`, `android/` |

## Data and storage

Additive migrations only; no DB reset; one Supabase project `xixmneooyufbeftdfpcm`.
**No separate databases or storage origins for Desktop/Android.**

Buckets: `site-visuals`, `media-public`, `audio-assets`, `project-files`,
`storefront-previews`, `storefront-zips`, plus Music Repos blob storage.

Planned Suite tables (Prepare onward): release projects, findings, credits passport,
audio/artwork analysis runs, secure rooms, distribution packages, automation_jobs,
cost_reservations — see DATA / DATABASE registry docs.

Upload lifecycle: Master Blueprint §13 · [`STORAGE_ARCHITECTURE.md`](./docs/architecture/STORAGE_ARCHITECTURE.md).

## Jobs and compute routing (three levels)

```text
Portable (Workers / WASM / Audio APIs)
  → Native desktop (Tauri / allowlisted tools)
  → VYBZ Engine (Bridge companion)
  → Remote free workers / Edge
  → Reserved paid providers
```

Job state machine: [`docs/architecture/JOB_SYSTEM.md`](./docs/architecture/JOB_SYSTEM.md).
Cost: [`docs/operations/COST_CONTROL.md`](./docs/operations/COST_CONTROL.md).

## Providers

Registry: [`docs/architecture/PROVIDER_ARCHITECTURE.md`](./docs/architecture/PROVIDER_ARCHITECTURE.md).
Default optional AI (`fal`) = disabled / prepaid_only. Groq free_only ceiling. LiveKit Build hard allowance.

## Deployment / distribution

| Concern | Current | Planned |
|---------|---------|---------|
| Cloud SPA | Vercel `astramatrix/vybz` ← `main` | Cloudflare Pages canary later |
| Desktop | — | Tauri Windows installers + signed updates (Phase 2.D / R) |
| Android | Local `android/` | Signed APK/AAB · internal track → store (2.A / R) |
| Backend | Same Supabase project | Same |
| Email / Live | Resend / LiveKit | Same until quota forces controlled upgrade |

## Security note

Native packaging does **not** make the client trusted. See [`SECURITY.md`](./SECURITY.md)
and Master Blueprint §16.

## Failure modes

- Missing Supabase env → Cloud hard-stops (not a mock offline app).
- LiveKit quota exhausted → block new sessions gracefully; never auto-upgrade.
- Paid provider without reservation → refuse start.
- Degraded provider → unavailable / local fallback, not silent cloud spend.
- Unsupported Platform Bridge capability → degrade with explicit UI, not crash.
- Offline → drafts + queues only; clear unsynced indicators.

Deep dives: [`docs/architecture/PLATFORM_OVERVIEW.md`](./docs/architecture/PLATFORM_OVERVIEW.md),
ADRs [`ADR_DESKTOP_TAURI.md`](./docs/architecture/ADR_DESKTOP_TAURI.md),
[`ADR_ANDROID_CAPACITOR.md`](./docs/architecture/ADR_ANDROID_CAPACITOR.md).
