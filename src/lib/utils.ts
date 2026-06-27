// Small, dependency-free helpers shared across the app.

/** Join class names, skipping falsy values. Keeps JSX tidy without clsx. */
export function cx(...parts: Array<string | false | null | undefined>): string {
  return parts.filter(Boolean).join(" ");
}

/** Compact number formatting: 1200 -> "1.2k", 1_500_000 -> "1.5m". */
export function formatCount(value: number): string {
  if (value < 1000) return String(value);
  if (value < 1_000_000) {
    return `${(value / 1000).toFixed(value % 1000 === 0 ? 0 : 1)}k`.replace(
      ".0",
      ""
    );
  }
  return `${(value / 1_000_000).toFixed(1)}m`.replace(".0", "");
}

/** Human-friendly relative time, e.g. "3h ago". */
export function timeAgo(timestamp: number): string {
  const seconds = Math.floor((Date.now() - timestamp) / 1000);
  const units: Array<[number, string]> = [
    [60, "s"],
    [60, "m"],
    [24, "h"],
    [7, "d"],
    [4.34524, "w"],
  ];
  let value = seconds;
  let unit = "s";
  for (const [size, label] of units) {
    if (value < size) {
      unit = label;
      break;
    }
    value = Math.floor(value / size);
    unit = label;
  }
  if (unit === "s" && value < 5) return "just now";
  return `${value}${unit} ago`;
}

/**
 * Deterministic pseudo-random generator (mulberry32).
 * Lets us produce stable procedural artwork from a single integer seed so a
 * confession's "veiled photo" never changes between renders.
 */
export function seededRandom(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Clamp a number to the inclusive [min, max] range. */
export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

/**
 * Community reveal level for a confession's photo: 0 = fully veiled, 1 = clear.
 * Driven by the crowd — Unveil votes raise it, Veil votes lower it. Smoothed so
 * a single vote still matters yet fresh posts start blurred, and capped below 1
 * so a hint of mystery always lingers.
 */
// Community Veil thresholds: net Veils (Veils minus Feels, so positive
// engagement protects a post) progressively blur it for everyone. At 300 it's
// fully veiled / buried.
export const VEIL_THRESHOLDS = [15, 30, 75, 150, 300] as const;
const VEIL_CLARITY = [1, 0.72, 0.52, 0.34, 0.16, 0] as const; // index = layer 0..5

/** Net Veils after positive Feels offset them (floored at 0). */
export function netVeils(feels: number, veils: number): number {
  return Math.max(0, Math.max(0, veils) - Math.max(0, feels));
}

/** Which veil layer (0 = clear … 5 = fully veiled) a post is at. */
export function veilLayer(feels: number, veils: number): number {
  const net = netVeils(feels, veils);
  let layer = 0;
  for (const t of VEIL_THRESHOLDS) if (net >= t) layer++;
  return layer;
}

/** Display clarity 0..1 (1 = crisp, 0 = fully veiled) from the community Veils. */
export function veilClarity(feels: number, veils: number): number {
  return VEIL_CLARITY[veilLayer(feels, veils)];
}

/** A post is "buried" once it crosses the final (300) threshold. */
export function isBuried(feels: number, veils: number): boolean {
  return netVeils(feels, veils) >= VEIL_THRESHOLDS[VEIL_THRESHOLDS.length - 1];
}

// Brand-consistent gradient palettes for the procedural artwork, chosen
// deterministically by a post's seed (replaces the old category palettes).
const PALETTES: [string, string, string][] = [
  ["#c77dff", "#5d18c4", "#150726"],
  ["#5b8cff", "#3a2a8c", "#0c1230"],
  ["#ff5d8f", "#7129e6", "#2a0f3d"],
  ["#34f5a0", "#0e8f6f", "#04231d"],
  ["#ffb020", "#a8478c", "#2a0f3d"],
  ["#7aa2ff", "#a87cf8", "#220a3a"],
];

export function paletteFor(seed: number): [string, string, string] {
  return PALETTES[Math.abs(Math.floor(seed)) % PALETTES.length];
}

/**
 * A stable two-stop gradient for a small identity avatar, derived from any key
 * (alias/emoji/id). Replaces the removed "aura" cosmetic — avatars now tint
 * deterministically from identity so they stay consistent and varied.
 */
export function avatarGradient(key: string): [string, string] {
  let h = 0;
  const s = key || "veiled";
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  const p = paletteFor(Math.abs(h) || 1);
  return [p[0], p[1]];
}

/** A subtle haptic tick on supported devices (mobile / some headsets). */
export function haptic(pattern: number | number[] = 10): void {
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) {
      navigator.vibrate(pattern);
    }
  } catch {
    // Non-fatal.
  }
}

/**
 * Parse the leading mile value out of a distance label.
 * "0.4 mi away" -> 0.4, "Here" / "Right here" -> 0.
 */
export function distanceMiles(distance: string): number {
  const match = distance.match(/([\d.]+)\s*mi/);
  return match ? parseFloat(match[1]) : 0;
}
