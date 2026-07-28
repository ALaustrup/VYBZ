# Design Tokens

> CSS variable plan for Suite shell and products. Implement in Phase 1; do not
> invent a second theme system beside existing surface tokens.

## Surfaces

| Token | Intent | Notes |
|-------|--------|-------|
| `--color-abyss` | App deepest bg | Near `#0a0e18` / smoke base |
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

RGB companions (`--accent-rgb`) for `color-mix` / glow where already patterned.

## Spacing & chrome

| Token | Use |
|-------|-----|
| `--rail-width` | Desktop primary rail |
| `--dock-reserve` | Bottom clearance for VDock |
| `--radius-sm/md` | Dense Suite chrome (restrained) |
| `--motion-fast/base` | See [`MOTION.md`](./MOTION.md) |

## Rules

- Professional Suite routes: flatter graphite panels; accents for wayfinding only.
- Audience surfaces may keep atmospheric backgrounds; tokens still name the accents.
- No unbounded glow stacks; prefer one accent source per surface.
