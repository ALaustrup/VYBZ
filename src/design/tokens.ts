/**
 * The design token contract.
 *
 * **CSS is the single source of truth.** Tokens are declared exactly once, in
 * `src/design/tokens.css` (ramps, elevation, glass, motion, density) or in the
 * `:root` block of `src/index.css` (semantic colour, spacing, radii, sizing,
 * typography, z-index, shell dimensions).
 *
 * This module is the typed mirror. Prefer a CSS variable inside a component;
 * reach for this module when a value must cross into TypeScript — animation
 * timings, layering arithmetic, product accents, or documentation.
 *
 * Two rules are enforced by `tokens.test.ts` rather than trusted:
 *  1. No token may be declared in more than one CSS file.
 *  2. Numeric values duplicated into TypeScript must match the CSS.
 */

export {
  COLOR_V2,
  MOTION_V2,
  SHADOW_V2,
  GLASS_VIBRANT,
  ACCENT_WASH_V2,
} from "./tokens.v2";

// ── Products ────────────────────────────────────────────────────────────────

export const SUITE_PRODUCTS = [
  "home",
  "studio",
  "prepare",
  "credits",
  "master",
  "coverlab",
  "sentinel",
  "relay",
  "live",
  "market",
  "artist",
  "vdock",
] as const;

export type SuiteProductId = (typeof SUITE_PRODUCTS)[number];

/** "r g b" channels, for `rgb(var(--accent-rgb) / a)` and color-mix. */
/** Cool spectrum — keep in sync with `--accent-*` in index.css (M10 R0). */
export const PRODUCT_ACCENT_RGB: Record<SuiteProductId, string> = {
  home: "0 194 255",
  studio: "255 140 40",
  prepare: "125 211 252",
  credits: "56 189 248",
  master: "245 158 11",
  coverlab: "94 234 212",
  sentinel: "239 68 68",
  relay: "14 165 233",
  live: "220 38 38",
  market: "34 211 238",
  artist: "0 194 255",
  vdock: "0 194 255",
};

export const PRODUCT_LABEL: Record<SuiteProductId, string> = {
  home: "Home",
  studio: "Studio",
  prepare: "Prepare",
  credits: "Credits",
  master: "MasterReady",
  coverlab: "CoverLab",
  sentinel: "Sentinel",
  relay: "Relay",
  live: "Live",
  market: "Market",
  artist: "Artist",
  vdock: "VDock",
};

// ── Semantic colour ─────────────────────────────────────────────────────────

/** Surface and text colours. Values live in `index.css`. */
export const COLOR = {
  abyss: "var(--color-abyss)",
  graphite: "var(--color-graphite)",
  slate: "var(--color-slate)",
  fog: "var(--color-fog)",
  snow: "var(--color-snow)",
  cyan: "var(--color-cyan)",
} as const;

/**
 * Status colours. Never the only carrier of meaning — pair with an icon or
 * label so state survives colour blindness and greyscale.
 */
export const STATUS_COLOR = {
  success: "var(--color-success)",
  warning: "var(--color-warning)",
  danger: "var(--color-danger)",
  info: "var(--color-info)",
} as const;

export type StatusTone = keyof typeof STATUS_COLOR;

// ── Spacing, radii, sizing ──────────────────────────────────────────────────

export const SPACE = {
  1: "var(--space-1)",
  2: "var(--space-2)",
  3: "var(--space-3)",
  4: "var(--space-4)",
  5: "var(--space-5)",
  6: "var(--space-6)",
  8: "var(--space-8)",
  10: "var(--space-10)",
  12: "var(--space-12)",
} as const;

export const RADIUS = {
  sm: "var(--radius-sm)",
  md: "var(--radius-md)",
  lg: "var(--radius-lg)",
  xl: "var(--radius-xl)",
  full: "var(--radius-full)",
} as const;

export const SIZE = {
  controlSm: "var(--size-control-sm)",
  controlMd: "var(--size-control-md)",
  controlLg: "var(--size-control-lg)",
  iconSm: "var(--size-icon-sm)",
  iconMd: "var(--size-icon-md)",
} as const;

/** Minimum comfortable touch target. Controls on touch surfaces must meet this. */
export const MIN_TOUCH_TARGET_PX = 44;

// ── Typography ──────────────────────────────────────────────────────────────

export const FONT = {
  sans: "var(--font-sans)",
  display: "var(--font-display)",
  mono: "var(--font-mono)",
} as const;

export const TEXT = {
  xs: "var(--text-xs)",
  sm: "var(--text-sm)",
  base: "var(--text-base)",
  lg: "var(--text-lg)",
  xl: "var(--text-xl)",
  "2xl": "var(--text-2xl)",
} as const;

// ── Shell geometry ──────────────────────────────────────────────────────────

/** Chrome dimensions. Layout maths should read these, never hard-code pixels. */
export const SHELL = {
  appBarHeight: "var(--app-bar-h)",
  vdockHeight: "var(--vdock-h)",
  dockReserve: "var(--dock-reserve)",
  railWidth: "var(--rail-w)",
  stagePadX: "var(--stage-pad-x)",
} as const;

// ── Layering ────────────────────────────────────────────────────────────────

/**
 * Layer order. Mirrors `--z-*`. Overlays must sit above the dock, modals above
 * overlays, and toasts above everything a user can dismiss.
 */
export const Z_INDEX = {
  base: 0,
  stage: 10,
  sticky: 30,
  dock: 70,
  overlay: 80,
  modal: 90,
  toast: 100,
  max: 110,
} as const;

// ── Motion ──────────────────────────────────────────────────────────────────

/** Durations in milliseconds. Mirrors `--motion-*`. */
export const MOTION_MS = {
  fast: 120,
  base: 240,
  slow: 360,
} as const;

export const EASE = {
  standard: "var(--ease-standard)",
  emphasized: "var(--ease-emphasized)",
} as const;

// ── Elevation ───────────────────────────────────────────────────────────────

/** Mirrors `--shadow-*`. The full ramp is `SHADOW_V2`. */
export const SHADOW = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  focus: "var(--shadow-focus)",
} as const;

// ── Accent washes ───────────────────────────────────────────────────────────

/** Soft product-tinted washes for hero and header areas. */
export const ACCENT_WASH = {
  market: "color-mix(in srgb, rgb(var(--accent-market) / 0.22) 100%, transparent)",
  coverlab: "color-mix(in srgb, rgb(var(--accent-coverlab) / 0.22) 100%, transparent)",
  home: "color-mix(in srgb, rgb(var(--accent-home) / 0.18) 100%, transparent)",
} as const;
