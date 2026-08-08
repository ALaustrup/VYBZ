import { describe, expect, it } from "vitest";
import {
  CREST_CRUSHED_THRESHOLD_DB,
  ISP_OVERSHOOT_WARN_DB,
  PLR_LOW_THRESHOLD_DB,
  measureCrestFactorDb,
  measureIspOvershootDb,
  measurePlrDb,
} from "./dynamics";

describe("measureCrestFactorDb", () => {
  it("is peak minus RMS in dB", () => {
    expect(measureCrestFactorDb(-6, -12)).toBeCloseTo(6, 5);
    expect(measureCrestFactorDb(-1, -14)).toBeCloseTo(13, 5);
  });

  it("flags crushed dynamics below the documented heuristic", () => {
    expect(measureCrestFactorDb(-0.5, -3)).toBeLessThan(CREST_CRUSHED_THRESHOLD_DB);
  });
});

describe("measurePlrDb", () => {
  it("is true peak minus integrated LUFS", () => {
    expect(measurePlrDb(-1, -14)).toBeCloseTo(13, 5);
    expect(measurePlrDb(-0.5, -8)).toBeCloseTo(7.5, 5);
  });

  it("flags low PLR below the documented heuristic", () => {
    expect(measurePlrDb(-1, -5)).toBeLessThan(PLR_LOW_THRESHOLD_DB);
  });
});

describe("measureIspOvershootDb", () => {
  it("is true peak minus sample peak", () => {
    expect(measureIspOvershootDb(-0.2, -1.5)).toBeCloseTo(1.3, 5);
  });

  it("flags overshoot above the documented heuristic", () => {
    expect(measureIspOvershootDb(-0.1, -2)).toBeGreaterThan(ISP_OVERSHOOT_WARN_DB);
  });
});
