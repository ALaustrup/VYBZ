/**
 * OR-039 Market discovery gate — iTunes-style browse/listen over measured packs.
 * Law 1: no invented inventory, play counts, or DSP-delivery claims.
 * Preview play only when preview_path resolves to a public URL.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { filterMarketPacks, packHasPreview } from "@/features/storefront/marketBrowse";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-039 Market discovery", () => {
  it("ships search, genre chips, and preview play wired to measured packs", () => {
    const market = read("src/pages/MarketPage.tsx");
    const browse = read("src/features/storefront/marketBrowse.ts");
    expect(market).toContain("listPublishedStorefrontPacks");
    expect(market).toContain("filterMarketPacks");
    expect(market).toContain('data-testid="market-browse-controls"');
    expect(market).toContain('data-testid="market-search"');
    expect(market).toContain('data-testid="market-genre-chips"');
    expect(market).toContain("playTrack");
    expect(market).toContain("previewPublicUrl");
    expect(market).toContain("packHasPreview");
    expect(market).toContain('data-testid="market-discover-link"');
    expect(browse).toContain("filterMarketPacks");
    expect(browse).toContain("Never invent catalog rows");
  });

  it("keeps empty-state honesty and forbids DSP claims", () => {
    const market = read("src/pages/MarketPage.tsx");
    expect(market).toContain("market-browse-empty");
    expect(market).toMatch(/does not invent listings|Filters never invent/i);
    expect(market).not.toMatch(/distribute to Spotify|DSP delivery|guaranteed placement/i);
  });

  it("filter helpers never invent rows", () => {
    expect(
      filterMarketPacks([], { query: "anything" }),
    ).toEqual([]);
    expect(packHasPreview({ preview_path: null } as never)).toBe(false);
  });

  it("authorises OR-039 gate in AGENTS", () => {
    const agents = read("AGENTS.md");
    expect(agents).toContain("OR-039");
    expect(agents).toContain("or039MarketDiscoveryGate");
  });
});
