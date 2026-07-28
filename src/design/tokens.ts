/**
 * Suite Genesis design tokens — TypeScript mirror of CSS variables in index.css.
 * Prefer CSS vars in components; use this module for typed product accents and docs.
 */

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

export const MOTION_MS = {
  fast: 120,
  base: 220,
  slow: 360,
} as const;
