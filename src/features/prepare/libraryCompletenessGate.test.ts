/**
 * Library completeness gate.
 *
 * The media library previously loaded a fixed first page of drops and then
 * displayed that page's length as the library total, so a producer with more
 * tracks than the page size was shown a truncated library and a false count
 * (Law 1). The library must page until exhausted and state a measured total.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("library completeness", () => {
  it("exposes an offset-paged dropsBy and an exact count", () => {
    const api = read("src/lib/api.ts");
    expect(api).toMatch(/export async function countDropsBy\(/);
    expect(api).toContain('count: "exact"');
    expect(api).toMatch(/export async function dropsBy\(authorId: string, limit = \d+, offset = 0\)/);
    // Range paging, not a bare limit that silently truncates.
    expect(api).toContain("range(offset, offset + limit - 1)");
  });

  it("pages the whole library instead of one capped request", () => {
    const page = read("src/pages/LibraryPage.tsx");
    expect(page).toContain("countDropsBy");
    expect(page).toContain("PAGE_SIZE");
    // Keeps requesting further pages while the measured total exceeds what is loaded.
    expect(page).toMatch(/offset \+= PAGE_SIZE/);
    expect(page).not.toMatch(/api\.dropsBy\(userId, 80\)/);
  });

  it("reports a measured total rather than the loaded page length", () => {
    const page = read("src/pages/LibraryPage.tsx");
    expect(page).toContain("trackTotal");
    expect(page).not.toMatch(/Tracks \(\{drops\.length\}\)/);
  });
});
