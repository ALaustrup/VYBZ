import { describe, expect, it } from "vitest";
import {
  PRODUCT_ACCENT_RGB,
  SUITE_PRODUCTS,
  Z_INDEX,
  MOTION_MS,
  SHADOW,
  ACCENT_WASH,
  COLOR_V2,
  MOTION_V2,
  SHADOW_V2,
  GLASS_VIBRANT,
  ACCENT_WASH_V2,
} from "@/design/tokens";
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

describe("design tokens v2", () => {
  it("exposes an 8-step accent ramp", () => {
    expect(COLOR_V2.accentRamp).toHaveLength(8);
    expect(COLOR_V2.accentRamp[3]).toBe("var(--accent-4)");
  });

  it("aligns motion.v2 to 120 / 240 / 360", () => {
    expect(MOTION_V2.fast).toBe(120);
    expect(MOTION_V2.normal).toBe(240);
    expect(MOTION_V2.base).toBe(240);
    expect(MOTION_V2.slow).toBe(360);
  });

  it("exposes glass vibrant and shadow glow tokens", () => {
    expect(GLASS_VIBRANT.className).toBe("glass-vibrant");
    expect(SHADOW_V2.glow).toContain("--shadow-glow");
    expect(ACCENT_WASH_V2.cyan).toContain("accent-rgb");
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
