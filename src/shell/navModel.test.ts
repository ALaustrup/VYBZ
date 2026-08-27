import { describe, expect, it } from "vitest";
import { isPlaceholderPath, WORKING_DESTINATIONS } from "@/app/routeTruth";
import { HOME_ITEM, navGroups, navItems } from "@/shell/navModel";

describe("navModel truthful destinations", () => {
  it("only offers working, non-placeholder routes", () => {
    const flags = { storefront: true };
    for (const item of navItems()) {
      expect(WORKING_DESTINATIONS.some((d) => d.path === item.path)).toBe(true);
      expect(isPlaceholderPath(item.path, flags)).toBe(false);
    }
  });

  it("keeps Me at signed-in home without Explore or Settings placeholders", () => {
    expect(HOME_ITEM.path).toBe("/");
    expect(HOME_ITEM.label).toBe("Home");
    const labels = navGroups().flatMap((g) => g.items.map((i) => i.label));
    expect(labels).not.toContain("Explore");
    expect(labels).not.toContain("Settings");
    expect(labels).toEqual(["Messages", "Live", "Library"]);
  });
});
