// Dock personalization — color themes + glow effect styles. Purchasable with V¢
// (Godmode discounted). A couple of themes are Godmode-exclusive (uniqueness).

export interface DockColorTheme {
  id: string;
  label: string;
  /** Color stops, left→right. Single stop = one hue across the dock. */
  colors: string[];
  /** Base V¢ price (0 = free for all). */
  price: number;
  /** Godmode-only uniqueness (not for sale). */
  exclusive?: boolean;
}

// Default "Spectrum" runs the rainbow Red → Violet, left → right.
export const DOCK_COLORS: DockColorTheme[] = [
  { id: "spectrum", label: "Spectrum", colors: ["#ff3b3b", "#ff9e2c", "#ffd84d", "#34f5a0", "#3b82f6", "#a855f7"], price: 0 },
  { id: "veil", label: "Veil", colors: ["#a87cf8"], price: 0 },
  { id: "aurora", label: "Aurora", colors: ["#a855f7", "#5b8cff", "#2dd4bf"], price: 100 },
  { id: "ember", label: "Ember", colors: ["#ff9e2c", "#ff3b5c", "#b3263f"], price: 100 },
  { id: "ocean", label: "Ocean", colors: ["#22d3ee", "#3b82f6", "#6366f1"], price: 100 },
  { id: "candy", label: "Candy", colors: ["#ff5d8f", "#c77dff", "#5eead4"], price: 120 },
  { id: "gilded", label: "Gilded", colors: ["#ffe9a8", "#ffd166", "#ff9e2c"], price: 0, exclusive: true },
  { id: "prism", label: "Prism", colors: ["#ff3b3b", "#ffd84d", "#34f5a0", "#3b82f6", "#a855f7", "#ff5d8f"], price: 0, exclusive: true },
];

export interface DockFxStyle {
  id: string;
  label: string;
  price: number;
  exclusive?: boolean;
}

export const DOCK_FX: DockFxStyle[] = [
  { id: "glow", label: "Glow", price: 0 },
  { id: "minimal", label: "Minimal", price: 0 },
  { id: "neon", label: "Neon", price: 80 },
  { id: "solid", label: "Solid", price: 80 },
  { id: "aura", label: "Aura", price: 120, exclusive: true },
];

export const DEFAULT_DOCK_COLOR = "spectrum";
export const DEFAULT_DOCK_FX = "glow";

const COLOR_MAP: Record<string, DockColorTheme> = Object.fromEntries(
  DOCK_COLORS.map((t) => [t.id, t])
);
const FX_MAP: Record<string, DockFxStyle> = Object.fromEntries(
  DOCK_FX.map((f) => [f.id, f])
);

export function dockColorTheme(id: string | undefined): DockColorTheme {
  return COLOR_MAP[id ?? DEFAULT_DOCK_COLOR] ?? COLOR_MAP[DEFAULT_DOCK_COLOR];
}

export function dockFxStyle(id: string | undefined): DockFxStyle {
  return FX_MAP[id ?? DEFAULT_DOCK_FX] ?? FX_MAP[DEFAULT_DOCK_FX];
}

function lerpHex(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  const c = pa.map((v, i) => Math.round(v + (pb[i] - v) * t));
  return `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
}

/** The color for the icon at `index` of `total`, sampled across the theme stops. */
export function dockColorAt(colors: string[], index: number, total: number): string {
  if (colors.length === 1) return colors[0];
  if (total <= 1) return colors[0];
  const t = index / (total - 1);
  const pos = t * (colors.length - 1);
  const i = Math.floor(pos);
  if (i >= colors.length - 1) return colors[colors.length - 1];
  return lerpHex(colors[i], colors[i + 1], pos - i);
}
