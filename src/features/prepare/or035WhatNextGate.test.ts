/**
 * OR-035 What-next gate — measured next-desk strip from open finding codes only.
 * No invented readiness scores. Cites Creative OS sequence after OR-034.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { nextDeskStepsFromFindings } from "@/features/prepare/nextDeskFromFindings";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-035 What next from findings", () => {
  it("ships nextDeskFromFindings helper with code→desk maps", () => {
    const src = read("src/features/prepare/nextDeskFromFindings.ts");
    expect(src).toContain("shipAutoFixForCode");
    expect(src).toContain("/tools/correct?op=");
    expect(src).toContain("/tools/art-check");
    expect(src).toContain("/tools/metadata");
    expect(src).toContain("/tools/translate");
    expect(src).not.toMatch(/readinessScore|summarizeReadiness/);
    expect(src).toContain("No invented readiness scores");
  });

  it("wires WhatNextDesks on Home and Analyzer; FindingReportCard CTA", () => {
    const home = read("src/components/home/ArtistHome.tsx");
    const analyzer = read("src/features/prepare/ReleasesPage.tsx");
    const card = read("src/features/prepare/FindingReportCard.tsx");
    const ui = read("src/features/prepare/WhatNextDesks.tsx");
    expect(ui).toContain('data-testid="what-next-desks"');
    expect(home).toContain("WhatNextDesks");
    expect(home).toContain("nextDeskStepsFromFindings");
    expect(home).toContain('data-testid="ops-home-what-next"');
    expect(analyzer).toContain("WhatNextDesks");
    expect(analyzer).toContain("nextDeskStepsFromFindings");
    expect(card).toContain("nextDeskForFinding");
    expect(card).toContain("finding-next-desk-");
  });

  it("does not invent scores in the helper output", () => {
    const steps = nextDeskStepsFromFindings([
      { code: "AUDIO_DC_OFFSET", severity: "blocking", status: "open" },
    ]);
    expect(steps[0]).toMatchObject({
      desk: "correct",
      code: "AUDIO_DC_OFFSET",
    });
    expect(JSON.stringify(steps)).not.toMatch(/score|percent|readiness/i);
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or035WhatNext");
  });
});
