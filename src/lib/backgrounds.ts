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
  { id: "daybreak", label: "Daybreak", colors: ["#00C2FF", "#FF4D2E", "#00D68F"], premium: false, price: 0 },
  { id: "aurora", label: "Daybreak", colors: ["#00C2FF", "#FF4D2E", "#5EEAD4"], premium: false, price: 0 },
  { id: "ember", label: "Ember", colors: ["#FF7A18", "#FF4D2E", "#FFB020"], premium: true, price: 120 },
  { id: "tide", label: "Tide", colors: ["#00C2FF", "#2563EB", "#14B8A6"], premium: true, price: 120 },
  { id: "ink", label: "Mist", colors: ["#7DD3FC", "#A5B4FC", "#67E8F9"], premium: true, price: 120 },
  { id: "rose", label: "Coral", colors: ["#FF6B4A", "#FF5D8F", "#FBBF24"], premium: true, price: 120 },
  { id: "nebula", label: "Signal", colors: ["#00C2FF", "#FF4D2E", "#A3E635"], premium: true, price: 0, exclusive: true },
];

export const DEFAULT_BG = "daybreak";

const MAP: Record<string, BgVariant> = Object.fromEntries(
  BG_VARIANTS.map((v) => [v.id, v])
);

export function bgVariant(id: string | undefined): BgVariant {
  return MAP[id ?? DEFAULT_BG] ?? MAP[DEFAULT_BG];
}
