import { describe, expect, it } from "vitest";
import {
  compareSideASignal,
  compareSideBSignal,
  VDOCK_COMPARE_PREVIEW_VERSION,
} from "@/lib/vdock/comparePreview";
import { LOUDNESS_MATCH_COMPARE_VERSION } from "@vybz/processing/waveform";

describe("VDock comparePreview", () => {
  it("versions the comparison contract", () => {
    expect(VDOCK_COMPARE_PREVIEW_VERSION).toMatch(/^m9\.compare-preview\./);
  });

  it("keeps unmatched A dry and tags matched A as disclosed simulation", () => {
    expect(compareSideASignal(false).kind).toBe("local");
    expect(compareSideASignal(false).disclosure).toBeNull();
    const matched = compareSideASignal(true);
    expect(matched.kind).toBe("simulation");
    expect(matched.disclosure).toContain(LOUDNESS_MATCH_COMPARE_VERSION);
    expect(matched.disclosure).toContain(VDOCK_COMPARE_PREVIEW_VERSION);
  });

  it("always discloses B as simulation", () => {
    const unmatched = compareSideBSignal("MasterReady mastered preview", false);
    expect(unmatched.kind).toBe("simulation");
    expect(unmatched.disclosure).toContain("unmatched");
    const matched = compareSideBSignal("MasterReady mastered preview", true);
    expect(matched.disclosure).toContain("loudness-matched");
    expect(matched.disclosure).toContain(VDOCK_COMPARE_PREVIEW_VERSION);
  });
});
