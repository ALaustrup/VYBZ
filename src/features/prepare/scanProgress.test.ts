import { describe, expect, it } from "vitest";
import { SCAN_STAGE_LABELS, scanProgress } from "./scanProgress";

describe("scanProgress", () => {
  it("clamps percent and supplies stage labels", () => {
    expect(scanProgress("measuring", 150).percent).toBe(100);
    expect(scanProgress("decoding", -4).percent).toBe(0);
    expect(scanProgress("reading", 12).label).toBe(SCAN_STAGE_LABELS.reading);
    expect(scanProgress("saving", 90, "Persisting findings…").label).toBe("Persisting findings…");
  });

  it("covers every live analysis stage used by the scanning meter", () => {
    const stages = Object.keys(SCAN_STAGE_LABELS);
    expect(stages).toEqual(
      expect.arrayContaining([
        "reading",
        "container",
        "decoding",
        "measuring",
        "artwork",
        "saving",
        "done",
      ])
    );
  });
});
