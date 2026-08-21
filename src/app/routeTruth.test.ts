import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  PLACEHOLDER_PATHS,
  WORKING_DESTINATIONS,
  availableDestinations,
  isLinkable,
  isPlaceholderPath,
} from "@/app/routeTruth";
import { SUITE_ROUTES } from "@/app/routeManifest";
import { HOME_ITEM, accountItems, navGroups, navItems } from "@/shell/navModel";
import { FLAGS } from "@/lib/flags";

const ROOT = path.resolve(__dirname, "../..");
const PLACEHOLDER_ROUTER = readFileSync(
  path.join(ROOT, "src/app/suitePlaceholderRoutes.tsx"),
  "utf8",
);
const APP = readFileSync(path.join(ROOT, "src/App.tsx"), "utf8");

/**
 * Every `<Route path="…" element={<SuitePlaceholderPage …/>}>` in the router.
 *
 * The element may be wrapped in a conditional (as `/market` is), so this
 * captures the path of any route whose element block mentions the placeholder
 * page before the next route begins.
 */
function placeholderPathsInRouter(source: string): string[] {
  const found: string[] = [];
  const routes = source.split(/<Route\s/).slice(1);
  for (const chunk of routes) {
    const p = /^[^>]*?path="([^"]+)"/.exec(chunk)?.[1];
    if (!p) continue;
    const elementBlock = chunk.split(/<Route\s/)[0];
    if (elementBlock.includes("SuitePlaceholderPage")) found.push(p);
  }
  return found;
}

describe("placeholder paths stay in step with the router", () => {
  it("matches every SuitePlaceholderPage route exactly", () => {
    // If a placeholder gets implemented for real, this fails until the truth
    // table is updated — which is the point. Navigation reads that table.
    const inRouter = placeholderPathsInRouter(PLACEHOLDER_ROUTER).sort();
    expect(inRouter.length).toBeGreaterThan(0);
    expect([...PLACEHOLDER_PATHS].sort()).toEqual(inRouter);
  });

  it("classifies a known placeholder and a known working page correctly", () => {
    expect(isPlaceholderPath("/coverlab")).toBe(true);
    expect(isPlaceholderPath("/library")).toBe(false);
  });
});

describe("working destinations are real", () => {
  it("never offers a placeholder as a destination", () => {
    // Conditional placeholders (e.g. /market with storefront off) are not destinations
    // when their flag is on — the default production configuration.
    const flags = { storefront: true };
    const offending = WORKING_DESTINATIONS.filter((d) => isPlaceholderPath(d.path, flags));
    expect(offending.map((d) => d.path)).toEqual([]);
  });

  it("never offers a parameterised path, which cannot be navigated blind", () => {
    expect(WORKING_DESTINATIONS.filter((d) => d.path.includes(":")).map((d) => d.path)).toEqual([]);
  });

  it("is routed somewhere in the application", () => {
    // Each destination must appear as a literal route path in one of the two
    // routers, so a typo cannot ship as a dead command.
    const routers = `${APP}\n${PLACEHOLDER_ROUTER}`;
    const missing = WORKING_DESTINATIONS.filter((d) => !routers.includes(`path="${d.path}"`));
    expect(missing.map((d) => d.path)).toEqual([]);
  });

  it("has unique paths and non-trivial titles", () => {
    const paths = WORKING_DESTINATIONS.map((d) => d.path);
    expect(new Set(paths).size).toBe(paths.length);
    for (const d of WORKING_DESTINATIONS) expect(d.title.length).toBeGreaterThan(1);
  });

  it("drops flagged destinations when the flag is off", () => {
    const on = availableDestinations({ storefront: true }).map((d) => d.path);
    const off = availableDestinations({ storefront: false }).map((d) => d.path);
    expect(on).toContain("/tools/packs");
    expect(off).not.toContain("/tools/packs");
  });
});

describe("Masterplan M3 exit gate — every visible navigation item leads somewhere", () => {
  // Every visible navigation item must lead somewhere real. This was once prose
  // satisfied by hand in navModel.ts; prose cannot fail a build, so it lives here.
  //
  // `navGroups()` reads FLAGS directly, so these assertions describe the real
  // configuration under test. The flag-conditional logic itself is covered by the
  // isLinkable cases below, where both branches can be supplied explicitly.
  const flags = { storefront: !!FLAGS.storefront };

  it("links only destinations that lead somewhere", () => {
    const paths = [
      HOME_ITEM.path,
      ...navGroups().flatMap((g) => g.items.map((i) => i.path)),
      ...accountItems("admin", true).map((i) => i.path),
    ];
    expect(paths.filter((p) => !isLinkable(p, flags))).toEqual([]);
  });

  it("never links a page that is a placeholder in this configuration", () => {
    const linked = navItems().map((i) => i.path);
    expect(linked.filter((p) => isPlaceholderPath(p, flags))).toEqual([]);
  });

  it("covers every role variant of the account menu", () => {
    for (const [role, admin] of [["member", false], ["moderator", false], ["admin", true]] as const) {
      const dead = accountItems(role, admin)
        .map((i) => i.path)
        .filter((p) => !isLinkable(p, flags));
      expect(dead, `role ${role}`).toEqual([]);
    }
  });

  it("never links Studio, Market, AI minutes or Cost Sentinel", () => {
    // Creator OS (PRODUCT.md v8): Home, Feed, Live, and Library are default chrome.
    // Studio and unrouted money surfaces stay out of default nav.
    const linked = [
      ...navItems().map((i) => i.path),
      ...accountItems("admin", true).map((i) => i.path.split("#")[0]),
    ];
    expect(linked).not.toContain("/studio");
    expect(linked).not.toContain("/market");
    expect(linked).not.toContain("/settings/credits");
    expect(linked).not.toContain("/settings/costs");
    expect(linked).not.toContain("/store");
  });

  it("carries Home, Feed, Live and Library in the rail", () => {
    const linked = navItems().map((i) => i.path);
    expect(linked).toContain("/");
    expect(linked).toContain("/feed");
    expect(linked).toContain("/live");
    expect(linked).toContain("/library");
    for (const hidden of ["/library/mix", "/rooms", "/make", "/make/dashboard", "/store"]) {
      expect(linked, `rail must not advertise parked ${hidden}`).not.toContain(hidden);
    }
    for (const social of ["/discover", "/messages", "/notifications"]) {
      expect(linked, `rail must not advertise parked ${social}`).not.toContain(social);
    }
    for (const tool of ["/releases", "/tools/correct", "/tools/translate", "/tools/packs"]) {
      expect(linked, `${tool} is a pipeline stage, not a rail item`).not.toContain(tool);
    }
  });

  it("badges only counters the rail can actually measure", () => {
    const badged = navItems().filter((i) => i.badge);
    expect(badged).toEqual([]);
  });

  it("keeps Packages off the account menu while the /store route stays", () => {
    const items = accountItems("member", false);
    expect(items.find((i) => i.label === "Packages")).toBeUndefined();
    expect(items.some((i) => i.path === "/store")).toBe(false);
    expect(items.some((i) => i.path === "/profile/edit#packages")).toBe(false);
  });

  it("accepts a redirect but rejects an unrouted path", () => {
    expect(isLinkable("/studio", { storefront: true })).toBe(true);
    expect(isLinkable("/market", { storefront: true })).toBe(true);
    expect(isLinkable("/market", { storefront: false })).toBe(false);
    expect(isLinkable("/coverlab", { storefront: true })).toBe(false);
    expect(isLinkable("/not-a-real-route", { storefront: true })).toBe(false);
  });
});

describe("the intent manifest is measurably optimistic", () => {
  it("marks destinations as nav that are only placeholders", () => {
    // Recorded rather than asserted-away: this is the M3 problem in numbers.
    // If it ever reaches zero, navigation can be driven by the manifest again.
    const navPlaceholders = SUITE_ROUTES.filter((r) => r.nav && isPlaceholderPath(r.path));
    expect(navPlaceholders.map((r) => r.path).sort()).toEqual([
      "/coverlab",
      "/credits",
      "/market",
      "/master",
      "/relay",
      "/sentinel",
      "/settings",
      "/wallet",
    ]);
  });
});
