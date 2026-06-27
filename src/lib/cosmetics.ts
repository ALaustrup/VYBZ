// Maps owned/equipped cosmetic item ids to visual effects. The shop stores a
// loadout ({ kind: item_id }); these helpers turn it into classes/styles.

export type Loadout = Record<string, string>;

/** Display metadata for the shop + tooltips. */
export const COSMETIC_KINDS = ["font", "border", "theme", "animation", "flair"] as const;

export function fontClass(l: Loadout): string {
  switch (l.font) {
    case "font_serif":
      return "font-serif";
    case "font_type":
      return "font-mono";
    default:
      return "font-display";
  }
}

/** Ring/frame around the profile avatar + card. */
export function borderClass(l: Loadout): string {
  switch (l.border) {
    case "border_glow":
      return "ring-2 ring-veil-400/70 shadow-glow";
    case "border_gold":
      return "ring-2 ring-amber-300/80";
    default:
      return "ring-1 ring-white/10";
  }
}

/** Header background gradient. */
export function themeGradient(l: Loadout): string | undefined {
  switch (l.theme) {
    case "theme_midnight":
      return "linear-gradient(160deg, #0b1026 0%, #241047 100%)";
    case "theme_ember":
      return "linear-gradient(160deg, #2a0f0a 0%, #3a1024 100%)";
    default:
      return undefined;
  }
}

export function nameShimmer(l: Loadout): boolean {
  return l.animation === "anim_shimmer";
}

export function hasSparkle(l: Loadout): boolean {
  return l.flair === "flair_sparkle";
}

// Circle themes (header gradient). Premium ones are a Godmode-owner perk.
export const CIRCLE_THEMES: { id: string; name: string; gradient?: string; premium: boolean }[] = [
  { id: "", name: "Default", premium: false },
  { id: "aurora", name: "Aurora", gradient: "linear-gradient(160deg,#1b1040,#3a1a66)", premium: false },
  { id: "ember", name: "Ember", gradient: "linear-gradient(160deg,#2a0f0a,#3a1024)", premium: false },
  { id: "midnight", name: "Midnight", gradient: "linear-gradient(160deg,#070a1a,#16204a)", premium: true },
  { id: "gilded", name: "Gilded", gradient: "linear-gradient(160deg,#2a2410,#4a3712)", premium: true },
  { id: "rose", name: "Rosewater", gradient: "linear-gradient(160deg,#2a1020,#4a1838)", premium: true },
];

export function circleGradient(theme: Record<string, string> | undefined): string | undefined {
  return CIRCLE_THEMES.find((t) => t.id === (theme?.id || ""))?.gradient;
}
