import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { navItems } from "@/shell/navModel";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("3-panel live homepage", () => {
  it("is the default /live surface and hides old apps from default nav", () => {
    expect(existsSync(path.join(ROOT, "src/pages/LiveHomePage.tsx"))).toBe(true);
    const home = read("src/pages/LiveHomePage.tsx");
    expect(home).toContain("live-home");
    expect(home).toContain("live-home-left");
    expect(home).toContain("live-home-center");
    expect(home).toContain("live-home-right");
    expect(home).toContain("TipButton");
    expect(home).toContain("WhosLivePanel");
    expect(home).not.toMatch(/Spotify|Twitch|YouTube/);
    const linked = navItems().map((i) => i.path);
    expect(linked).toEqual(["/live"]);
    expect(read("src/pages/LivePage.tsx")).toContain("LiveHomePage");
    expect(existsSync(path.join(ROOT, "src/shell/ToolsLauncher.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/shell/SuiteAppRail.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/features/packs/PackMakerPage.tsx"))).toBe(true);
  });
});
