/**
 * M10 Wave R redesign gate — foundation (R0) + shell chrome (R1).
 * Cites Masterplan §10 M10 (partial): cohesive shell identity before Store commerce.
 * Full M10 publish/discover/support gate remains open until later waves.
 * Law 5: VDock disclosure / dry-playback contracts must remain intact.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUITE_APP_ACCENT_RGB, suiteAppAccentRgb } from "@/design/suiteAppAccents";
import { PRODUCT_ACCENT_RGB } from "@/design/tokens";
import { SUITE_APPS, type SuiteAppId } from "@/shell/suiteApps";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("M10 suite redesign gate (Wave R0)", () => {
  it("declares a cool accent for every suite app id", () => {
    const ids = SUITE_APPS.map((a) => a.id);
    for (const id of ids) {
      expect(SUITE_APP_ACCENT_RGB[id as SuiteAppId]).toMatch(/^\d{1,3} \d{1,3} \d{1,3}$/);
    }
    // No purple / magenta SaaS channels in the suite-app map
    const joined = Object.values(SUITE_APP_ACCENT_RGB).join("|");
    expect(joined).not.toContain("168 85 247");
    expect(joined).not.toContain("217 70 239");
    expect(joined).not.toContain("99 102 241");
  });

  it("keeps product market/credits/coverlab accents off purple", () => {
    expect(PRODUCT_ACCENT_RGB.market).toBe("34 211 238");
    expect(PRODUCT_ACCENT_RGB.credits).toBe("56 189 248");
    expect(PRODUCT_ACCENT_RGB.coverlab).toBe("94 234 212");
  });

  it("wires SuiteShell data-suite-app and SuiteStage mount", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    const stage = read("src/shell/SuiteStage.tsx");
    expect(shell).toContain("data-suite-app");
    expect(shell).toContain("useActiveSuiteAppId");
    expect(shell).toContain("SuiteStage");
    expect(stage).toContain("data-testid=\"suite-stage\"");
  });

  it("loads suite-app-accents.css from the design layer", () => {
    const indexCss = read("src/index.css");
    const accentsCss = read("src/design/suite-app-accents.css");
    expect(indexCss).toContain('suite-app-accents.css');
    expect(accentsCss).toContain('--app-accent-rgb');
    expect(accentsCss).toContain('[data-suite-app="correct"]');
    expect(accentsCss).toContain('[data-suite-app="home"]');
  });

  it("exposes type scale tokens for the redesign", () => {
    const tokens = read("src/design/tokens.css");
    expect(tokens).toContain("--type-eyebrow");
    expect(tokens).toContain("--type-display");
    expect(tokens).toContain("--type-body");
  });

  it("suiteAppAccentRgb falls back to home", () => {
    expect(suiteAppAccentRgb(null)).toBe(SUITE_APP_ACCENT_RGB.home);
    expect(suiteAppAccentRgb("correct")).toBe(SUITE_APP_ACCENT_RGB.correct);
  });

  it("Wave R1 loads suite-shell-chrome and ops chrome markers", () => {
    const indexCss = read("src/index.css");
    const chromeCss = read("src/design/suite-shell-chrome.css");
    const primary = read("src/shell/PrimaryRail.tsx");
    const appRail = read("src/shell/SuiteAppRail.tsx");
    const appBar = read("src/components/shell/ContextualAppBar.tsx");
    const vdock = read("src/components/vdock/VDock.tsx");
    expect(indexCss).toContain("suite-shell-chrome.css");
    expect(chromeCss).toContain(".suite-rail--ops");
    expect(chromeCss).toContain(".app-bar--ops");
    expect(chromeCss).toContain(".vdock-ops");
    expect(primary).toContain("suite-rail--ops");
    expect(primary).toContain("Music ops");
    expect(appRail).toContain("suite-app-rail--ops");
    expect(appBar).toContain("app-bar--ops");
    expect(vdock).toContain("vdock-ops");
    // Law 5 — disclosure / dry contract hooks stay on the dock
    expect(vdock).toContain("data-vdock");
    expect(vdock).toContain("MusicDockPlayer");
  });
});
