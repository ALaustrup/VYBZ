// Living background variants. Each is a small palette of accent hues that drift
// over the charcoal base and warp toward touch ("heat-paint"). Surfaces pick a
// variant (see lib/surfaceTheme); some are cosmetic-store unlocks (Lane B).

export interface BgVariant {
  id: string;
  label: string;
  /** Accent hues drawn as soft, additive blobs over the charcoal base. */
  colors: [string, string, string];
  /** True for cosmetic-store variants (unlocked with credits). */
  premium: boolean;
  /** Base credit price (0 = free / always available). */
  price: number;
  /** Reserved: limited/exclusive variant (not in the general store). */
  exclusive?: boolean;
}

export const BG_VARIANTS: BgVariant[] = [
  { id: "aurora", label: "Slate", colors: ["#3a3f4b", "#4a5161", "#2b2f39"], premium: false, price: 0 },
  // Colourful surface backdrops (also cosmetic unlocks). Used per-surface so
  // Feed / Connect / Studio / Store each get their own living background.
  { id: "ember", label: "Ember", colors: ["#ff7a18", "#b3263f", "#7129e6"], premium: true, price: 120 },
  { id: "tide", label: "Tide", colors: ["#14b8a6", "#2563eb", "#7129e6"], premium: true, price: 120 },
  { id: "ink", label: "Ink Smoke", colors: ["#4b5165", "#6b7280", "#3a3f55"], premium: true, price: 120 },
  { id: "rose", label: "Rosewater", colors: ["#ff5d8f", "#c77dff", "#7129e6"], premium: true, price: 120 },
  { id: "nebula", label: "Nebula", colors: ["#a855f7", "#ec4899", "#22d3ee"], premium: true, price: 0, exclusive: true },
];

export const DEFAULT_BG = "aurora";

const MAP: Record<string, BgVariant> = Object.fromEntries(
  BG_VARIANTS.map((v) => [v.id, v])
);

export function bgVariant(id: string | undefined): BgVariant {
  return MAP[id ?? DEFAULT_BG] ?? MAP[DEFAULT_BG];
}
