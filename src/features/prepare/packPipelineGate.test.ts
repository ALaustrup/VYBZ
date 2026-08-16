/**
 * Pack pipeline gate — the default UI is a staged flow over existing desks.
 */
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { GATE_REGISTRY } from "@/product/invariants";
import { PACK_STAGES } from "@/features/packPipeline/stages";

const ROOT = path.resolve(__dirname, "../../..");

function read(rel: string) {
  return readFileSync(path.join(ROOT, rel), "utf8");
}

describe("packPipeline", () => {
  it("is a registered gate", () => {
    expect(GATE_REGISTRY).toContain("packPipeline");
  });

  it("routes /make and /make/dashboard", () => {
    const app = read("src/App.tsx");
    expect(app).toContain('path="/make"');
    expect(app).toContain("PackUploadStage");
    expect(app).toContain('path="/make/dashboard"');
    expect(app).toContain("PackSalesStage");
  });

  it("keeps every stage desk in the tree", () => {
    expect(PACK_STAGES).toHaveLength(9);
    expect(existsSync(path.join(ROOT, "src/features/tools/MetadataEditorPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/features/tools/ArtCheckPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/features/packs/PackMakerPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/pages/StorefrontDashboardPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/pages/LibraryPage.tsx"))).toBe(true);
    expect(existsSync(path.join(ROOT, "src/components/ComposeSheet.tsx"))).toBe(true);
  });

  it("mounts the stepper on the shell without deleting the rail", () => {
    const shell = read("src/shell/SuiteShell.tsx");
    expect(shell).toContain("PackPipelineBar");
    expect(existsSync(path.join(ROOT, "src/shell/PrimaryRail.tsx"))).toBe(true);
  });
});
