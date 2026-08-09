import { describe, expect, it } from "vitest";
import { LOUDNESS_GAIN_VERSION, applyLoudnessGain } from "./loudnessGainCorrect";

function quietTone(sr: number): Float32Array {
  const n = Math.floor(3 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.02;
  return out;
}

describe("applyLoudnessGain", () => {
  it("is versioned and non-destructive", () => {
    const sr = 48000;
    const pcm = quietTone(sr);
    const clone = pcm.slice();
    const r = applyLoudnessGain([pcm], sr);
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(LOUDNESS_GAIN_VERSION);
    expect(r.gainDb).toBeGreaterThan(0);
  });

  it("moves integrated loudness toward target", () => {
    const sr = 48000;
    const pcm = quietTone(sr);
    const r = applyLoudnessGain([pcm], sr, { targetLufs: -14 });
    expect(r.integratedLufsBefore).toBeTypeOf("number");
    expect(r.integratedLufsAfter).toBeTypeOf("number");
    expect(r.integratedLufsAfter!).toBeGreaterThan(r.integratedLufsBefore!);
  });
});
