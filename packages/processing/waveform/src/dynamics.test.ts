import { describe, expect, it } from "vitest";
import { CREST_CRUSHED_THRESHOLD_DB, measureCrestFactorDb } from "./dynamics";

describe("measureCrestFactorDb", () => {
  it("is peak minus RMS in dB", () => {
    expect(measureCrestFactorDb(-6, -12)).toBeCloseTo(6, 5);
    expect(measureCrestFactorDb(-1, -14)).toBeCloseTo(13, 5);
  });

  it("flags crushed dynamics below the documented heuristic", () => {
    expect(measureCrestFactorDb(-0.5, -3)).toBeLessThan(CREST_CRUSHED_THRESHOLD_DB);
  });
});
