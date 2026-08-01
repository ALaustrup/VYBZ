# ARCHITECTURE.md

> Platform map for **VYBZ Suite** (Beta-1A / Suite Genesis) including
> **multi-client** topology. Product doctrine: [`VYBZ_MASTERPLAN.md`](./VYBZ_MASTERPLAN.md).
> Pre-suite snapshot: [`docs/archive/pre-suite-2026/ARCHITECTURE.md`](./docs/archive/pre-suite-2026/ARCHITECTURE.md).
> **Layout facts verified 2026-08-01** against the repository and live production.

## Summary

**One product core · one Platform Services backend · four application shells.**

| Layer | Technology | Delivery state |
|-------|------------|----------------|
| **VYBZ Cloud** | Vite 6 + React 18 + TypeScript SPA/PWA (canonical web; complete app) | Live at https://vybz.cloud |
| **VYBZ Desktop** | Tauri 2 in `apps/desktop/src-tauri` — Windows/macOS/Linux targets built in CI | `NATIVE-PLATFORM ONLY` — no installer distributed |
| **VYBZ Android** | Capacitor 8 + root `android/` (`cloud.vybz.app`) | `NATIVE-PLATFORM ONLY` — no Play listing |
| **VYBZ iOS** | Capacitor shell in `ios/App` + SPM plugins | `NATIVE-PLATFORM ONLY` — no TestFlight build (OR-012) |
| **VYBZ Platform Services** | Supabase Auth, Postgres+RLS, Storage, Realtime, Edge Functions; Stripe; LiveKit; Resend | Live |

**Media origin is Supabase Storage only.** Dormant `bunny-*` Edge functions must not be
re-enabled as doctrine. Live voice/SFU = LiveKit.

```text
                         VYBZ PLATFORM SERVICES
                              │
        ┌───────────────┬─────┴─────┬───────────────┐
   VYBZ Cloud     VYBZ Desktop   VYBZ Android    VYBZ iOS
   Vite + React      Tauri 2      Capacitor      Capacitor
```

## Verified layout today (2026-08-01)

Web root is still single-root `src/`. Three packages are extracted —
`packages/domain`, `packages/data`, `packages/processing` — wired through
**tsconfig / Vite path aliases**, because `package.json` has **no `workspaces` key**.
Workspace Stage A and Stage D landed; **Stage B (npm workspaces) did not**, and Stages
C / E / F are unscheduled.

`apps/desktop/src-tauri` exists (Tauri 2). Capacitor wraps `dist/`; `android/` and
`ios/` are both present at the repository root.

Staged workspace target and rollback plan:
[`docs/architecture/REPO_WORKSPACE_PLAN.md`](./docs/architecture/REPO_WORKSPACE_PLAN.md)
· Masterplan §6.

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

Today: SuiteShell wired; flat routes in [`src/App.tsx`](./src/App.tsx) plus Suite routes
and placeholders in [`src/app/suitePlaceholderRoutes.tsx`](./src/app/suitePlaceholderRoutes.tsx).
Platform Bridge is implemented for web, desktop, android and ios under
`src/platform/bridge/` — [`docs/architecture/PLATFORM_BRIDGE.md`](./docs/architecture/PLATFORM_BRIDGE.md).

### Routing and the auth gate (read before changing routes)

`src/App.tsx` resolves, in order, **before** the authenticated shell is constructed:

```text
/__e2e__/*                    → e2e builds only (VITE_E2E_FIXTURES), absent in prod
!userId:
  /start · /releases · /release/*        → PrepareLocalApp   (public)
  /desktop/process · /desktop/waveform   → DesktopLocalApp   (public)
  /mobile/uploads · /android/beta        → AndroidLocalApp   (public)
  /pack/:slug (FLAGS.storefront)         → PublicPackShell   (public)
  /codex · /codex/:slug · /legal/:slug   → PublicDocShell    (public)
  /enter · /enter/*                      → Onboarding
  everything else                        → LandingPage       ← HTTP 200, URL unchanged
```

That last line means a protected route is **indistinguishable from a marketing page**.
Seven of fourteen `nav: true` routes additionally render a Suite placeholder. Both are
scheduled corrections — Masterplan §23 Track D.

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
| Cloud SPA | Vercel `astramatrix/vybz` ← `main`, native Git integration (**no workflow deploys**); Cloudflare proxies `vybz.cloud` → Vercel `iad1` | Unchanged |
| Desktop | CI builds `windows-msi` · `mac-dmg` · `linux-appimage` | Signed installers + update channels (Track N) |
| Android | Local `android/`, signed APK/AAB validated in CI | Internal track → Play listing (Track N) |
| iOS | `ios/App` builds an unsigned CI stub | TestFlight after Apple Developer + secrets (OR-012) |
| Backend | Same Supabase project | Same |
| Email / Live | Resend / LiveKit | Same until quota forces controlled upgrade |

Production deployment identity is verified in
[`PRODUCTION_REALITY_AUDIT_2026-07-31.md`](./docs/architecture/PRODUCTION_REALITY_AUDIT_2026-07-31.md).
Do not re-investigate the deployment without new evidence.

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

### Known architectural defects (open)

| Defect | Impact | Correction |
|--------|--------|------------|
| ~~`/__e2e__/*` fixtures resolve in production and bypass auth~~ | Public auth-bypass surface with seeded data | **Fixed 2026-08-01 (D1)** — `src/app/e2eFixtures.tsx` behind `VITE_E2E_FIXTURES`; CI guard `npm run check:no-fixtures` |
| Protected routes fall back to `LandingPage` at HTTP 200 with an unchanged URL | A signed-out user cannot tell "sign in required" from "does not exist" | Track D3 — real sign-in prompt preserving the destination |
| 7 of 14 primary nav entries are Suite placeholders | Navigation advertises capabilities that are not there | Track D4 |
| Placeholder `phaseNote` strings cite execution-phase numbers that mean other work | Production text is factually wrong | Track D5 — product tracks use names, not numbers |

Deep dives: [`docs/architecture/PLATFORM_OVERVIEW.md`](./docs/architecture/PLATFORM_OVERVIEW.md),
ADRs [`ADR_DESKTOP_TAURI.md`](./docs/architecture/ADR_DESKTOP_TAURI.md),
[`ADR_ANDROID_CAPACITOR.md`](./docs/architecture/ADR_ANDROID_CAPACITOR.md).
