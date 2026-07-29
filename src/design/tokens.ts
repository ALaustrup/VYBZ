/**
 * Suite Genesis design tokens — TypeScript mirror of CSS variables.
 * Prefer CSS vars in components; use this module for typed product accents and docs.
 * v2 ramps: re-exported from tokens.v2.ts
 */

export {
  COLOR_V2,
  MOTION_V2,
  SHADOW_V2,
  GLASS_VIBRANT,
  ACCENT_WASH_V2,
} from "./tokens.v2";

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

/** "r g b" channels for color-mix / --accent-rgb */
export const PRODUCT_ACCENT_RGB: Record<SuiteProductId, string> = {
  home: "0 194 255",
  studio: "255 140 40",
  prepare: "125 211 252",
  credits: "99 102 241",
  master: "245 158 11",
  coverlab: "217 70 239",
  sentinel: "239 68 68",
  relay: "59 130 246",
  live: "220 38 38",
  market: "168 85 247",
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

/** @deprecated Prefer MOTION_V2 — kept for Phase 9 call sites */
export const MOTION_MS = {
  fast: 120,
  base: 240,
  slow: 360,
} as const;

/** Elevation tokens — mirror `--shadow-*` */
export const SHADOW = {
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  focus: "var(--shadow-focus)",
} as const;

/** Soft accent washes for Market / CoverLab polish */
export const ACCENT_WASH = {
  market: "color-mix(in srgb, rgb(var(--accent-market) / 0.22) 100%, transparent)",
  coverlab: "color-mix(in srgb, rgb(var(--accent-coverlab) / 0.22) 100%, transparent)",
  home: "color-mix(in srgb, rgb(var(--accent-home) / 0.18) 100%, transparent)",
} as const;
