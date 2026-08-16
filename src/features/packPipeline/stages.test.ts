import { describe, expect, it } from "vitest";
import { PACK_STAGES, isPackPipelinePath, stageByPath } from "./stages";

describe("pack pipeline stages", () => {
  it("is nine stages numbered 0 through 8", () => {
    expect(PACK_STAGES.map((s) => s.id)).toEqual([0, 1, 2, 3, 4, 5, 6, 7, 8]);
  });

  it("maps each stage to a real path", () => {
    expect(stageByPath("/make")?.id).toBe(0);
    expect(stageByPath("/tools/metadata")?.id).toBe(1);
    expect(stageByPath("/tools/art-check")?.id).toBe(2);
    expect(stageByPath("/releases")?.id).toBe(3);
    expect(stageByPath("/tools/correct")?.id).toBe(4);
    expect(stageByPath("/tools/pack-maker")?.id).toBe(5);
    expect(stageByPath("/tools/packs/new")?.id).toBe(6);
    expect(stageByPath("/tools/packs")?.id).toBe(7);
    expect(stageByPath("/make/dashboard")?.id).toBe(8);
  });

  it("does not claim parked social routes are pipeline stages", () => {
    expect(isPackPipelinePath("/feed")).toBe(false);
    expect(isPackPipelinePath("/discover")).toBe(false);
  });
});
