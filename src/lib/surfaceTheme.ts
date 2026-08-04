// ── Surface theming ──────────────────────────────────────────────────────────
// Dark smoke glass. Suite product accents for professional routes; brand cyan default.

import { PRODUCT_ACCENT_RGB, type SuiteProductId } from "@/design/tokens";

export interface SurfaceTheme {
  id: string;
  /** "r g b" channels for --accent-rgb. */
  accent: string;
  /** DynamicBackground variant id (see lib/backgrounds). */
  bg: string;
  /** Short surface label for route chrome / ambient context. */
  label: string;
  /** Suite product id when this surface maps to a Suite module. */
  product?: SuiteProductId;
  /** professional = flat dense chrome; audience = atmospheric */
  mode?: "professional" | "audience";
}

/** Electric cyan — sharp, loud, not muddy violet. */
export const BRAND_ACCENT = "0 194 255";

/** Native dark-smoke backdrop for the cyber shell. */
export const BRAND_BG = "smoke";

export const DEFAULT_SURFACE: SurfaceTheme = {
  id: "default",
  accent: BRAND_ACCENT,
  bg: BRAND_BG,
  label: "VYBZ",
  product: "home",
  mode: "audience",
};

type SurfaceRule = {
  test: (p: string) => boolean;
  id: string;
  label: string;
  product?: SuiteProductId;
  mode?: "professional" | "audience";
};

const LABELS: SurfaceRule[] = [
  { test: (p) => p === "/" || p === "/start" || p.startsWith("/releases"), id: "home", label: "Home", product: "home", mode: "professional" },
  { test: (p) => p.startsWith("/feed"), id: "feed", label: "Drops", mode: "audience" },
  { test: (p) => p.startsWith("/discover"), id: "discover", label: "Discover", mode: "audience" },
  { test: (p) => p.startsWith("/opportunities"), id: "opportunities", label: "Opportunities", mode: "audience" },
  { test: (p) => p.startsWith("/connect"), id: "network", label: "Network", mode: "audience" },
  { test: (p) => p.startsWith("/social"), id: "social", label: "Social", mode: "audience" },
  { test: (p) => p.startsWith("/live"), id: "live", label: "Live", product: "live", mode: "audience" },
  { test: (p) => p.startsWith("/studio") || p.startsWith("/projects"), id: "studio", label: "Studio", product: "studio", mode: "professional" },
  { test: (p) => p.startsWith("/release/") && p.includes("/credits"), id: "credits", label: "Credits", product: "credits", mode: "professional" },
  { test: (p) => p.startsWith("/release/") && p.includes("/distribution"), id: "relay", label: "Distribution", product: "relay", mode: "professional" },
  { test: (p) => p.startsWith("/settings/costs"), id: "home", label: "Cost Sentinel", product: "home", mode: "professional" },
  { test: (p) => p.startsWith("/settings/credits"), id: "home", label: "AI minutes", product: "home", mode: "professional" },
  { test: (p) => p.startsWith("/tools/packs") || p.startsWith("/pack/"), id: "market", label: "Market", product: "market", mode: "professional" },
  { test: (p) => p.startsWith("/credits"), id: "credits", label: "Credits", product: "credits", mode: "professional" },
  { test: (p) => p.startsWith("/release/") && p.includes("/master"), id: "master", label: "MasterReady", product: "master", mode: "professional" },
  { test: (p) => p.startsWith("/master"), id: "master", label: "MasterReady", product: "master", mode: "professional" },
  { test: (p) => p.startsWith("/release/") && p.includes("/artwork"), id: "coverlab", label: "CoverLab", product: "coverlab", mode: "professional" },
  { test: (p) => p.startsWith("/coverlab") || p.startsWith("/visuals"), id: "coverlab", label: "CoverLab", product: "coverlab", mode: "professional" },
  { test: (p) => p.startsWith("/sentinel"), id: "sentinel", label: "Sentinel", product: "sentinel", mode: "professional" },
  { test: (p) => p.startsWith("/relay") || (p.startsWith("/release/") && p.includes("/delivery")), id: "relay", label: "Relay", product: "relay", mode: "professional" },
  { test: (p) => p.startsWith("/release/"), id: "prepare", label: "Prepare", product: "prepare", mode: "professional" },
  { test: (p) => p.startsWith("/messages") || p.startsWith("/rooms"), id: "messages", label: "Messages", mode: "audience" },
  { test: (p) => p.startsWith("/market"), id: "market", label: "Market", product: "market", mode: "professional" },
  { test: (p) => p.startsWith("/store") || p.startsWith("/wallet"), id: "wallet", label: "Wallet", mode: "audience" },
  { test: (p) => p.startsWith("/settings"), id: "settings", label: "Settings", mode: "professional" },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/mod") || p.startsWith("/apply-mod"), id: "staff", label: "Staff", mode: "professional" },
  { test: (p) => p.startsWith("/library"), id: "library", label: "Library", mode: "audience" },
  { test: (p) => p.startsWith("/profile") || p.startsWith("/activity") || p.startsWith("/u/") || p.startsWith("/artist/"), id: "you", label: "You", product: "artist", mode: "audience" },
  { test: (p) => p.startsWith("/p/"), id: "space", label: "Project", product: "studio", mode: "professional" },
  { test: (p) => p.startsWith("/codex") || p.startsWith("/legal"), id: "codex", label: "Codex", mode: "professional" },
];

export function surfaceForPath(pathname: string): SurfaceTheme {
  for (const s of LABELS) {
    if (s.test(pathname)) {
      const accent =
        s.product && PRODUCT_ACCENT_RGB[s.product]
          ? PRODUCT_ACCENT_RGB[s.product]
          : BRAND_ACCENT;
      return {
        id: s.id,
        label: s.label,
        accent,
        bg: BRAND_BG,
        product: s.product,
        mode: s.mode ?? "audience",
      };
    }
  }
  return DEFAULT_SURFACE;
}

/** Hub taxonomy (legacy AppMode kept for any remaining callers). */
export type AppMode = "network" | "home" | "studio" | "you";

export const MODE_LABEL: Record<AppMode, string> = {
  network: "Network",
  home: "Home",
  studio: "Studio",
  you: "You",
};

export const MODE_HOME: Record<AppMode, string> = {
  network: "/connect",
  home: "/",
  studio: "/projects",
  you: "/profile",
};

export function modeForPath(pathname: string): AppMode {
  if (
    pathname.startsWith("/connect") ||
    pathname.startsWith("/opportunities") ||
    pathname.startsWith("/discover")
  ) {
    return "network";
  }
  if (
    pathname.startsWith("/projects") ||
    pathname.startsWith("/studio") ||
    pathname.startsWith("/live") ||
    pathname.startsWith("/social") ||
    pathname.startsWith("/rooms") ||
    pathname.startsWith("/release") ||
    pathname.startsWith("/credits") ||
    pathname.startsWith("/master") ||
    pathname.startsWith("/coverlab") ||
    pathname.startsWith("/sentinel") ||
    pathname.startsWith("/relay")
  ) {
    return "studio";
  }
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/library") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/artist/") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/activity") ||
    pathname.startsWith("/store") ||
    pathname.startsWith("/wallet") ||
    pathname.startsWith("/settings") ||
    pathname.startsWith("/admin") ||
    pathname.startsWith("/mod") ||
    pathname.startsWith("/apply-mod") ||
    pathname.startsWith("/codex") ||
    pathname.startsWith("/legal")
  ) {
    return "you";
  }
  return "home";
}
