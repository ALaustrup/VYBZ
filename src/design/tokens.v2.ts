/**
 * Design tokens v2 — typed mirror of tokens.css.
 * Prefer CSS vars in components; use this module for typed ramps and tests.
 */

export const COLOR_V2 = {
  accentRamp: [
    "var(--accent-1)",
    "var(--accent-2)",
    "var(--accent-3)",
    "var(--accent-4)",
    "var(--accent-5)",
    "var(--accent-6)",
    "var(--accent-7)",
    "var(--accent-8)",
  ] as const,
  abyss: "var(--color-abyss)",
  snow: "var(--color-snow)",
  cyan: "var(--color-cyan)",
} as const;

export const MOTION_V2 = {
  fast: 120,
  normal: 240,
  /** @deprecated alias — use normal */
  base: 240,
  slow: 360,
} as const;

export const SHADOW_V2 = {
  xs: "var(--shadow-xs)",
  sm: "var(--shadow-sm)",
  md: "var(--shadow-md)",
  lg: "var(--shadow-lg)",
  xl: "var(--shadow-xl)",
  focus: "var(--shadow-focus)",
  glow: "var(--shadow-glow)",
} as const;

export const GLASS_VIBRANT = {
  fill: "var(--glass-vibrant-fill)",
  fillStrong: "var(--glass-vibrant-fill-strong)",
  border: "var(--glass-vibrant-border)",
  specular: "var(--glass-vibrant-specular)",
  blur: "var(--glass-vibrant-blur)",
  className: "glass-vibrant",
} as const;

export const ACCENT_WASH_V2 = {
  market: "color-mix(in srgb, rgb(var(--accent-market) / 0.24) 100%, transparent)",
  coverlab: "color-mix(in srgb, rgb(var(--accent-coverlab) / 0.24) 100%, transparent)",
  home: "color-mix(in srgb, rgb(var(--accent-home) / 0.2) 100%, transparent)",
  cyan: "color-mix(in srgb, rgb(var(--accent-rgb) / 0.18) 100%, transparent)",
} as const;
