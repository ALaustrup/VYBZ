# Design Tokens

> CSS variable plan for Suite shell and products. **Implemented in Phase 1**
> (`src/index.css`, `src/design/tokens.ts`, `tailwind.config.js`). Do not invent
> a second theme system beside these tokens + existing glass mats.

## Surfaces

| Token | Intent | Notes |
|-------|--------|-------|
| `--color-abyss` | App deepest bg | `#0a0e18` |
| `--color-graphite` | Panels, rails | Raised charcoal |
| `--color-slate` | Borders, hairlines | Low-contrast edges |
| `--color-fog` | Secondary text | Muted readable gray |
| `--color-snow` | Primary text | Near-white |

## Brand & feedback

| Token | Intent |
|-------|--------|
| `--color-cyan` | Brand / Home / Artist / VDock default |
| `--color-success` | Pass / green MasterReady |
| `--color-warning` | Amber analysis / caution |
| `--color-danger` | Sentinel / errors |
| `--color-info` | Ice Prepare / Relay blue |

## Product accents

`--accent-home` · `--accent-studio` · `--accent-prepare` · `--accent-credits` ·
`--accent-master` · `--accent-coverlab` · `--accent-sentinel` · `--accent-relay` ·
`--accent-live` · `--accent-market` · `--accent-artist` · `--vdock-accent`

RGB companions live in `PRODUCT_ACCENT_RGB` (`src/design/tokens.ts`). Runtime
`--accent-rgb` is set from `surfaceForPath()` in `src/lib/surfaceTheme.ts`.

## Spacing, sizing, radii, elevation, z-index, motion

| Family | Tokens |
|--------|--------|
| Spacing | `--space-1` … `--space-12` |
| Controls | `--size-control-sm/md/lg`, `--size-icon-*` |
| Radii | `--radius-sm/md/lg/xl/full` |
| Shadows | `--shadow-sm/md/lg`, `--shadow-focus` |
| Z-index | `--z-base` … `--z-max` (dock 70, modal 90, toast 100) |
| Motion | `--motion-fast/base/slow`, `--ease-standard`, `--ease-emphasized` |
| Chrome | `--rail-width`, `--dock-reserve`, `--app-bar-h`, `--vdock-h` |

Tailwind bridges: `bg-abyss`, `text-fog`, `rounded-suite-md`, `shadow-suite-focus`,
`duration-suite-base`, `z-dock`, etc.

## Surface modes

- `.suite-surface-professional` — flat graphite panels
- `.suite-surface-audience` — frosted mat glass
- `data-surface-mode` on `.suite-shell` / `documentElement`

## Rules

- Professional Suite routes: flatter graphite panels; accents for wayfinding only.
- Audience surfaces may keep atmospheric backgrounds; tokens still name the accents.
- No unbounded glow stacks; prefer one accent source per surface.
- `prefers-reduced-motion` collapses motion durations to ~0.
