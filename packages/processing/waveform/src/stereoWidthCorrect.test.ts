import { describe, expect, it } from "vitest";
import { measureStereoCorrelation } from "./stereo";
import { STEREO_WIDTH_VERSION, applyStereoWidth } from "./stereoWidthCorrect";

function stereoPair(n: number, corr: "narrow" | "wide"): Float32Array[] {
  const L = new Float32Array(n);
  const R = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const tone = Math.sin(i / 17) * 0.4;
    if (corr === "narrow") {
      L[i] = tone;
      R[i] = tone * 0.98 + Math.sin(i / 91) * 0.01;
    } else {
      L[i] = tone;
      R[i] = -tone * 0.85 + Math.sin(i / 11) * 0.15;
    }
  }
  return [L, R];
}

describe("applyStereoWidth", () => {
  it("is versioned and non-destructive", () => {
    const [L, R] = stereoPair(8192, "narrow");
    const clone = L.slice();
    const r = applyStereoWidth([L, R], { mode: "widen" });
    expect(L).toEqual(clone);
    expect(r.correctionVersion).toBe(STEREO_WIDTH_VERSION);
    expect(r.modeApplied).toBe("widen");
  });

  it("widen reduces near-mono correlation", () => {
    const ch = stereoPair(16384, "narrow");
    const before = measureStereoCorrelation(ch)!;
    expect(before).toBeGreaterThan(0.9);
    const r = applyStereoWidth(ch, { mode: "widen" });
    expect(r.correlationAfter!).toBeLessThan(before);
  });

  it("narrow improves out-of-phase correlation", () => {
    const ch = stereoPair(16384, "wide");
    const before = measureStereoCorrelation(ch)!;
    expect(before).toBeLessThan(0);
    const r = applyStereoWidth(ch, { mode: "narrow" });
    expect(r.correlationAfter!).toBeGreaterThan(before);
  });
});
