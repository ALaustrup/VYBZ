# Design tokens

**Status:** active contract. Enforced by `src/design/tokens.test.ts`, which fails the
build rather than relying on convention.

---

## The rule

**CSS is the source of truth. Every token is declared exactly once.**

TypeScript holds a typed mirror for values that must cross into code — animation
timings, layering arithmetic, product accents. The mirror never redefines a value; it
points at the variable.

---

## Where each family lives

| Family | Declared in | Examples |
|---|---|---|
| Accent ramp (8 steps) | `src/design/tokens.css` | `--accent-1` … `--accent-8` |
| Elevation | `src/design/tokens.css` | `--shadow-xs` … `--shadow-xl`, `--shadow-focus`, `--shadow-glow` |
| Glass surfaces | `src/design/tokens.css` | `--glass-vibrant-fill`, `--glass-vibrant-blur` |
| Motion and easing | `src/design/tokens.css` | `--motion-fast/base/normal/slow`, `--ease-standard`, `--ease-emphasized` |
| Density | `src/design/tokens.css` | `--density-rail-pad`, `--suite-grid-gap` |
| Semantic colour | `src/index.css` | `--color-abyss`, `--color-fog`, `--color-snow` |
| Status colour | `src/index.css` | `--color-success/warning/danger/info` |
| Product accents | `src/index.css` | `--accent-home`, `--accent-prepare`, … |
| Spacing | `src/index.css` | `--space-1` … `--space-12` |
| Radii | `src/index.css` | `--radius-sm` … `--radius-full` |
| Sizing | `src/index.css` | `--size-control-*`, `--size-icon-*` |
| Typography | `src/index.css` | `--font-sans/display/mono`, `--text-xs` … `--text-2xl` |
| Layering | `src/index.css` | `--z-base` … `--z-max` |
| Shell geometry | `src/index.css` | `--app-bar-h`, `--vdock-h`, `--dock-reserve`, `--rail-w`, `--stage-pad-x` |

Typed mirrors: `src/design/tokens.ts` (canonical surface) re-exporting
`src/design/tokens.v2.ts` (ramps).

---

## Why single-sourcing is enforced

Both token files are concatenated into one stylesheet. `tokens.css` is imported first,
so **anything redeclared in `index.css` wins**, silently.

Two tokens were broken this way and neither produced an error:

| Token | Intended | Actually applied | Consequence |
|---|---|---|---|
| `--shadow-md` | `0 10px 28px -12px rgb(6 12 28 / 0.6)` (v2) | `0 8px 24px -12px rgb(6 12 28 / 0.55)` | The v2 elevation ramp never reached the browser |
| `--shadow-sm`, `--shadow-lg`, `--shadow-focus` | v2 values | older values | Same |
| `--stage-pad-x` at ≥1024px | `0.875rem` (density system) | `2rem` | The desktop density override never applied |

`SHADOW_V2.md` in TypeScript claimed to be the v2 ramp while resolving to the v1 value
at runtime. Nothing caught it, because a duplicate declaration is valid CSS.

The test now asserts that no token name appears in more than one file. Repeats *within*
one file are allowed, because a media query legitimately overrides a token — reduced
motion collapses the motion scale next to where the durations are declared.

---

## What the test guarantees

`src/design/tokens.test.ts` reads the CSS at test time and asserts:

1. **No cross-file duplicate declarations.** The failure message names the token and both files.
2. **Elevation, motion and easing are declared only in the token layer.**
3. **The v2 elevation ramp is reachable** — a direct regression guard on the bug above.
4. **Every `var(--x)` the TypeScript mirror references is actually declared.** A renamed or deleted variable fails immediately instead of silently resolving to nothing.
5. **Motion durations in TypeScript equal the CSS milliseconds.**
6. **Z-index values in TypeScript equal the CSS layer variables.**
7. **`MOTION_MS` and `MOTION_V2` agree.**
8. **Every suite product has an rgb accent, a label, and a declared `--accent-*` variable.**
9. **Layer order holds** — dock below overlay below modal below toast.

---

## Using tokens

**In a component, prefer the CSS variable.** Tailwind arbitrary values read them
directly:

```tsx
<div className="shadow-[var(--shadow-md)] rounded-[var(--radius-lg)]" />
```

**In TypeScript, import the mirror** when a value must be computed:

```ts
import { MOTION_MS, Z_INDEX } from "@/design/tokens";

transition={{ duration: MOTION_MS.fast / 1000 }}
style={{ zIndex: Z_INDEX.overlay }}
```

**Never hard-code** a duration, layer number, radius or shadow that a token already
covers. If a token is missing, add it to the correct file and extend the mirror.

---

## Status colour and accessibility

`STATUS_COLOR` must never be the only carrier of meaning. Pair it with an icon or a
label so state survives colour blindness, greyscale printing, and high-contrast modes.
This is a requirement of the premium suite direction, not a preference.

`MIN_TOUCH_TARGET_PX` is 44. Controls on touch surfaces must meet it.

---

## Adding a token

1. Decide which file owns the family (table above).
2. Declare it once there.
3. Add a typed entry to `src/design/tokens.ts` pointing at the variable.
4. Run `npm run test` — the parity test will tell you if you duplicated or mistyped it.

---

## Known limitation

The parser in `src/design/tokenParity.ts` is a regular expression over declaration
text, not a real CSSOM. It is sufficient for the flat `--name: value;` declarations the
token files use, and would need replacing if tokens ever move into nested or
conditional syntax.
