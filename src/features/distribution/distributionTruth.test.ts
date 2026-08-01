import { describe, expect, it } from "vitest";
import { evaluateLoudness } from "@vybz/domain/releases";

describe("Distribution loudness truthfulness", () => {
  it("reports missing loudness as blocking when required", () => {
    const findings = evaluateLoudness(null, true);
    expect(findings.some((f) => f.code === "DIST_LOUDNESS_MISSING")).toBe(true);
  });

  it("does not invent LUFS findings when loudness is absent and not required", () => {
    const findings = evaluateLoudness(null, false);
    expect(findings.some((f) => f.code === "DIST_LOUDNESS_HOT")).toBe(false);
    expect(findings.some((f) => f.code === "DIST_LOUDNESS_UNKNOWN")).toBe(true);
  });
});
