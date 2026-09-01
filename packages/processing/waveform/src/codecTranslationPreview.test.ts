import { describe, expect, it } from "vitest";
import {
  CODEC_TRANSLATION_VERSION,
  applyCodecTranslationPreview,
} from "./codecTranslationPreview";

function tone(sr: number): Float32Array {
  const n = Math.floor(0.5 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * 1000 * i) / sr) * 0.3;
  return out;
}

describe("applyCodecTranslationPreview", { timeout: 45_000 }, () => {
  it("is versioned, disclosed, and non-destructive", () => {
    const sr = 48000;
    const pcm = tone(sr);
    const clone = pcm.slice();
    const r = applyCodecTranslationPreview([pcm], sr, "lossy");
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(CODEC_TRANSLATION_VERSION);
    expect(r.disclosure.toLowerCase()).toContain("not a measured");
    expect(r.bandwidthHz).toBe(15000);
    expect(r.channels[0]!.length).toBe(pcm.length);
  });
});
