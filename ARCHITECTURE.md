# ARCHITECTURE.md

> Platform map for **VYBZ Suite** (Beta-1A / Suite Genesis). Product doctrine:
> [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md). Pre-suite snapshot:
> [`docs/archive/pre-suite-2026/ARCHITECTURE.md`](./docs/archive/pre-suite-2026/ARCHITECTURE.md).

## Summary

Single-root **Vite 6 + React 18 + TypeScript** SPA/PWA with **Supabase**
(Auth, Postgres + RLS, Storage, Realtime, Edge Functions), **Stripe**, **LiveKit**,
**Resend**. Modular product namespaces share one identity, one database, one billing spine.

**Media origin is Supabase Storage only.** Dormant `bunny-*` Edge functions must not be
re-enabled as doctrine. Live voice/SFU = LiveKit.

## Target frontend layout (Phase 1+)

```text
src/
  app/          routeManifest, providers, entitlements, commands
  shell/        SuiteShell, PrimaryRail, CommandBar, MobileNav, SuiteSwitcher
  features/     home, studio, prepare, credits, mastering, coverlab,
                sentinel, relay, artist, live, market, wallet
  platform/     api, auth, jobs, costs, storage, audit, notifications,
                providers, telemetry, security
```

Today: flat routes in [`src/App.tsx`](./src/App.tsx); only `src/features/storefront/` exists.
See [`docs/architecture/FRONTEND_ARCHITECTURE.md`](./docs/architecture/FRONTEND_ARCHITECTURE.md)
and [`docs/architecture/ROUTE_MANIFEST.md`](./docs/architecture/ROUTE_MANIFEST.md).

## Platform kernel

Session · organizations (planned) · project membership · permissions · release identity ·
assets · provider credentials · jobs · cost reservations · audit · notifications ·
entitlements · feature flags ([`src/lib/flags.ts`](./src/lib/flags.ts)) · quotas · storage access.

## Existing foundations to preserve

| Layer | Location |
|-------|----------|
| Music Repos (CAS blobs/trees/commits/branches/MRs) | migrations `0059`/`0060`, `src/lib/repoSync.ts`, `src/lib/api.ts`, `src/components/repos/` |
| Local watch companion | `tools/vybz-bridge/` → evolve to **VYBZ Engine** |
| Playback | AudioBus, VDock, OverlayPortal |
| Watermark / provenance | `watermark`, `watermark-detect`, ledger migrations |
| Market (packs) | `src/features/storefront/`, EFs `storefront-*` |
| AI stills | EF `visual-generate` (fal; prepaid / Vc debit) |
| Auth | Supabase Auth + passkeys |
| Payments | Stripe Checkout + Connect Express (`creator_payouts`) |
| Live | LiveKit token EF + client |

## Data and storage

Additive migrations only; no DB reset; one Supabase project `xixmneooyufbeftdfpcm`.

Buckets: `site-visuals`, `media-public`, `audio-assets`, `project-files`,
`storefront-previews`, `storefront-zips`, plus Music Repos blob storage per schema.

Planned Suite tables (Prepare onward): release projects, findings, credits passport,
audio/artwork analysis runs, secure rooms, distribution packages, automation_jobs,
cost_reservations — see [`docs/architecture/DATA_ARCHITECTURE.md`](./docs/architecture/DATA_ARCHITECTURE.md)
and [`docs/architecture/DATABASE_REGISTRY.md`](./docs/architecture/DATABASE_REGISTRY.md).

## Jobs and compute routing

```text
Browser / WASM → VYBZ Engine (Bridge) → OVH worker → Edge Function → free provider → paid provider
```

Job state machine and Cost Sentinel: [`docs/architecture/JOB_SYSTEM.md`](./docs/architecture/JOB_SYSTEM.md),
[`docs/operations/COST_CONTROL.md`](./docs/operations/COST_CONTROL.md).

## Providers

Registry: [`docs/architecture/PROVIDER_ARCHITECTURE.md`](./docs/architecture/PROVIDER_ARCHITECTURE.md).
Default optional AI (`fal`) = disabled / prepaid_only. Groq free_only ceiling. LiveKit Build hard allowance.

## Deployment

| Concern | Current | Planned |
|---------|---------|---------|
| SPA host | Vercel `astramatrix/vybz` ← `main` | Cloudflare Pages canary → `app.vybz.cloud` → apex |
| Backend | Supabase Edge + Postgres + Storage | Same project |
| Email | Resend | Same |
| Live | LiveKit | Same until quota forces controlled upgrade |

## Failure modes

- Missing Supabase env → app hard-stops (not a mock offline app).
- LiveKit quota exhausted → block new sessions gracefully; never auto-upgrade.
- Paid provider without reservation → refuse start.
- Degraded provider → show unavailable / local fallback, not silent cloud spend.

Deep dives: [`docs/architecture/PLATFORM_OVERVIEW.md`](./docs/architecture/PLATFORM_OVERVIEW.md).
