// ── Surface theming ──────────────────────────────────────────────────────────
// Daylight vivid system — electric cyan brand, light canvas. Labels stay quiet.

export interface SurfaceTheme {
  id: string;
  /** "r g b" channels for --accent-rgb. */
  accent: string;
  /** DynamicBackground variant id (see lib/backgrounds). */
  bg: string;
  /** Short surface label for route chrome / ambient context. */
  label: string;
}

/** Electric cyan — sharp, loud, not muddy violet. */
export const BRAND_ACCENT = "0 194 255";

/** Bright living backdrop for the daylight shell. */
export const BRAND_BG = "daybreak";

export const DEFAULT_SURFACE: SurfaceTheme = {
  id: "default",
  accent: BRAND_ACCENT,
  bg: BRAND_BG,
  label: "VYBZ",
};

const LABELS: Array<{ test: (p: string) => boolean; id: string; label: string }> = [
  { test: (p) => p === "/", id: "home", label: "Home" },
  { test: (p) => p.startsWith("/feed"), id: "feed", label: "Drops" },
  { test: (p) => p.startsWith("/discover"), id: "discover", label: "Discover" },
  { test: (p) => p.startsWith("/spark"), id: "spark", label: "Spark" },
  { test: (p) => p.startsWith("/opportunities"), id: "opportunities", label: "Opportunities" },
  { test: (p) => p.startsWith("/connect"), id: "network", label: "Network" },
  { test: (p) => p.startsWith("/social"), id: "social", label: "Social" },
  { test: (p) => p.startsWith("/live"), id: "live", label: "Live" },
  { test: (p) => p.startsWith("/projects"), id: "studio", label: "Studio" },
  { test: (p) => p.startsWith("/messages") || p.startsWith("/rooms"), id: "messages", label: "Messages" },
  { test: (p) => p.startsWith("/store"), id: "store", label: "Flair" },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/mod") || p.startsWith("/apply-mod"), id: "staff", label: "Staff" },
  { test: (p) => p.startsWith("/library"), id: "library", label: "Library" },
  { test: (p) => p.startsWith("/profile") || p.startsWith("/activity") || p.startsWith("/u/") || p.startsWith("/artist/"), id: "you", label: "You" },
  { test: (p) => p.startsWith("/p/"), id: "space", label: "Project" },
  { test: (p) => p.startsWith("/codex") || p.startsWith("/legal"), id: "codex", label: "Codex" },
];

export function surfaceForPath(pathname: string): SurfaceTheme {
  for (const s of LABELS) {
    if (s.test(pathname)) {
      return { id: s.id, label: s.label, accent: BRAND_ACCENT, bg: BRAND_BG };
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
    pathname.startsWith("/spark") ||
    pathname.startsWith("/opportunities") ||
    pathname.startsWith("/discover")
  ) {
    return "network";
  }
  if (pathname.startsWith("/projects") || pathname.startsWith("/live") || pathname.startsWith("/social") || pathname.startsWith("/rooms")) {
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
