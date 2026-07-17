// ── Per-surface theming ──────────────────────────────────────────────────────
// The design system already exposes a per-route accent (`--accent-rgb`) that the
// whole token set (veil-* utilities, text-gradient, btn-primary, nav glow, the
// veil-radial backdrop, shadows) resolves against — but nothing ever set it per
// route, so every tab looked identical. This maps each major surface to its own
// accent hue + living-background variant so Feed, Connect, Studio, Store, etc.
// each read as their own place, while staying on-brand (one hue, calm glass).

export interface SurfaceTheme {
  id: string;
  /** "r g b" channels for --accent-rgb. */
  accent: string;
  /** DynamicBackground variant id (see lib/backgrounds). */
  bg: string;
  /** Short surface label (used by PageHeader defaults). */
  label: string;
}

// Ordered longest-prefix-first so `/projects/:id` matches `/projects`, etc.
const SURFACES: Array<{ test: (p: string) => boolean; theme: SurfaceTheme }> = [
  { test: (p) => p === "/", theme: { id: "feed", accent: "168 124 248", bg: "nebula", label: "Your feed" } },
  { test: (p) => p.startsWith("/discover"), theme: { id: "discover", accent: "56 189 248", bg: "tide", label: "Discover" } },
  { test: (p) => p.startsWith("/spark"), theme: { id: "spark", accent: "251 113 133", bg: "rose", label: "Spark" } },
  { test: (p) => p.startsWith("/opportunities"), theme: { id: "opportunities", accent: "45 212 191", bg: "tide", label: "Opportunities" } },
  { test: (p) => p.startsWith("/connect"), theme: { id: "connect", accent: "244 114 182", bg: "rose", label: "Connect" } },
  { test: (p) => p.startsWith("/projects"), theme: { id: "studio", accent: "45 212 191", bg: "tide", label: "Studio" } },
  { test: (p) => p.startsWith("/messages") || p.startsWith("/rooms"), theme: { id: "messages", accent: "96 165 250", bg: "tide", label: "Messages" } },
  { test: (p) => p.startsWith("/store"), theme: { id: "store", accent: "250 204 21", bg: "ember", label: "Store" } },
  { test: (p) => p.startsWith("/activity"), theme: { id: "activity", accent: "167 139 250", bg: "nebula", label: "Activity" } },
  { test: (p) => p.startsWith("/admin") || p.startsWith("/mod") || p.startsWith("/apply-mod"), theme: { id: "staff", accent: "52 211 153", bg: "ink", label: "Staff" } },
  { test: (p) => p.startsWith("/profile") || p.startsWith("/u/"), theme: { id: "you", accent: "251 191 36", bg: "ember", label: "You" } },
  { test: (p) => p.startsWith("/p/"), theme: { id: "space", accent: "192 132 252", bg: "nebula", label: "Space" } },
  { test: (p) => p.startsWith("/codex") || p.startsWith("/legal"), theme: { id: "codex", accent: "148 163 184", bg: "ink", label: "Codex" } },
];

export const DEFAULT_SURFACE: SurfaceTheme = { id: "default", accent: "168 124 248", bg: "aurora", label: "VYBZ" };

export function surfaceForPath(pathname: string): SurfaceTheme {
  for (const s of SURFACES) if (s.test(pathname)) return s.theme;
  return DEFAULT_SURFACE;
}
