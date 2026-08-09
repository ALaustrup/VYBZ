import { describe, expect, it } from "vitest";
import {
  batchLoudnessSpreadLu,
  isAnalyzerAudioReady,
  topAnalyzerIssue,
} from "@/features/prepare/analyzerReady";
import { shippedAutoFixCodes, shipAutoFixForCode } from "@/features/prepare/autoFixMap";

describe("analyzerReady", () => {
  it("ignores artwork blockers for Ready", () => {
    expect(
      isAnalyzerAudioReady([
        { code: "ARTWORK_MISSING", severity: "blocking", status: "open" },
        { code: "AUDIO_PEAK_HOT", severity: "warning", status: "open" },
      ]),
    ).toBe(true);
    expect(
      isAnalyzerAudioReady([
        { code: "AUDIO_PEAK_CLIP", severity: "blocking", status: "open" },
      ]),
    ).toBe(false);
  });

  it("surfaces the top blocking audio issue", () => {
    const top = topAnalyzerIssue([
      { code: "ARTWORK_TOO_SMALL", severity: "blocking", status: "open", title: "Art" },
      { code: "AUDIO_DC_OFFSET", severity: "blocking", status: "open", title: "DC" },
      { code: "AUDIO_PEAK_HOT", severity: "warning", status: "open", title: "Hot" },
    ]);
    expect(top?.code).toBe("AUDIO_DC_OFFSET");
  });

  it("measures loudness spread across a batch", () => {
    expect(batchLoudnessSpreadLu([-14, -11])).toBe(3);
    expect(batchLoudnessSpreadLu([-14])).toBeNull();
  });
});

describe("autoFixMap", () => {
  it("ships Fix only for Tier A codes", () => {
    expect(shipAutoFixForCode("AUDIO_DC_OFFSET")?.op).toBe("dc");
    expect(shipAutoFixForCode("AUDIO_LOUDNESS_QUIET")?.op).toBe("level");
    expect(shipAutoFixForCode("AUDIO_LOSSY_MASTER")).toBeNull();
    expect(shipAutoFixForCode("AUDIO_MAINS_HUM")?.op).toBe("hum");
    expect(shippedAutoFixCodes().length).toBeGreaterThan(5);
  });
});
