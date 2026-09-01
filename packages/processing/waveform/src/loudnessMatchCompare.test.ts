import { describe, expect, it } from "vitest";
import {
  LOUDNESS_MATCH_COMPARE_VERSION,
  matchLoudnessForCompare,
} from "./loudnessMatchCompare";

function tone(sr: number, amp: number): Float32Array {
  const n = Math.floor(3 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * amp;
  return out;
}

describe("matchLoudnessForCompare", { timeout: 45_000 }, () => {
  it("is versioned and non-destructive to inputs", () => {
    const sr = 48000;
    const quiet = tone(sr, 0.02);
    const loud = tone(sr, 0.2);
    const qClone = quiet.slice();
    const lClone = loud.slice();
    const r = matchLoudnessForCompare([quiet], [loud], sr);
    expect(quiet).toEqual(qClone);
    expect(loud).toEqual(lClone);
    expect(r.correctionVersion).toBe(LOUDNESS_MATCH_COMPARE_VERSION);
  });

  it("pulls louder side down toward quieter integrated LUFS", () => {
    const sr = 48000;
    const quiet = tone(sr, 0.02);
    const loud = tone(sr, 0.25);
    const r = matchLoudnessForCompare([quiet], [loud], sr);
    expect(r.bGainDb).toBeLessThan(0);
    expect(r.aGainDb).toBeGreaterThanOrEqual(-0.5);
    expect(r.targetLufs).toBeLessThanOrEqual(r.aLufsBefore + 0.05);
  });
});
