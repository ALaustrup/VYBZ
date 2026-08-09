import { describe, expect, it } from "vitest";
import {
  DEVICE_TRANSLATION_VERSION,
  applyDeviceTranslationPreview,
} from "./deviceTranslationPreview";

function tone(sr: number): Float32Array {
  const n = Math.floor(0.5 * sr);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = Math.sin((2 * Math.PI * 110 * i) / sr) * 0.3;
  return out;
}

describe("applyDeviceTranslationPreview", () => {
  it("is versioned, disclosed, and non-destructive", () => {
    const sr = 48000;
    const pcm = tone(sr);
    const clone = pcm.slice();
    const r = applyDeviceTranslationPreview([pcm], sr, "phone");
    expect(pcm).toEqual(clone);
    expect(r.correctionVersion).toBe(DEVICE_TRANSLATION_VERSION);
    expect(r.disclosure.toLowerCase()).toContain("not a measured");
    expect(r.channels[0]!.length).toBe(pcm.length);
  });
});
