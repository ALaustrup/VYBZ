import { describe, expect, it } from "vitest";
import {
  STREAMING_NORM_PREVIEW_VERSION,
  applyStreamingNormPreview,
} from "./streamingNormPreview";

function quietTone(sr: number): Float32Array {
  const n = Math.floor(3 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.02;
  return out;
}

describe("applyStreamingNormPreview", { timeout: 45_000 }, () => {
  it("is versioned, disclosed, and non-destructive", () => {
    const sr = 48000;
    const pcm = quietTone(sr);
    const clone = pcm.slice();
    const r = applyStreamingNormPreview([pcm], sr);
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(STREAMING_NORM_PREVIEW_VERSION);
    expect(r.disclosure.toLowerCase()).toContain("not an exact emulation");
    expect(r.gainDb).toBeGreaterThan(0);
  });
});
