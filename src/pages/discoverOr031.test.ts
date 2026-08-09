import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../..");

/** OR-031 — release-centered discovery; romantic matching permanently out of scope. */
describe("OR-031 discovery", () => {
  it("ships release/emerging filters without romantic matching language", () => {
    const page = readFileSync(path.join(ROOT, "src/pages/DiscoverPage.tsx"), "utf8");
    expect(page).toContain("discover-filter-${id}");
    expect(page).toContain('"releases"');
    expect(page).toContain('"emerging"');
    expect(page).toContain("isReleaseCentered");
    expect(page.toLowerCase()).not.toMatch(/\b(swipe\s*deck|tinder|meetup|romance)\b/);
    expect(page).toContain("Release-centered");
  });
});
