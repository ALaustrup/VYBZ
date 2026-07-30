import { type SuiteProductId } from "@/design/tokens";

export type SuiteRoute = {
  path: string;
  productId: SuiteProductId;
  title: string;
  nav?: boolean;
  legacyAliases?: string[];
};

/** Canonical Suite Genesis routes. */
export const SUITE_ROUTES: readonly SuiteRoute[] = [
  { path: "/", productId: "home", title: "Home", nav: true },
  { path: "/start", productId: "home", title: "Start" },
  { path: "/releases", productId: "prepare", title: "Releases", nav: true },
  { path: "/release/:id", productId: "prepare", title: "Release" },
  { path: "/studio", productId: "studio", title: "Studio", nav: true, legacyAliases: ["/projects"] },
  {
    path: "/studio/:id",
    productId: "studio",
    title: "Project",
    legacyAliases: ["/projects/:id"],
  },
  { path: "/credits", productId: "credits", title: "Credits", nav: true },
  { path: "/release/:id/credits", productId: "credits", title: "Release credits" },
  { path: "/release/:id/distribution", productId: "relay", title: "Distribution readiness" },
  { path: "/settings/costs", productId: "home", title: "Cost Sentinel" },
  { path: "/settings/credits", productId: "home", title: "AI minutes" },
  { path: "/master", productId: "master", title: "MasterReady", nav: true },
  { path: "/release/:id/master", productId: "master", title: "Master workspace" },
  { path: "/desktop/process", productId: "master", title: "Desktop batch" },
  { path: "/desktop/waveform", productId: "master", title: "Waveform preview" },
  { path: "/mobile/uploads", productId: "prepare", title: "Android upload queue" },
  { path: "/android/beta", productId: "prepare", title: "Android Beta" },
  { path: "/coverlab", productId: "coverlab", title: "CoverLab", nav: true },
  { path: "/release/:id/artwork", productId: "coverlab", title: "Artwork" },
  { path: "/sentinel", productId: "sentinel", title: "Sentinel", nav: true },
  { path: "/sentinel/:id", productId: "sentinel", title: "Secure room" },
  { path: "/relay", productId: "relay", title: "Relay", nav: true },
  { path: "/release/:id/delivery", productId: "relay", title: "Delivery" },
  { path: "/discover", productId: "home", title: "Discover", nav: true },
  { path: "/live", productId: "live", title: "Live", nav: true },
  { path: "/live/:id", productId: "live", title: "Live session" },
  { path: "/u/:id", productId: "artist", title: "Artist" },
  {
    path: "/market",
    productId: "market",
    title: "Market",
    nav: true,
    legacyAliases: ["/tools/packs"],
  },
  { path: "/pack/:slug", productId: "market", title: "Pack" },
  { path: "/messages", productId: "home", title: "Messages", nav: true },
  { path: "/wallet", productId: "home", title: "Wallet", nav: true },
  { path: "/settings", productId: "home", title: "Settings", nav: true },
] as const;

/** Legacy path → Suite path (preserve until telemetry clears). */
export const LEGACY_REDIRECTS: readonly { from: string; to: string }[] = [
  { from: "/projects", to: "/studio" },
  { from: "/projects/:id", to: "/studio/:id" },
  { from: "/tools/packs", to: "/market" },
  { from: "/wallet", to: "/wallet" },
  { from: "/activity", to: "/?tab=live" },
] as const;

function matchPattern(pattern: string, pathname: string): boolean {
  const norm = pathname.replace(/\/+$/, "") || "/";
  if (pattern === "/" || pattern === "") return norm === "/";
  const pParts = pattern.split("/").filter(Boolean);
  const nParts = norm.split("/").filter(Boolean);
  if (pParts.length !== nParts.length) return false;
  return pParts.every((part, i) => part.startsWith(":") || part === nParts[i]);
}

/** Resolve Suite product for a pathname (canonical + legacyAliases). */
export function matchSuiteProduct(pathname: string): SuiteProductId | null {
  const ranked = [...SUITE_ROUTES].sort(
    (a, b) => b.path.split("/").filter(Boolean).length - a.path.split("/").filter(Boolean).length,
  );
  for (const route of ranked) {
    if (matchPattern(route.path, pathname)) return route.productId;
    for (const alias of route.legacyAliases ?? []) {
      if (matchPattern(alias, pathname)) return route.productId;
    }
  }
  return null;
}

export function suiteNavRoutes(): SuiteRoute[] {
  return SUITE_ROUTES.filter((r) => r.nav);
}
