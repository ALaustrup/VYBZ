import { describe, expect, it } from "vitest";
import { SILENCE_TRIM_PAD_SEC, SILENCE_TRIM_VERSION, applySilenceTrim } from "./silenceTrim";

describe("applySilenceTrim", { timeout: 45_000 }, () => {
  it("trims long edges and keeps a pad", () => {
    const sr = 48000;
    const tone = Math.floor(0.2 * sr);
    const lead = Math.floor(1.0 * sr);
    const trail = Math.floor(1.5 * sr);
    const n = lead + tone + trail;
    const ch = new Float32Array(n);
    for (let i = 0; i < tone; i++) ch[lead + i] = Math.sin((2 * Math.PI * 440 * i) / sr) * 0.3;

    const clone = ch.slice();
    const a = applySilenceTrim([ch], sr);
    const b = applySilenceTrim([ch], sr);
    expect(ch).toEqual(clone);
    expect(a.correctionVersion).toBe(SILENCE_TRIM_VERSION);
    expect(a.trimmedLeadSec).toBeGreaterThan(0.9 - SILENCE_TRIM_PAD_SEC - 0.01);
    expect(a.trimmedTrailSec).toBeGreaterThan(1.4 - SILENCE_TRIM_PAD_SEC - 0.01);
    expect(a.durationAfterSec).toBeLessThan(a.durationBeforeSec);
    expect(a.channels[0]!.length).toBe(b.channels[0]!.length);
  });

  it("is near no-op when edges are already short", () => {
    const sr = 48000;
    const n = sr; // 1 s tone, no pad silence
    const ch = new Float32Array(n);
    for (let i = 0; i < n; i++) ch[i] = Math.sin((2 * Math.PI * 220 * i) / sr) * 0.25;
    const r = applySilenceTrim([ch], sr);
    expect(r.trimmedLeadSec).toBeLessThan(0.01);
    expect(r.trimmedTrailSec).toBeLessThan(0.01);
    expect(r.durationAfterSec).toBeCloseTo(r.durationBeforeSec, 2);
  });
});
