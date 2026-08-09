import { describe, expect, it } from "vitest";
import { SPECTRAL_EQ_VERSION, applySpectralEqAssist } from "./spectralEqCorrect";

function bassHeavy(seconds: number, sr: number): Float32Array {
  const n = Math.floor(seconds * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    out[i] = Math.sin(2 * Math.PI * 80 * t) * 0.55 + Math.sin(2 * Math.PI * 1000 * t) * 0.08;
  }
  return out;
}

describe("applySpectralEqAssist", () => {
  it("is versioned and non-destructive", () => {
    const sr = 48000;
    const pcm = bassHeavy(1.2, sr);
    const clone = pcm.slice();
    const r = applySpectralEqAssist([pcm], sr, { mode: "cutBass" });
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(SPECTRAL_EQ_VERSION);
    expect(r.modeApplied).toBe("cutBass");
  });

  it("cutBass lowers low-band share", () => {
    const sr = 48000;
    const pcm = bassHeavy(1.5, sr);
    const r = applySpectralEqAssist([pcm], sr, { mode: "cutBass" });
    expect(r.balanceBefore).not.toBeNull();
    expect(r.balanceAfter).not.toBeNull();
    expect(r.balanceAfter!.lowShare).toBeLessThan(r.balanceBefore!.lowShare);
  });
});
