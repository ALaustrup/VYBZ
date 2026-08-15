/**
 * Living Mix gate — catalog session over the media library.
 *
 * Social-first: lives inside Library, not a new suite-app rail tile.
 * Law 1: picks cite rules; missing BPM/duration/plays are unused, never invented.
 * Law 4: no multi-human co-performance, no visitors dropping stems into a session.
 * Law 5: VDock stays dry — planner only splices the queue.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("Living Mix catalog session", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("livingMix");
  });

  it("is reachable from Library without a new suite-app id", () => {
    const apps = read("src/shell/suiteApps.ts");
    expect(apps).not.toMatch(/living-mix/);
    expect(apps).toContain('id: "library"');

    const page = read("src/pages/LibraryPage.tsx");
    expect(page).toContain("library-tab-mixes");
    expect(page).toContain("MixesLibrary");

    const app = read("src/App.tsx");
    expect(app).toContain('path="/library/mix"');
    expect(app).toContain("LivingMixPage");
  });

  it("plans from a seed and never fabricates measurements", () => {
    const engine = read("src/features/livingMix/engine.ts");
    expect(engine).toContain("sessionSeed");
    expect(engine).toContain("planSession");
    expect(engine).toContain("durationSec: number | null");
    expect(engine).toContain("plays: number | null");
    expect(engine).toContain("bpm: number | null");
    expect(engine).toContain("they are never invented");
    expect(engine).toContain("not an AI producer");

    const ui = read("src/features/livingMix/LivingMixPage.tsx");
    expect(ui).toContain("living-mix-honesty");
    expect(ui).toContain("not a mood we measured");
    expect(ui).not.toMatch(/AI agent|collaborat(e|ive) jam|drop in their own/i);
  });

  it("plays through the dry VDock queue rather than a mixer graph", () => {
    const bus = read("src/lib/audioBus.ts");
    expect(bus).toContain("export function spliceUpcoming");
    expect(bus).toContain("does not touch the dry play element graph");

    const ui = read("src/features/livingMix/LivingMixPage.tsx");
    expect(ui).toContain("loadQueue");
    expect(ui).toContain("spliceUpcoming");
    expect(ui).not.toMatch(/createMediaElementSource|OfflineAudioContext|DynamicsCompressor/);
  });

  it("hands stem work to Stem Maker instead of auto-separating", () => {
    const ui = read("src/features/livingMix/LivingMixPage.tsx");
    expect(ui).toContain('navigate("/tools/stems")');
    expect(ui).toContain("not auto-generated");
  });
});
