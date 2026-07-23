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
 * Stable procedural artwork / accents from a single integer seed.
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

// Brand-consistent gradient palettes for procedural artwork, chosen
// deterministically by a post's seed.
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
 * (username/id). Avatars tint deterministically from identity.
 */
export function avatarGradient(key: string): [string, string] {
  let h = 0;
  const s = key || "vybz";
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
