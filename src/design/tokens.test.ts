import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import {
  ACCENT_WASH,
  COLOR,
  EASE,
  FONT,
  MIN_TOUCH_TARGET_PX,
  MOTION_MS,
  PRODUCT_ACCENT_RGB,
  PRODUCT_LABEL,
  RADIUS,
  SHADOW,
  SHELL,
  SIZE,
  SPACE,
  STATUS_COLOR,
  SUITE_PRODUCTS,
  TEXT,
  Z_INDEX,
  COLOR_V2,
  MOTION_V2,
  SHADOW_V2,
  GLASS_VIBRANT,
  ACCENT_WASH_V2,
} from "@/design/tokens";
import {
  durationToMs,
  findCrossFileDuplicates,
  parseTokenDeclarations,
  referencedVars,
  tokenValue,
} from "@/design/tokenParity";
import { matchSuiteProduct, suiteNavRoutes } from "@/app/routeManifest";
import { getProviderHealth, getProviderHealthById } from "@/platform/providerHealth";
import { canUsePaidProvider, defaultCostPolicy } from "@/platform/costs";

const ROOT = path.resolve(__dirname, "../..");
const FILES = ["src/design/tokens.css", "src/index.css", "src/design/nexus.css"] as const;

const DECLARATIONS = FILES.flatMap((rel) =>
  parseTokenDeclarations(readFileSync(path.join(ROOT, rel), "utf8"), rel)
);

describe("token declarations are single-sourced", () => {
  it("declares every token in exactly one file", () => {
    const duplicates = findCrossFileDuplicates(DECLARATIONS);
    // A duplicate means the later file silently wins. That is how the v2 shadow
    // ramp was overridden and unused for several releases.
    expect(
      duplicates.map((d) => `${d.name} declared in ${d.files.join(" and ")}`)
    ).toEqual([]);
  });

  it("declares the elevation ramp only in the token layer", () => {
    for (const name of ["--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-focus"]) {
      const files = DECLARATIONS.filter((d) => d.name === name).map((d) => d.file);
      expect(files).toEqual(["src/design/tokens.css"]);
    }
  });

  it("declares motion and easing only in the token layer", () => {
    for (const name of ["--motion-fast", "--motion-base", "--motion-slow", "--ease-standard"]) {
      const files = [...new Set(DECLARATIONS.filter((d) => d.name === name).map((d) => d.file))];
      expect(files).toEqual(["src/design/tokens.css"]);
    }
  });

  it("keeps the v2 elevation ramp reachable", () => {
    // Regression guard for the override bug: the md shadow must be the v2 value.
    expect(tokenValue(DECLARATIONS, "--shadow-md")).toContain("10px 28px");
  });
});

describe("one surface language", () => {
  // The product used to ship three unrelated translucent systems: forge glass
  // (near-black), `.glass` (blue-grey at 0.48 alpha) and glass-vibrant. Chrome
  // and content therefore looked like two different applications. These guards
  // keep every translucent surface resolving to the same tokens.
  const SURFACE_TOKENS = [
    "--surface-fill",
    "--surface-fill-strong",
    "--surface-border",
    "--surface-border-strong",
    "--surface-specular",
    "--surface-blur",
    "--surface-saturate",
  ] as const;

  it("declares the surface tokens only in the token layer", () => {
    for (const name of SURFACE_TOKENS) {
      const files = [...new Set(DECLARATIONS.filter((d) => d.name === name).map((d) => d.file))];
      expect(files, name).toEqual(["src/design/tokens.css"]);
    }
  });

  it("routes the legacy surface families through the shared tokens", () => {
    const aliases: Array<[string, string]> = [
      ["--mat-fill", "--surface-fill"],
      ["--mat-fill-strong", "--surface-fill-strong"],
      ["--glass-vibrant-fill", "--surface-fill"],
      ["--glass-vibrant-fill-strong", "--surface-fill-strong"],
      ["--glass-vibrant-border", "--surface-border"],
    ];
    for (const [alias, target] of aliases) {
      expect(referencedVars(tokenValue(DECLARATIONS, alias) ?? ""), alias).toContain(target);
    }
  });

  it("has no blue-tinted surface fills left in the stylesheets", () => {
    // Each literal below was a distinct surface system's base fill.
    const legacyFills = [
      "rgba(24, 32, 52, 0.48)",
      "rgba(22, 30, 48, 0.55)",
      "rgba(22, 30, 48, 0.52)",
      "rgba(18, 24, 40, 0.72)",
      "rgba(18, 40, 72, 0.45)",
      "rgba(20, 48, 88, 0.28)",
      "rgba(180, 210, 255, 0.08)",
      "rgba(16, 28, 48, 0.45)",
    ];
    const offenders: string[] = [];
    for (const rel of FILES) {
      const css = readFileSync(path.join(ROOT, rel), "utf8");
      for (const fill of legacyFills) if (css.includes(fill)) offenders.push(`${rel}: ${fill}`);
    }
    expect(offenders).toEqual([]);
  });
});

describe("TypeScript mirror matches CSS", () => {
  it("every mirrored var referenced by the mirror is actually declared", () => {
    const declared = new Set(DECLARATIONS.map((d) => d.name));
    const mirrors: Record<string, string> = {
      ...COLOR,
      ...STATUS_COLOR,
      ...SPACE,
      ...RADIUS,
      ...SIZE,
      ...FONT,
      ...TEXT,
      ...SHELL,
      ...EASE,
      ...SHADOW,
      ...SHADOW_V2,
      ...GLASS_VIBRANT,
    };
    const missing: string[] = [];
    for (const [key, value] of Object.entries(mirrors)) {
      for (const ref of referencedVars(String(value))) {
        if (!declared.has(ref)) missing.push(`${key} → ${ref}`);
      }
    }
    expect(missing).toEqual([]);
  });

  it("resolves the accent ramp to declared variables", () => {
    const declared = new Set(DECLARATIONS.map((d) => d.name));
    for (const step of COLOR_V2.accentRamp) {
      for (const ref of referencedVars(step)) expect(declared.has(ref)).toBe(true);
    }
  });

  it("matches motion durations to the CSS millisecond values", () => {
    const pairs: Array<[keyof typeof MOTION_MS, string]> = [
      ["fast", "--motion-fast"],
      ["base", "--motion-base"],
      ["slow", "--motion-slow"],
    ];
    for (const [key, varName] of pairs) {
      const css = tokenValue(DECLARATIONS, varName);
      expect(css, `${varName} must be declared`).not.toBeNull();
      expect(durationToMs(css!)).toBe(MOTION_MS[key]);
    }
  });

  it("matches z-index values to the CSS layer variables", () => {
    const pairs: Array<[keyof typeof Z_INDEX, string]> = [
      ["stage", "--z-stage"],
      ["sticky", "--z-sticky"],
      ["dock", "--z-dock"],
      ["overlay", "--z-overlay"],
      ["modal", "--z-modal"],
      ["toast", "--z-toast"],
      ["max", "--z-max"],
    ];
    for (const [key, varName] of pairs) {
      expect(Number(tokenValue(DECLARATIONS, varName))).toBe(Z_INDEX[key]);
    }
  });

  it("keeps MOTION_MS and MOTION_V2 in agreement", () => {
    expect(MOTION_V2.fast).toBe(MOTION_MS.fast);
    expect(MOTION_V2.normal).toBe(MOTION_MS.base);
    expect(MOTION_V2.slow).toBe(MOTION_MS.slow);
  });
});

describe("layering", () => {
  it("orders dock below overlay below modal below toast", () => {
    expect(Z_INDEX.dock).toBeLessThan(Z_INDEX.overlay);
    expect(Z_INDEX.overlay).toBeLessThan(Z_INDEX.modal);
    expect(Z_INDEX.modal).toBeLessThan(Z_INDEX.toast);
    expect(Z_INDEX.toast).toBeLessThanOrEqual(Z_INDEX.max);
  });
});

describe("products", () => {
  it("defines an rgb accent and a label for every product", () => {
    for (const id of SUITE_PRODUCTS) {
      expect(PRODUCT_ACCENT_RGB[id].split(" ")).toHaveLength(3);
      expect(PRODUCT_LABEL[id].length).toBeGreaterThan(1);
    }
  });

  it("declares a matching --accent-* variable for every product that themes chrome", () => {
    const declared = new Set(DECLARATIONS.map((d) => d.name));
    // vdock uses --vdock-accent rather than the --accent-* namespace.
    for (const id of SUITE_PRODUCTS.filter((p) => p !== "vdock")) {
      expect(declared.has(`--accent-${id}`), `--accent-${id}`).toBe(true);
    }
    expect(declared.has("--vdock-accent")).toBe(true);
  });
});

describe("scales", () => {
  it("exposes a complete spacing, radius and type scale", () => {
    expect(Object.keys(SPACE)).toHaveLength(9);
    expect(Object.keys(RADIUS)).toEqual(["sm", "md", "lg", "xl", "full"]);
    expect(Object.keys(TEXT)).toEqual(["xs", "sm", "base", "lg", "xl", "2xl"]);
  });

  it("states a touch target floor that meets platform guidance", () => {
    expect(MIN_TOUCH_TARGET_PX).toBeGreaterThanOrEqual(44);
  });

  it("exposes accent washes bound to product accents", () => {
    expect(ACCENT_WASH.market).toContain("accent-market");
    expect(ACCENT_WASH.coverlab).toContain("accent-coverlab");
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
