import { describe, expect, it } from "vitest";
import { PRODUCT_ACCENT_RGB, SUITE_PRODUCTS, Z_INDEX, MOTION_MS, SHADOW, ACCENT_WASH } from "@/design/tokens";
import { matchSuiteProduct, suiteNavRoutes } from "@/app/routeManifest";
import { getProviderHealth, getProviderHealthById } from "@/platform/providerHealth";
import { canUsePaidProvider, defaultCostPolicy } from "@/platform/costs";

describe("design tokens", () => {
  it("defines an accent for every suite product", () => {
    for (const id of SUITE_PRODUCTS) {
      expect(PRODUCT_ACCENT_RGB[id].split(" ")).toHaveLength(3);
    }
  });

  it("keeps dock below modal in z-index", () => {
    expect(Z_INDEX.dock).toBeLessThan(Z_INDEX.modal);
    expect(Z_INDEX.toast).toBeGreaterThan(Z_INDEX.modal);
  });

  it("exposes motion, shadow, and accent wash polish tokens", () => {
    expect(MOTION_MS.base).toBeGreaterThan(MOTION_MS.fast);
    expect(SHADOW.focus).toContain("--shadow-focus");
    expect(ACCENT_WASH.market).toContain("accent-market");
    expect(ACCENT_WASH.coverlab).toContain("accent-coverlab");
  });
});

describe("routeManifest", () => {
  it("maps legacy projects to studio product", () => {
    expect(matchSuiteProduct("/projects")).toBe("studio");
    expect(matchSuiteProduct("/studio")).toBe("studio");
  });

  it("exposes primary nav routes", () => {
    const nav = suiteNavRoutes();
    expect(nav.some((r) => r.path === "/")).toBe(true);
    expect(nav.some((r) => r.path === "/credits")).toBe(true);
  });
});

describe("provider health", () => {
  it("keeps Bunny disabled", () => {
    const bunny = getProviderHealthById("bunny");
    expect(bunny?.mode).toBe("disabled");
  });

  it("lists production supabase", () => {
    expect(getProviderHealth().some((p) => p.id === "supabase" && p.mode === "production")).toBe(
      true,
    );
  });
});

describe("cost policy", () => {
  it("blocks paid providers without reservation by default", () => {
    const policy = defaultCostPolicy();
    expect(canUsePaidProvider("fal", policy)).toBe(false);
  });
});
