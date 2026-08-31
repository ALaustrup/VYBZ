/**
 * Which destinations actually work.
 *
 * `SUITE_ROUTES` in `routeManifest.ts` is an *intent* manifest: it names the
 * suite's product surfaces and marks fourteen of them `nav: true`. Seven of
 * those fourteen render `SuitePlaceholderPage` — a titled page describing a
 * feature that does not exist yet. Navigation built from that manifest offers
 * dead ends, which M3 ("truthful shell") exists to stop.
 *
 * This module is the separate, verified answer to "can a user actually do
 * something here?". It is derived by reading the routers:
 * `src/App.tsx` and `src/app/suitePlaceholderRoutes.tsx`.
 *
 * `routeTruth.test.ts` scans `suitePlaceholderRoutes.tsx` and fails if
 * `PLACEHOLDER_PATHS` disagrees with it, so implementing a placeholder for real
 * forces this table to be updated rather than silently drifting.
 */

/** A destination safe to offer a user, because it renders real functionality. */
export type Destination = {
  path: string;
  title: string;
  /** Words that should match in search but are not displayed. */
  keywords?: string[];
  /** Set when the destination only exists while a feature flag is on. */
  flag?: "storefront";
};

/**
 * Paths whose element is `SuitePlaceholderPage`.
 *
 * Kept as data so navigation surfaces can exclude them and the guard test can
 * compare against the router source.
 */
export const PLACEHOLDER_PATHS: readonly string[] = [
  "/credits",
  "/master",
  "/coverlab",
  "/release/:id/artwork",
  "/sentinel",
  "/sentinel/:id",
  "/relay",
  "/release/:id/delivery",
  "/market",
  "/wallet",
  "/settings",
] as const;

const PLACEHOLDER_SET = new Set(PLACEHOLDER_PATHS);

/**
 * Paths that are only a placeholder while a flag is off.
 *
 * `/market` renders a placeholder when the storefront is disabled and the real
 * Market browse page when it is enabled (default on).
 */
const CONDITIONAL_PLACEHOLDERS: Readonly<Record<string, "storefront">> = {
  "/market": "storefront",
};

/**
 * True when the path renders a described-but-unbuilt page.
 *
 * Without `flags` this answers the unconditional question the router-drift guard
 * needs: could this path ever render a placeholder? With `flags` it answers the
 * question navigation needs: is it a placeholder right now?
 */
export function isPlaceholderPath(path: string, flags?: { storefront: boolean }): boolean {
  if (!PLACEHOLDER_SET.has(path)) return false;
  const condition = CONDITIONAL_PLACEHOLDERS[path];
  if (!condition || !flags) return true;
  return !flags[condition];
}

/**
 * Destinations that render working functionality, verified against the routers.
 *
 * Parameterised paths (`/release/:id`, `/track/:id`) are deliberately absent:
 * without a concrete id they are not navigable, so offering them would be the
 * same dishonesty as offering a placeholder.
 */
export const WORKING_DESTINATIONS: readonly Destination[] = [
  { path: "/", title: "Home", keywords: ["home", "people", "live", "network"] },
  { path: "/workspace", title: "Workspace", keywords: ["dashboard", "work", "hub"] },
  { path: "/make", title: "Make pack", keywords: ["upload", "pipeline", "sample pack", "flow"] },
  { path: "/make/dashboard", title: "Sales", keywords: ["orders", "sales", "dashboard"] },
  { path: "/library", title: "Library", keywords: ["works", "tracks", "media", "files", "catalog", "assets"] },
  { path: "/library?tab=device", title: "This device", keywords: ["node", "index", "catalog", "folder", "local"] },
  { path: "/library/mix", title: "Mix", keywords: ["mix", "catalog", "session", "living"] },
  { path: "/releases", title: "Scan", keywords: ["prepare", "projects", "scan", "finalize", "analyze", "analyser"] },
  { path: "/releases/new", title: "New scan", keywords: ["upload", "scan", "readiness", "analyse", "analyze"] },
  { path: "/tools/metadata", title: "Names", keywords: ["tags", "id3", "isrc", "upc"] },
  { path: "/tools/art-check", title: "Cover", keywords: ["artwork", "cover", "album art"] },
  { path: "/tools/midi", title: "MIDI", keywords: ["midi", "piano", "notes"] },
  { path: "/tools/convert", title: "Convert", keywords: ["wav", "convert", "transcode", "format"] },
  { path: "/tools/correct", title: "Fix", keywords: ["dc", "offset", "correction", "bypass", "master"] },
  { path: "/tools/translate", title: "Listen check", keywords: ["translation", "streaming", "normalisation", "codec", "preview"] },
  { path: "/tools/pack-maker", title: "Pack", keywords: ["samples", "pack", "loops", "oneshots", "zip"] },
  { path: "/tools/stems", title: "Stems", keywords: ["stems", "multitrack", "assemble", "stem set"] },
  { path: "/projects", title: "Projects", keywords: ["studio", "rooms", "work"] },
  { path: "/discover", title: "Discover", keywords: ["browse", "explore", "find music"] },
  { path: "/feed", title: "Network", keywords: ["feed", "activity", "posts", "newest", "uploads", "creators"] },
  { path: "/live", title: "Live", keywords: ["stream", "broadcast"] },
  { path: "/messages", title: "Messages", keywords: ["dm", "inbox", "chat"] },
  { path: "/notifications", title: "Notifications", keywords: ["alerts", "requests", "activity", "unread"] },
  { path: "/rooms", title: "Rooms", keywords: ["collab", "sessions"] },
  { path: "/social", title: "Social", keywords: ["people", "network"] },
  { path: "/connect", title: "Connect", keywords: ["people", "follow"] },
  { path: "/opportunities", title: "Opportunities", keywords: ["gigs", "briefs", "sync"] },
  { path: "/store", title: "Store", keywords: ["credits", "cosmetics", "buy", "vc"] },
  { path: "/market", title: "Shop", keywords: ["packs", "browse", "buy", "sample packs", "storefront", "market"], flag: "storefront" },
  { path: "/tools/packs", title: "Your packs", keywords: ["packs", "sell", "sample packs", "storefront"], flag: "storefront" },
  { path: "/visuals/studio", title: "Visualizer studio", keywords: ["visuals", "loop", "video"] },
  { path: "/visuals/tutorial", title: "Visualizer tutorial", keywords: ["visuals", "guide", "how to"] },
  { path: "/profile/edit", title: "Edit profile", keywords: ["account", "bio", "avatar", "settings"] },
  { path: "/desktop/process", title: "Desktop batch", keywords: ["convert", "batch", "process"] },
  { path: "/desktop/waveform", title: "Waveform preview", keywords: ["waveform", "peaks"] },
  { path: "/codex", title: "Codex", keywords: ["docs", "legal", "terms", "help"] },
  // Role-gated. Navigation shows these only to moderators and admins, but both
  // render real pages, so they are linkable destinations.
  { path: "/mod", title: "Moderate", keywords: ["reports", "queue", "moderation"] },
  { path: "/admin", title: "Admin", keywords: ["console", "platform"] },
] as const;

/** Working destinations, minus any whose feature flag is off. */
export function availableDestinations(flags: { storefront: boolean }): Destination[] {
  return WORKING_DESTINATIONS.filter((d) => (d.flag === "storefront" ? flags.storefront : true));
}

/**
 * Paths that only redirect, and where they land.
 *
 * A redirect to a working destination is legitimate navigation, so navigation
 * surfaces are allowed to link one.
 */
export const REDIRECTS: readonly { from: string; to: string; flag?: "storefront" }[] = [
  { from: "/studio", to: "/projects" },
  { from: "/activity", to: "/live" },
  { from: "/profile", to: "/" },
] as const;

/**
 * Whether a navigation surface may link this path.
 *
 * True for a working destination, or a redirect that lands on one. This is the
 * executable form of the Masterplan M3 exit gate: "every visible navigation
 * item leads to a functional surface."
 */
export function isLinkable(path: string, flags: { storefront: boolean }): boolean {
  const bare = path.split("#")[0] ?? path;
  if (availableDestinations(flags).some((d) => d.path === bare)) return true;
  const redirect = REDIRECTS.find((r) => r.from === bare);
  if (!redirect) return false;
  if (redirect.flag === "storefront" && !flags.storefront) return false;
  return availableDestinations(flags).some((d) => d.path === redirect.to) || redirect.to === "/";
}
