import { describe, expect, it } from "vitest";
import { CORRECTION_VERSION, removeDcOffset } from "./dcRemove";
import { measureDcOffset } from "./monoCompat";

describe("removeDcOffset", () => {
  it("removes a constant bias and is reproducible", () => {
    const n = 4096;
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = Math.sin((2 * Math.PI * 440 * i) / 48000) * 0.2 + 0.05;
    const a = removeDcOffset([ch]);
    const b = removeDcOffset([ch]);
    expect(a.correctionVersion).toBe(CORRECTION_VERSION);
    expect(a.removedMean).toBeCloseTo(b.removedMean, 10);
    expect(a.after.dc!.mean).toBeCloseTo(0, 4);
    expect(Math.abs(a.before.dc!.mean)).toBeGreaterThan(0.04);
    expect(a.channels[0]).toEqual(b.channels[0]);
  });

  it("leaves near-zero DC mostly unchanged", () => {
    const n = 48000; // integer cycles at 220 Hz → near-zero mean
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = Math.sin((2 * Math.PI * 220 * i) / 48000) * 0.3;
    const r = removeDcOffset([ch]);
    expect(Math.abs(r.removedMean)).toBeLessThan(0.002);
    expect(measureDcOffset(r.channels)!.mean).toBeCloseTo(0, 4);
  });
});
