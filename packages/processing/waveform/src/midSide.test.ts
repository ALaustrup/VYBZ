import { describe, expect, it } from "vitest";
import { SIDE_HEAVY_WARN_DB, measureMidSide } from "./midSide";

describe("measureMidSide", () => {
  it("returns null for mono", () => {
    expect(measureMidSide([new Float32Array(64)])).toBeNull();
  });

  it("is strongly mid-dominant for identical channels", () => {
    const a = new Float32Array(128);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 9) * 0.5;
    const m = measureMidSide([a, a.slice()])!;
    expect(m.sideRmsDbfs).toBeLessThan(-60);
    expect(m.sideToMidDb).toBeLessThan(-40);
  });

  it("flags heavy side energy for hard-panned opposite polarity", () => {
    const l = new Float32Array(128);
    const r = new Float32Array(128);
    for (let i = 0; i < l.length; i++) {
      const s = Math.sin(i / 9) * 0.5;
      l[i] = s;
      r[i] = -s;
    }
    const m = measureMidSide([l, r])!;
    expect(m.sideToMidDb).toBeGreaterThan(SIDE_HEAVY_WARN_DB);
  });
});
