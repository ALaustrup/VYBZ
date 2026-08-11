/**
 * VDock visuals gate.
 *
 * Clicking the dock opens visual options anchored bottom-right, and the dock and
 * the expanded player must render the same visual. They previously diverged: the
 * dock drew DockVisualizer from the mode store while the expanded player drew only
 * TrackVisualizer from the track seed, so the picked mode was invisible full-screen.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("dock visuals", () => {
  it("opens options from the dock surface", () => {
    const dock = read("src/components/vdock/VDock.tsx");
    expect(dock).toContain("DockVisualOptions");
    expect(dock).toContain('data-testid="dock-visual-surface"');
    expect(dock).toContain('aria-haspopup="dialog"');
  });

  it("anchors the options panel bottom-right, clear of the dock", () => {
    const panel = read("src/components/vdock/DockVisualOptions.tsx");
    expect(panel).toMatch(/fixed right-3/);
    expect(panel).toContain("var(--dock-reserve");
    // Every mode in the store is offered, so the panel cannot drift from it.
    expect(panel).toContain("VDOCK_VIZ_MODES");
    expect(panel).toContain("setVdockVizMode");
  });

  it("renders the same visualizer in the dock and the expanded player", () => {
    const dock = read("src/components/vdock/VDock.tsx");
    const player = read("src/components/GlobalPlayer.tsx");
    expect(dock).toContain("<DockVisualizer");
    expect(player).toContain("<DockVisualizer");
    expect(player).toContain("@/components/vdock/DockVisualizer");
  });

  it("keeps one source of truth for the chosen mode", () => {
    const visualizer = read("src/components/vdock/DockVisualizer.tsx");
    const panel = read("src/components/vdock/DockVisualOptions.tsx");
    for (const f of [visualizer, panel]) {
      expect(f).toContain("subscribeVdockVizMode");
      expect(f).toContain("getVdockVizMode");
    }
  });
});
