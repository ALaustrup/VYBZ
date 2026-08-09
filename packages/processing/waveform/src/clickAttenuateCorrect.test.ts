import { describe, expect, it } from "vitest";
import { measureClickPop } from "./clickPop";
import { CLICK_ATTENUATE_VERSION, applyClickAttenuate } from "./clickAttenuateCorrect";

function toneWithClick(sr: number): Float32Array {
  const n = Math.floor(1.2 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin(i / 40) * 0.15;
  const at = Math.floor(0.5 * sr);
  out[at] = 0.95;
  out[at + 1] = -0.9;
  return out;
}

describe("applyClickAttenuate", () => {
  it("is versioned and non-destructive", () => {
    const sr = 48000;
    const pcm = toneWithClick(sr);
    const clone = pcm.slice();
    const r = applyClickAttenuate([pcm], sr);
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(CLICK_ATTENUATE_VERSION);
    expect(r.eventsFixed).toBeGreaterThan(0);
  });

  it("reduces measured click count", () => {
    const sr = 48000;
    const pcm = toneWithClick(sr);
    const before = measureClickPop(pcm, sr)!;
    expect(before.count).toBeGreaterThanOrEqual(1);
    const r = applyClickAttenuate([pcm], sr);
    expect(r.countAfter!).toBeLessThan(before.count);
  });
});
