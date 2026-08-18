/**
 * Social-first shell gate.
 *
 * VYBZ leads with the social surfaces for music, sound and audio creators. The
 * production tools are additive: they live behind one launcher menu instead of
 * owning permanent shell chrome. Nothing is deleted — SuiteAppRail stays in the
 * tree, imported by nothing, so the redesign is reversible (AGENTS Preservation).
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { SUITE_APPS } from "@/shell/suiteApps";
import { toolsLauncherApps } from "@/shell/ToolsLauncher";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("social-first shell", () => {
  it("keeps tools behind a launcher rather than permanent rail chrome", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    expect(shell).not.toMatch(/<SuiteAppRail\s*\/>/);
    expect(shell).not.toMatch(/<SuiteAppRailMobile\s*\/>/);
  });

  it("keeps the tools launcher in the tree, not in default chrome", () => {
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    expect(bar).not.toContain("ToolsLauncherButton");
    expect(existsSync(path.join(ROOT, "src/shell/ToolsLauncher.tsx"))).toBe(true);
  });

  it("launcher offers every visible tool except the social home", () => {
    const ids = toolsLauncherApps().map((a) => a.id);
    expect(ids).not.toContain("home");
    // Every non-home app that is visible today remains reachable from the menu.
    const expected = SUITE_APPS.filter((a) => a.id !== "home" && (a.visible ? a.visible() : true));
    expect(ids).toHaveLength(expected.length);
    // Analyzer used to be here. It is now summoned from the track it analyses,
    // so the launcher carries only the places you browse to.
    expect(ids).not.toContain("analyzer");
    expect(ids).toContain("library");
  });

  it("preserves the previous rail in the tree rather than deleting it", () => {
    expect(existsSync(path.join(ROOT, "src/shell/SuiteAppRail.tsx"))).toBe(true);
    // Frozen code must not be imported by the shell (a prose mention is fine).
    expect(read("src/shell/SuiteShell.tsx")).not.toMatch(
      /^import\s[^\n]*SuiteAppRail/m,
    );
  });
});
