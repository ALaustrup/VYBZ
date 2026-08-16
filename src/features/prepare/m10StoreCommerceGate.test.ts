/**
 * M10 Store commerce gate — wedge 1 (Market browse).
 * Cites Masterplan §10 M10 (partial): listeners can discover published packs.
 * Full publish / support / release-preview exit remains open for later wedges.
 * Law 1: browse uses measured storefront_packs_public rows only — no fake inventory.
 * No DSP-delivery claims on Market / storefront surfaces.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("M10 Store commerce gate (Market browse)", () => {
  it("wires /market to MarketPage when storefront is on", () => {
    const app = read("src/App.tsx");
    const market = read("src/pages/MarketPage.tsx");
    expect(app).toContain('path="/market"');
    expect(app).toContain("MarketPage");
    expect(app).not.toMatch(/path="\/market"[^>]*>[\s\S]{0,80}Navigate to="\/tools\/packs"/);
    expect(market).toContain('testId="market-browse"');
    expect(market).toContain("listPublishedStorefrontPacks");
    expect(market).toContain("market-browse-empty");
  });

  it("lists published packs from storefront_packs_public (no zip_path)", () => {
    const api = read("src/lib/api.ts");
    expect(api).toContain("listPublishedStorefrontPacks");
    expect(api).toContain("storefront_packs_public");
    const fn = api.slice(api.indexOf("listPublishedStorefrontPacks"));
    const body = fn.slice(0, fn.indexOf("export async function", 1) === -1 ? 800 : fn.indexOf("export async function", 1));
    expect(body).not.toContain("zip_path");
  });

  it("keeps seller dashboard and public pack checkout paths intact", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("StorefrontDashboardPage");
    expect(app).toContain('path="/tools/packs"');
    expect(app).toContain("StorefrontPackPage");
    expect(app).toContain('path="/pack/:slug"');
  });

  it("points suite Store rail at Market browse", () => {
    const apps = read("src/shell/suiteApps.ts");
    expect(apps).toMatch(/id:\s*"store"[\s\S]{0,120}path:\s*"\/market"/);
  });

  it("separates cosmetics /store from Market storefront", () => {
    const truth = read("src/app/routeTruth.ts");
    expect(truth).toContain('{ path: "/store", title: "Store"');
    expect(truth).toContain('{ path: "/market", title: "Shop"');
    expect(truth).toMatch(/keywords: \["credits", "cosmetics"/);
  });

  it("forbids DSP-delivery claims on Market / storefront pages", () => {
    const market = read("src/pages/MarketPage.tsx");
    const dash = read("src/pages/StorefrontDashboardPage.tsx");
    const pack = read("src/pages/StorefrontPackPage.tsx");
    for (const src of [market, dash, pack]) {
      expect(src).not.toMatch(/distribute to Spotify|DSP delivery|guaranteed placement/i);
    }
    expect(market).toMatch(/does not invent listings|not invent|does not.*DSP/i);
  });

  it("exposes signed-out Market browse via public storefront shell", () => {
    const app = read("src/App.tsx");
    expect(app).toContain("isPublicStorefront");
    expect(app).toContain('path="/market" element={<MarketPage publicShell />}');
  });
});
