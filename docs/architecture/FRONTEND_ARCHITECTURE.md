# Frontend Architecture

## Today

- Vite + React 18 + React Router; routes declared in `src/App.tsx`.
- Auth/shell gates before app chrome; VDock persistent for signed-in users.
- Feature modules: only `src/features/storefront/` so far.
- Styling: Tailwind + existing surface tokens (`surfaceTheme`); Framer Motion.

## Target (Phase 1)

```text
src/app/       routeManifest.ts, providers.tsx, entitlements.ts, commands.ts
src/shell/     SuiteShell, PrimaryRail, CommandBar, MobileNav, ContextInspector, SuiteSwitcher
src/features/  home, studio, prepare, credits, mastering, coverlab, sentinel,
               relay, artist, live, market, wallet
src/platform/  api, auth, jobs, costs, storage, audit, notifications, providers, telemetry, security
```

Legacy routes redirect until telemetry clears them. OverlayPortal rules for VDock
remain mandatory. Audience surfaces may stay atmospheric; professional workspaces
use denser, flatter chrome (see design docs).
