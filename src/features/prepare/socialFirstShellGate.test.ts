/**
 * Social-first shell gate.
 *
 * VYBZ leads with menu-only top chrome. Search, +, Chat, Alerts, Me live
 * in the drawer on every viewport. PrimaryRail stays in the tree, unmounted.
 * SuiteAppRail stays frozen.
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
  it("keeps PrimaryRail in the tree and SuiteAppRail frozen", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    expect(shell).not.toMatch(/<SuiteAppRail\s*\/>/);
    expect(shell).not.toMatch(/<SuiteAppRailMobile\s*\/>/);
    expect(shell).not.toMatch(/<PrimaryRail\s*\/>/);
    expect(shell).toContain("<ShellNavDrawer");
  });

  it("mounts the tools launcher in the drawer", () => {
    const chrome = read("src/components/shell/DrawerChrome.tsx");
    const bar = read("src/components/shell/ContextualAppBar.tsx");
    expect(chrome).toContain("ToolsLauncherButton");
    expect(chrome).toContain("@/shell/ToolsLauncher");
    expect(bar).toContain("openShellNavDrawer");
  });

  it("launcher offers every visible tool except the social home", () => {
    const ids = toolsLauncherApps().map((a) => a.id);
    expect(ids).not.toContain("home");
    const expected = SUITE_APPS.filter((a) => a.id !== "home" && (a.visible ? a.visible() : true));
    expect(ids).toHaveLength(expected.length);
    expect(ids).not.toContain("analyzer");
    expect(ids).toContain("library");
  });

  it("preserves SuiteAppRail in the tree rather than deleting it", () => {
    expect(existsSync(path.join(ROOT, "src/shell/SuiteAppRail.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/shell/PrimaryRail.tsx"))).toBe(true);
    expect(read("src/shell/SuiteShell.tsx")).not.toMatch(/^import\s[^\n]*SuiteAppRail/m);
    expect(read("src/shell/SuiteShell.tsx")).not.toMatch(/^import\s[^\n]*PrimaryRail/m);
    expect(read("src/shell/ShellNavDrawer.tsx")).toContain("PrimaryRailNav");
  });

  it("highlights Home on the signed-in social landing in VDock and PrimaryRail", () => {
    const rail = read("src/shell/PrimaryRail.tsx");
    const strip = read("src/components/vdock/VDockSocialStrip.tsx");
    expect(rail).toContain("homeActive");
    expect(rail).toContain('location.pathname === "/"');
    expect(strip).toContain("homeActive");
    expect(strip).toContain('pathname === "/"');
    expect(strip).toContain('label="Home"');
    expect(strip).not.toContain("/notifications");
    expect(strip).not.toContain('label="Alerts"');
  });
});
