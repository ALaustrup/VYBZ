/**
 * OR-034 Correct desk gate — IA rename, URL op sync, AutoFix→CorrectOp map.
 * Follows the OR-032 working set in the Creative OS sequence.
 * No DSP-delivery claims; no new correction algorithms.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { resolveCorrectOpFromQuery } from "@/features/correction/correctOps";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("OR-034 Correct desk", () => {
  it("exports CorrectPage and wires /tools/correct", () => {
    const page = read("src/features/correction/CorrectPage.tsx");
    const app = read("src/App.tsx");
    expect(page).toContain("export function CorrectPage");
    expect(page).toContain('testId="correct-desk"');
    expect(page).toContain("setSearchParams");
    expect(page).toContain('nextParams.set("op", next)');
    expect(page).toContain("resolveCorrectOpFromQuery");
    expect(page).toContain("correct-desk-copy");
    expect(page).toContain("correct-workspace-source");
    expect(page).toContain("Analyzer Fix");
    expect(page).not.toMatch(/distribute to Spotify|guaranteed placement/i);
    expect(page).toMatch(/does not invent distributor|not invent/i);
    expect(app).toContain("CorrectPage");
    expect(app).toContain('path="/tools/correct"');
    expect(app).toContain("<CorrectPage");
  });

  it("maps AutoFix fine ops onto Correct chips", () => {
    expect(resolveCorrectOpFromQuery("widthWiden")).toBe("width");
    expect(resolveCorrectOpFromQuery("widthNarrow")).toBe("width");
    expect(resolveCorrectOpFromQuery("eqCutBass")).toBe("eq");
    expect(resolveCorrectOpFromQuery("eqCutBright")).toBe("eq");
    expect(resolveCorrectOpFromQuery("eqBoostLow")).toBe("eq");
    expect(resolveCorrectOpFromQuery("level")).toBe("loudness");
    expect(resolveCorrectOpFromQuery("loudness")).toBe("loudness");
    expect(resolveCorrectOpFromQuery("dc")).toBe("dc");
    expect(resolveCorrectOpFromQuery("unknown-op")).toBe("dc");
    expect(resolveCorrectOpFromQuery(null)).toBe("dc");

    const ops = read("src/features/correction/correctOps.ts");
    expect(ops).toContain("widthWiden");
    expect(ops).toContain("eqCutBass");
    expect(ops).toContain("resolveCorrectOpFromQuery");
  });

  it("keeps a thin DcOffsetCorrectPage re-export for import stability", () => {
    const alias = read("src/features/correction/DcOffsetCorrectPage.tsx");
    expect(alias).toContain("CorrectPage");
    expect(alias).toContain("DcOffsetCorrectPage");
  });

  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("or034CorrectDesk");
  });
});
