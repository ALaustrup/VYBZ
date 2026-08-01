> **HISTORICAL ONLY — NOT AUTHORITATIVE — DO NOT USE FOR CURRENT IMPLEMENTATION OR SEQUENCING.**
>
> Superseded on 2026-08-01 by the five authorities: `VYBZ_MASTERPLAN.md`, `AGENTS.md`,
> `ARCHITECTURE.md`, `STATUS.md`, `IDEAS_BACKLOG.md`. Retained as a historical record only.

# Phase 1 — Token & Primitive Inventory

Living inventory for Suite Genesis foundation (branch `suite-genesis`).

## Design tokens

| Area | Location |
|------|----------|
| CSS variables | `src/index.css` `:root` |
| TS mirror | `src/design/tokens.ts` |
| Tailwind bridges | `tailwind.config.js` |
| Runtime accent | `src/lib/surfaceTheme.ts` → `--accent-rgb` |

Families: color (abyss→snow, feedback), product accents, spacing, sizing, radii,
borders, shadows/elevation, z-index, motion, typography aliases, shell chrome.

## UI primitives (`src/components/ui/`)

| Primitive | File | Notes |
|-----------|------|-------|
| Button | `Button.tsx` | primary/secondary/ghost/danger · sm/md/lg · loading |
| Input / TextArea | `Input.tsx` | label, hint, error |
| Panel / Card | `Panel.tsx` | professional flat / interactive |
| Badge | `Badge.tsx` | neutral/success/warning/danger/info/accent |
| Tabs | `Tabs.tsx` | keyboard arrows |
| Dialog | `Dialog.tsx` | OverlayPortal, Escape, backdrop |
| Tooltip | `Tooltip.tsx` | hover/focus |
| Progress / StatusDot | `Progress.tsx` | bar + status |
| NavItem | `NavItem.tsx` | rail/nav |

## State views (`src/components/states/`)

Skeleton · StateView (`empty` \| `error` \| `offline` \| `restricted` \| `unavailable` \| `loading`) · EmptyState wrapper.

Legacy `src/components/EmptyState.tsx` retained for existing call sites.

## Shell

SuiteShell · PrimaryRail · MobileNav · SuiteSwitcher · CommandBar · ContextInspector.
Retained: ContextualAppBar, NowPlayingStage, VDock, AppChrome (deprecated path unused by Suite).

## Platform stubs

`src/platform/{jobs,costs,audit,orgs}` · `providerHealth.ts` (Bunny `disabled`).
