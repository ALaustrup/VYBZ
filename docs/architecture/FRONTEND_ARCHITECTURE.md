# Frontend Architecture

> **NOT PRODUCT IDENTITY.** Signed-in home is **My VYBZ**. SuiteShell is the existing chrome wrapper — not a Suite product grid. Read [`PRODUCT.md`](../../PRODUCT.md).

## Today (Living Profile)

- Vite + React 18 + React Router; routes in `src/App.tsx` plus `src/app/suitePlaceholderRoutes.tsx`.
- Auth/shell gates before chrome; **SuiteShell** wraps signed-in stage + VDock.
- Design tokens: `src/index.css` + `src/design/tokens.ts` + Tailwind bridges.
- UI primitives: `src/components/ui/*`; states: `src/components/states/*`.
- Feature modules: `src/features/storefront/` (WIP, keep isolated) + suite placeholders.
- Styling: Tailwind + Suite tokens + existing glass mats; Framer Motion.

## Layout

```text
src/app/       routeManifest.ts, entitlements.ts, suitePlaceholderRoutes.tsx
src/shell/     SuiteShell, PrimaryRail, MobileNav, SuiteSwitcher, CommandBar, ContextInspector
src/design/    tokens.ts
src/components/ui/      Button, Input, Panel, Badge, Tabs, Dialog, Tooltip, Progress, NavItem
src/components/states/  Skeleton, StateView, EmptyState
src/platform/  jobs, costs, audit, orgs, providerHealth
src/features/  storefront (WIP), … future product modules
```

Legacy routes redirect or coexist until telemetry clears them. OverlayPortal rules
for VDock remain mandatory. Audience surfaces may stay atmospheric; professional
workspaces use denser, flatter chrome (`data-surface-mode`).

## Route code

Canonical list: `src/app/routeManifest.ts` (mirrors
[`ROUTE_MANIFEST.md`](../architecture/ROUTE_MANIFEST.md)).
`/studio` → `/projects` preserves Music Repos until Studio UI migrates.
