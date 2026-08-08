import { describe, expect, it } from "vitest";
import {
  PEAK_SAFETY_CEILING_LINEAR,
  PEAK_SAFETY_VERSION,
  applyPeakSafety,
} from "./peakSafety";

describe("applyPeakSafety", () => {
  it("leaves under-ceiling audio unchanged (gain 1)", () => {
    const ch = new Float32Array(2048);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.sin(i / 9) * 0.4;
    const r = applyPeakSafety([ch]);
    expect(r.correctionVersion).toBe(PEAK_SAFETY_VERSION);
    expect(r.gainLinear).toBe(1);
    expect(r.after.peakLinear).toBeLessThanOrEqual(PEAK_SAFETY_CEILING_LINEAR + 1e-6);
    expect(ch[0]).toBe(r.channels[0]![0]!); // same values when gain 1, but new array
  });

  it("scales hot peaks to the ceiling and is reproducible", () => {
    const ch = new Float32Array(4096);
    for (let i = 0; i < ch.length; i++) ch[i] = Math.sin(i / 5) * 0.99;
    const clone = ch.slice();
    const a = applyPeakSafety([ch]);
    const b = applyPeakSafety([ch]);
    expect(ch).toEqual(clone);
    expect(a.gainLinear).toBeLessThan(1);
    expect(a.after.peakLinear).toBeLessThanOrEqual(PEAK_SAFETY_CEILING_LINEAR + 1e-5);
    expect(a.gainLinear).toBe(b.gainLinear);
    expect(a.channels[0]).toEqual(b.channels[0]);
  });
});
