import { describe, expect, it } from "vitest";
import {
  distributionVerdict,
  evaluateDistribution,
  evaluateIsrc,
  evaluateLoudness,
  isValidIsrc,
  normalizeIsrc,
} from "./distributionRules";

/** Golden fixtures for distribution report rules. */
const GOLDEN = {
  validIsrc: "USRC17607839",
  dashedIsrc: "US-RC1-76-07839",
  badIsrc: "NOT-AN-ISRC",
  streamingLufs: -14.0,
  hotLufs: -6.5,
  quietLufs: -22.0,
} as const;

describe("distribution ISRC", () => {
  it("normalizes and validates golden ISRCs", () => {
    expect(normalizeIsrc(GOLDEN.dashedIsrc)).toBe("USRC17607839");
    expect(isValidIsrc(GOLDEN.validIsrc)).toBe(true);
    expect(isValidIsrc(GOLDEN.dashedIsrc)).toBe(true);
    expect(isValidIsrc(GOLDEN.badIsrc)).toBe(false);
    expect(evaluateIsrc(null)[0]!.code).toBe("DIST_ISRC_MISSING");
    expect(evaluateIsrc(GOLDEN.badIsrc)[0]!.code).toBe("DIST_ISRC_INVALID");
  });
});

describe("distribution loudness", () => {
  it("accepts streaming target without blocking", () => {
    const findings = evaluateLoudness({ integratedLufs: GOLDEN.streamingLufs, truePeakDb: -1.2 }, true);
    expect(findings.every((f) => f.severity !== "blocking")).toBe(true);
  });

  it("blocks hot masters (golden)", () => {
    const findings = evaluateLoudness({ integratedLufs: GOLDEN.hotLufs }, true);
    expect(findings.some((f) => f.code === "DIST_LOUDNESS_HOT")).toBe(true);
    expect(distributionVerdict(findings)).toBe("fail");
  });

  it("warns quiet masters (golden)", () => {
    const findings = evaluateLoudness({ integratedLufs: GOLDEN.quietLufs }, false);
    expect(findings.some((f) => f.code === "DIST_LOUDNESS_QUIET")).toBe(true);
  });

  it("blocks missing loudness when required (remote job)", () => {
    expect(evaluateLoudness(null, true)[0]!.code).toBe("DIST_LOUDNESS_MISSING");
  });
});

describe("evaluateDistribution report", () => {
  it("passes a complete package", () => {
    const findings = evaluateDistribution({
      title: "Golden Track",
      artistName: "Fixture",
      isrc: GOLDEN.validIsrc,
      hasAudio: true,
      hasArtwork: true,
      loudness: { integratedLufs: GOLDEN.streamingLufs, truePeakDb: -1.5 },
      artwork: { fileName: "cover.png", mimeType: "image/png", sizeBytes: 1000, width: 3000, height: 3000, dpi: 300 },
      requireLoudness: true,
    });
    expect(distributionVerdict(findings)).toBe("pass");
  });

  it("fails without audio and invalid ISRC", () => {
    const findings = evaluateDistribution({
      title: "X",
      isrc: GOLDEN.badIsrc,
      hasAudio: false,
      hasArtwork: false,
      requireLoudness: true,
    });
    expect(distributionVerdict(findings)).toBe("fail");
    expect(findings.some((f) => f.code === "DIST_AUDIO_MISSING")).toBe(true);
  });
});
