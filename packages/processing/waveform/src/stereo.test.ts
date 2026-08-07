import { describe, expect, it } from "vitest";
import {
  STEREO_NARROW_THRESHOLD,
  STEREO_OUT_OF_PHASE_THRESHOLD,
  measureStereoCorrelation,
} from "./stereo";

describe("measureStereoCorrelation", () => {
  it("returns null for mono", () => {
    expect(measureStereoCorrelation([new Float32Array(64)])).toBeNull();
  });

  it("is ~1 for identical channels", () => {
    const a = new Float32Array(256);
    for (let i = 0; i < a.length; i++) a[i] = Math.sin(i / 8);
    const corr = measureStereoCorrelation([a, a.slice()]);
    expect(corr).toBeGreaterThan(STEREO_NARROW_THRESHOLD);
  });

  it("is ~-1 for polarity-inverted channels", () => {
    const a = new Float32Array(256);
    const b = new Float32Array(256);
    for (let i = 0; i < a.length; i++) {
      a[i] = Math.sin(i / 8);
      b[i] = -a[i]!;
    }
    const corr = measureStereoCorrelation([a, b]);
    expect(corr).toBeLessThan(STEREO_OUT_OF_PHASE_THRESHOLD);
  });
});
