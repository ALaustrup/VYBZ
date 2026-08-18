import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Who's live panel", () => {
  it("lists current hosts on Live, hub, and the live dash", () => {
    const panel = read("src/features/live/WhosLivePanel.tsx");
    expect(panel).toContain("Who's live");
    expect(panel).toContain("Artists and producers on now");
    expect(panel).toContain("listLiveSessions");
    expect(panel).toContain("subscribeLiveSessions");
    expect(panel).toContain("whos-live-host");
    expect(panel).toContain("displayName");
    expect(read("src/pages/LivePage.tsx")).toContain("WhosLivePanel");
    expect(read("src/components/home/ArtistHome.tsx")).toContain("WhosLivePanel");
    expect(read("src/components/dashboard/DashLivePanel.tsx")).toContain("WhosLivePanel");
  });
});
