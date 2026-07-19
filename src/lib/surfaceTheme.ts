// ── Surface theming ──────────────────────────────────────────────────────────
// Studio Glass: one brand violet everywhere (the sign-in accent). Surfaces keep
// a label for quiet titles; living background stays on the calm aurora wash so
// the product reads as one place — not a rainbow of themed tabs.

export interface SurfaceTheme {
  id: string;
  /** "r g b" channels for --accent-rgb. Always brand violet. */
  accent: string;
  /** DynamicBackground variant id (see lib/backgrounds). */
  bg: string;
  /** Short surface label (used by PageHeader defaults). */
  label: string;
}

/** Sign-in / brand violet — the single accent for the whole app. */
export const BRAND_ACCENT = "168 124 248";

/** Calm living backdrop shared with the sign-in screen. */
export const BRAND_BG = "aurora";

export const DEFAULT_SURFACE: SurfaceTheme = {
  id: "default",
  accent: BRAND_ACCENT,
  bg: BRAND_BG,
  label: "VYBZ",
};

// Labels only — accent + bg are brand-locked.
const LABELS: Array<{ test: (p: string) => boolean; id: string; label: string }> = [
  { test: (p) => p === "/", id: "feed", label: "Feed" },
  { test: (p) => p.startsWith("/discover"), id: "discover", label: "Discover" },
  { test: (p) => p.startsWith("/spark"), id: "spark", label: "Spark" },
  { test: (p) => p.startsWith("/opportunities"), id: "opportunities", label: "Opportunities" },
  { test: (p) => p.startsWith("/connect"), id: "find", label: "Find" },
  { test: (p) => p.startsWith("/live"), id: "live", label: "Live" },
  { test: (p) => p.startsWith("/projects"), id: "studio", label: "Collabs" },
  { test: (p) => p.startsWith("/messages") || p.startsWith("/rooms"), id: "messages", label: "Messages" },
  { test: (p) => p.startsWith("/store"), id: "store", label: "Store" },
  { test: (p) => p.startsWith("/activity"), id: "activity", label: "Activity" },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/mod") || p.startsWith("/apply-mod"), id: "staff", label: "Staff" },
  { test: (p) => p.startsWith("/profile") || p.startsWith("/u/"), id: "you", label: "You" },
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

/** Primary product modes for Orb Dock navigation. */
export type AppMode = "find" | "drops" | "you";

export const MODE_LABEL: Record<AppMode, string> = {
  find: "Find",
  drops: "Drops",
  you: "You",
};

/** First destination when tapping a mode (app landing = Feed via Drops). */
export const MODE_HOME: Record<AppMode, string> = {
  find: "/connect",
  drops: "/",
  you: "/profile",
};

export function modeForPath(pathname: string): AppMode {
  if (
    pathname.startsWith("/connect") ||
    pathname.startsWith("/spark") ||
    pathname.startsWith("/opportunities") ||
    pathname.startsWith("/discover")
  ) {
    return "find";
  }
  if (
    pathname.startsWith("/profile") ||
    pathname.startsWith("/u/") ||
    pathname.startsWith("/messages") ||
    pathname.startsWith("/rooms") ||
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
  return "drops";
}
