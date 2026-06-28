// Per-page accent. Each top-level destination borrows the color of its taskbar
// icon (see BottomNav ITEMS + the dock color theme), so a page is tinted with a
// hint of its own icon hue while the base stays neutral gray. Sub-routes inherit
// the color of the section they belong to; anything off the four nav sections
// falls back to a calm brand violet.

import { dockColorAt, dockColorTheme } from "./dock";

// Must mirror BottomNav's ITEMS order: Feeds(0) · Chat(1) · Live(2) · You(3).
const NAV_TOTAL = 4;

const GROUPS: { index: number; test: (p: string) => boolean }[] = [
  {
    index: 0,
    test: (p) =>
      p === "/" ||
      p.startsWith("/local") ||
      p.startsWith("/trending") ||
      p.startsWith("/foryou"),
  },
  {
    index: 1,
    test: (p) =>
      p.startsWith("/chat") ||
      p.startsWith("/rooms") ||
      p.startsWith("/circles"),
  },
  { index: 2, test: (p) => p.startsWith("/live") || p.startsWith("/play") },
  {
    index: 3,
    test: (p) =>
      p.startsWith("/profile") ||
      p.startsWith("/you") ||
      p.startsWith("/notifications") ||
      p.startsWith("/admin"),
  },
];

/** Calm brand violet used for non-nav surfaces (onboarding, connect, legal…). */
const DEFAULT_ACCENT = "#a87cf8";

/** The accent hex/rgb string for a route, sampled from the active dock theme. */
export function pageAccentColor(
  pathname: string,
  dockColorId: string | undefined
): string {
  const group = GROUPS.find((g) => g.test(pathname));
  if (!group) return DEFAULT_ACCENT;
  return dockColorAt(dockColorTheme(dockColorId).colors, group.index, NAV_TOTAL);
}

/** "#rrggbb" | "rgb(r, g, b)" → "r g b" channels for `rgb(var(--accent-rgb)/a)`. */
export function toRgbChannels(color: string): string {
  if (color.startsWith("#")) {
    const r = parseInt(color.slice(1, 3), 16);
    const g = parseInt(color.slice(3, 5), 16);
    const b = parseInt(color.slice(5, 7), 16);
    return `${r} ${g} ${b}`;
  }
  const m = color.match(/rgba?\(([^)]+)\)/i);
  if (m) {
    const [r, g, b] = m[1].split(",").map((s) => parseInt(s.trim(), 10));
    return `${r} ${g} ${b}`;
  }
  return "168 124 248";
}

/** Convenience: resolve a route straight to "r g b" channels. */
export function pageAccentRgb(
  pathname: string,
  dockColorId: string | undefined
): string {
  return toRgbChannels(pageAccentColor(pathname, dockColorId));
}
